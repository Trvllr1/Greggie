package main

import (
	"log"
	"os"
	"strconv"

	"greggie/backend/internal/database"
	"greggie/backend/internal/scraper"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/google/uuid"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	db, err := database.New()
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer db.Close()

	app := fiber.New()
	app.Use(logger.New())
	app.Use(cors.New())

	api := app.Group("/api/v1")

	// GET /api/v1/health — liveness/readiness check
	api.Get("/health", func(c *fiber.Ctx) error {
		status := fiber.Map{"status": "ok"}
		if err := db.Ping(); err != nil {
			status["status"] = "degraded"
			status["db"] = err.Error()
		}
		return c.JSON(status)
	})

	// POST /api/v1/ingest — accept a raw URL, unfurl OG metadata, store feed item
	api.Post("/ingest", func(c *fiber.Ctx) error {
		var body struct {
			URL string `json:"url"`
		}
		if err := c.BodyParser(&body); err != nil || body.URL == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "url is required"})
		}

		item, err := scraper.Unfurl(body.URL)
		if err != nil {
			return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": err.Error()})
		}

		if err := db.SaveFeedItem(item); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to save item"})
		}

		return c.Status(fiber.StatusCreated).JSON(item)
	})

	// GET /api/v1/feed — return the cached feed with cursor pagination
	api.Get("/feed", func(c *fiber.Ctx) error {
		userID := c.Query("user_id")
		cursor := c.Query("cursor")
		limit, _ := strconv.Atoi(c.Query("limit", "20"))

		items, err := db.GetFeed(userID, cursor, limit)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load feed"})
		}

		// Include next_cursor if there are results
		var nextCursor string
		if len(items) > 0 {
			nextCursor = items[len(items)-1].CollectedAt
		}

		return c.JSON(fiber.Map{
			"items":       items,
			"next_cursor": nextCursor,
		})
	})

	// DELETE /api/v1/feed/:id — remove a feed item
	api.Delete("/feed/:id", func(c *fiber.Ctx) error {
		id := c.Params("id")
		if err := db.DeleteFeedItem(id); err != nil {
			if err.Error() == "not found" {
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "item not found"})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete"})
		}
		return c.SendStatus(fiber.StatusNoContent)
	})

	// ── Collections endpoints ──

	// POST /api/v1/collections — create a collection
	api.Post("/collections", func(c *fiber.Ctx) error {
		var body struct {
			Name  string `json:"name"`
			Emoji string `json:"emoji"`
		}
		if err := c.BodyParser(&body); err != nil || body.Name == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "name is required"})
		}
		col, err := db.CreateCollection(uuid.New().String(), "", body.Name, body.Emoji)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create collection"})
		}
		return c.Status(fiber.StatusCreated).JSON(col)
	})

	// GET /api/v1/collections — list all collections
	api.Get("/collections", func(c *fiber.Ctx) error {
		userID := c.Query("user_id")
		collections, err := db.GetCollections(userID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load collections"})
		}
		if collections == nil {
			collections = []database.Collection{}
		}
		return c.JSON(collections)
	})

	// GET /api/v1/collections/:id — get a collection with its items
	api.Get("/collections/:id", func(c *fiber.Ctx) error {
		id := c.Params("id")
		col, items, err := db.GetCollectionWithItems(id)
		if err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "collection not found"})
		}
		if items == nil {
			items = []scraper.FeedItem{}
		}
		return c.JSON(fiber.Map{"collection": col, "items": items})
	})

	// PUT /api/v1/collections/:id — update a collection
	api.Put("/collections/:id", func(c *fiber.Ctx) error {
		id := c.Params("id")
		var body struct {
			Name  string `json:"name"`
			Emoji string `json:"emoji"`
		}
		if err := c.BodyParser(&body); err != nil || body.Name == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "name is required"})
		}
		if err := db.UpdateCollection(id, body.Name, body.Emoji); err != nil {
			if err.Error() == "not found" {
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "collection not found"})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update"})
		}
		return c.JSON(fiber.Map{"ok": true})
	})

	// DELETE /api/v1/collections/:id — delete a collection
	api.Delete("/collections/:id", func(c *fiber.Ctx) error {
		id := c.Params("id")
		if err := db.DeleteCollection(id); err != nil {
			if err.Error() == "not found" {
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "collection not found"})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete"})
		}
		return c.SendStatus(fiber.StatusNoContent)
	})

	// POST /api/v1/collections/:id/items — add item to collection
	api.Post("/collections/:id/items", func(c *fiber.Ctx) error {
		collectionID := c.Params("id")
		var body struct {
			FeedItemID string `json:"feed_item_id"`
		}
		if err := c.BodyParser(&body); err != nil || body.FeedItemID == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "feed_item_id is required"})
		}
		if err := db.AddItemToCollection(collectionID, body.FeedItemID); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to add item"})
		}
		return c.Status(fiber.StatusCreated).JSON(fiber.Map{"ok": true})
	})

	// DELETE /api/v1/collections/:id/items/:itemId — remove item from collection
	api.Delete("/collections/:id/items/:itemId", func(c *fiber.Ctx) error {
		collectionID := c.Params("id")
		feedItemID := c.Params("itemId")
		if err := db.RemoveItemFromCollection(collectionID, feedItemID); err != nil {
			if err.Error() == "not found" {
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "item not in collection"})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to remove"})
		}
		return c.SendStatus(fiber.StatusNoContent)
	})

	// ── Share Stack endpoints ──

	// POST /api/v1/stack — unfurl URL and store in share stack
	api.Post("/stack", func(c *fiber.Ctx) error {
		var body struct {
			URL string `json:"url"`
		}
		if err := c.BodyParser(&body); err != nil || body.URL == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "url is required"})
		}
		item, err := scraper.Unfurl(body.URL)
		if err != nil {
			return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": err.Error()})
		}
		stackItem := &database.StackItem{
			ID:        uuid.New().String(),
			URL:       body.URL,
			Source:    item.Source,
			Content:   item.Content,
			Status:    "pending",
			CreatedAt: item.CollectedAt,
		}
		if err := db.SaveStackItem(stackItem); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to save to stack"})
		}
		return c.Status(fiber.StatusCreated).JSON(stackItem)
	})

	// GET /api/v1/stack — get all pending stack items
	api.Get("/stack", func(c *fiber.Ctx) error {
		userID := c.Query("user_id")
		items, err := db.GetStack(userID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load stack"})
		}
		if items == nil {
			items = []database.StackItem{}
		}
		return c.JSON(items)
	})

	// GET /api/v1/stack/count — pending item count for badge
	api.Get("/stack/count", func(c *fiber.Ctx) error {
		userID := c.Query("user_id")
		count, err := db.GetStackCount(userID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to count"})
		}
		return c.JSON(fiber.Map{"count": count})
	})

	// POST /api/v1/stack/:id/accept — move stack item to feed
	api.Post("/stack/:id/accept", func(c *fiber.Ctx) error {
		stackID := c.Params("id")
		var body struct {
			CollectionID string `json:"collection_id"`
		}
		c.BodyParser(&body) // optional body
		feedItem, err := db.AcceptStackItem(stackID, body.CollectionID)
		if err != nil {
			return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(feedItem)
	})

	// POST /api/v1/stack/:id/dismiss — dismiss a stack item
	api.Post("/stack/:id/dismiss", func(c *fiber.Ctx) error {
		stackID := c.Params("id")
		if err := db.DismissStackItem(stackID); err != nil {
			return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{"ok": true})
	})

	log.Printf("Greggie backend listening on :%s", port)
	log.Fatal(app.Listen(":" + port))
}
