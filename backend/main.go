package main

import (
	"encoding/json"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"greggie/backend/internal/auction"
	"greggie/backend/internal/handlers"
	"greggie/backend/internal/middleware"
	"greggie/backend/internal/payments"
	"greggie/backend/internal/store"
	"greggie/backend/internal/ws"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	fiberCors "github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	fiberLogger "github.com/gofiber/fiber/v2/middleware/logger"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	db, err := store.New()
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer db.Close()

	// ── Stripe payments ──
	payments.Init()

	// ── WebSocket hub ──
	hub := ws.NewHub()
	hub.OnJoin = func(channelID, userID string) {
		count, _ := db.IncrViewers(channelID)
		payload, _ := json.Marshal(map[string]interface{}{"channel_id": channelID, "count": count})
		hub.BroadcastJSON(channelID, ws.Message{
			Event:     ws.EventViewerCount,
			ChannelID: channelID,
			Payload:   payload,
		})
	}
	hub.OnLeave = func(channelID, userID string) {
		count, _ := db.DecrViewers(channelID)
		if count < 0 {
			count = 0
		}
		payload, _ := json.Marshal(map[string]interface{}{"channel_id": channelID, "count": count})
		hub.BroadcastJSON(channelID, ws.Message{
			Event:     ws.EventViewerCount,
			ChannelID: channelID,
			Payload:   payload,
		})
	}
	go hub.Run()

	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{"error": err.Error()})
		},
	})
	app.Use(fiberLogger.New())

	// ── CORS: env-controlled origins ──
	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
	if allowedOrigins == "" {
		allowedOrigins = "http://localhost:3000,http://localhost:5173"
	}
	app.Use(fiberCors.New(fiberCors.Config{
		AllowOrigins: allowedOrigins,
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
	}))

	// ── Global rate limiter: 100 req/min per IP ──
	app.Use(limiter.New(limiter.Config{
		Max:        100,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "rate limit exceeded — try again later",
			})
		},
	}))

	// ── Handlers ──
	auth := &handlers.AuthHandler{Store: db}
	channels := &handlers.ChannelHandler{Store: db}
	products := &handlers.ProductHandler{Store: db}
	users := &handlers.UserHandler{Store: db}
	checkout := &handlers.CheckoutHandler{Store: db}
	events := &handlers.EventHandler{Store: db}
	relay := &handlers.RelayHandler{Store: db}
	creator := &handlers.CreatorHandler{Store: db}
	connect := &handlers.ConnectHandler{Store: db}
	webhooks := &handlers.WebhookHandler{Store: db}
	auctionH := &handlers.AuctionHandler{Store: db, Hub: hub}
	shop := &handlers.ShopHandler{Store: db}
	marketplace := &handlers.MarketplaceHandler{Store: db}
	cart := &handlers.CartHandler{Store: db}

	// ── Auction engine (auto-ends expired auctions) ──
	auctionEngine := auction.NewEngine(db, hub)
	auctionEngine.Start()

	api := app.Group("/api/v1")

	// Health
	api.Get("/health", func(c *fiber.Ctx) error {
		status := fiber.Map{
			"status":     "ok",
			"service":    "greggie",
			"ws_clients": hub.ClientCount(),
		}
		if err := db.Ping(); err != nil {
			status["status"] = "degraded"
			status["db"] = err.Error()
		}
		return c.JSON(status)
	})

	// Auth (public) — stricter rate limit: 10 req/min
	authLimiter := limiter.New(limiter.Config{
		Max:        10,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP() + ":auth"
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "too many auth attempts — try again later",
			})
		},
	})
	api.Post("/auth/register", authLimiter, auth.Register)
	api.Post("/auth/login", authLimiter, auth.Login)
	api.Post("/auth/dev", authLimiter, auth.DevLogin)

	// Channels (public)
	api.Get("/channels/primary", channels.GetPrimary)
	api.Get("/channels/rail", channels.GetRail)
	api.Get("/channels/:id", channels.GetByID)

	// Products (public)
	api.Get("/products/:id/full", products.GetFullByID)
	api.Get("/products/:id/reviews", products.GetReviews)
	api.Get("/products/:id", products.GetByID)
	api.Get("/channels/:channelId/products", products.GetByChannel)

	// Viewer count (public, from Redis)
	api.Get("/channels/:id/viewers", func(c *fiber.Ctx) error {
		count, _ := db.GetViewers(c.Params("id"))
		return c.JSON(fiber.Map{"channel_id": c.Params("id"), "count": count})
	})

	// Relay (public — viewers can search replay transcripts)
	api.Post("/relay/query", relay.Query)
	api.Get("/relay/:channelId/entries", relay.GetEntries)

	// Stripe webhooks (public — signature verified internally)
	api.Post("/webhooks/stripe", webhooks.HandleStripeWebhook)

	// Marketplace (public)
	api.Get("/marketplace/products", marketplace.SearchProducts)
	api.Get("/marketplace/trending", marketplace.GetTrending)
	api.Get("/marketplace/gateway", marketplace.Gateway)

	// Shops (public)
	api.Get("/shops/:slug", shop.GetShopBySlug)

	// ── Guest-or-Authenticated routes (optional auth) ──
	optAuth := api.Group("", middleware.OptionalAuth())
	optAuth.Post("/checkout/marketplace", checkout.MarketplaceCheckout)
	optAuth.Post("/checkout/estimate", checkout.EstimateTax)
	optAuth.Post("/checkout/validate-coupon", checkout.ValidateCoupon)

	// ── WebSocket ──
	// Upgrade check — parse JWT from query param ?token=<jwt>
	app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			token := c.Query("token")
			if token != "" {
				userID, _, err := middleware.ParseToken(token)
				if err == nil {
					c.Locals("user_id", userID)
				}
			}
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})
	app.Get("/ws", websocket.New(ws.HandleWebSocket(hub)))

	// ── Protected routes ──
	protected := api.Group("", middleware.RequireAuth())

	// User
	protected.Get("/users/me", auth.Me)
	protected.Post("/users/follow/:channelId", users.Follow)
	protected.Delete("/users/follow/:channelId", users.Unfollow)
	protected.Get("/users/following", users.GetFollowing)

	// Checkout
	protected.Post("/checkout", checkout.InitCheckout)
	protected.Get("/shipping-addresses", checkout.GetShippingAddresses)
	protected.Post("/bids", auctionH.PlaceBid)

	// Auction
	protected.Post("/auction/start", auctionH.StartAuction)

	// Bid history (public)
	api.Get("/products/:productId/bids", auctionH.GetBidHistory)

	// Events
	protected.Post("/events", events.TrackEvent)

	// Product reviews (auth required)
	protected.Post("/products/:id/reviews", products.SubmitReview)
	protected.Post("/reviews/:reviewId/helpful", products.MarkReviewHelpful)

	// Stripe Connect onboarding
	protected.Post("/connect/onboard", connect.StartOnboarding)
	protected.Get("/connect/status", connect.GetStatus)

	// Shop management (auth required)
	protected.Post("/shops", shop.CreateShop)
	protected.Get("/shop", shop.GetMyShop)
	protected.Put("/shop", shop.UpdateMyShop)
	protected.Get("/shop/products", shop.ListMyProducts)
	protected.Post("/shop/products", shop.CreateProduct)
	protected.Put("/shop/products/:id", shop.UpdateProduct)
	protected.Delete("/shop/products/:id", shop.ArchiveProduct)

	// Cart (auth required)
	protected.Get("/cart", cart.GetCart)
	protected.Post("/cart/items", cart.AddItem)
	protected.Put("/cart/items/:id", cart.UpdateItem)
	protected.Delete("/cart/items/:id", cart.RemoveItem)

	// Creator studio (auth required)
	protected.Get("/creator/channels", creator.GetMyChannels)
	protected.Post("/creator/channels", creator.CreateChannel)
	protected.Put("/creator/channels/:id", creator.UpdateChannel)
	protected.Delete("/creator/channels/:id", creator.DeleteChannel)
	protected.Post("/creator/channels/:id/live", creator.GoLive)
	protected.Post("/creator/channels/:id/end", creator.EndStream)
	protected.Post("/creator/channels/:id/products", creator.CreateProduct)
	protected.Put("/creator/channels/:id/products/:productId", creator.UpdateProduct)
	protected.Delete("/creator/channels/:id/products/:productId", creator.DeleteProduct)
	protected.Post("/creator/channels/:id/pin", creator.PinProduct)
	protected.Get("/creator/channels/:id/analytics", creator.GetAnalytics)

	// ── Graceful shutdown ──
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		if err := app.Listen(":" + port); err != nil {
			log.Printf("server error: %v", err)
		}
	}()
	log.Printf("Greggie™ backend started on :%s", port)

	<-quit
	log.Println("Shutting down gracefully...")

	if err := app.ShutdownWithTimeout(10 * time.Second); err != nil {
		log.Printf("shutdown error: %v", err)
	}

	auctionEngine.Stop()
	hub.Shutdown()
	db.Close()
	log.Println("Server stopped")

	// Suppress unused import warnings
	_ = strings.Join
}
