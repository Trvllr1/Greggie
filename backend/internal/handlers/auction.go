package handlers

import (
	"encoding/json"
	"time"

	"greggie/backend/internal/middleware"
	"greggie/backend/internal/models"
	"greggie/backend/internal/store"
	"greggie/backend/internal/ws"

	"github.com/gofiber/fiber/v2"
)

type AuctionHandler struct {
	Store *store.Store
	Hub   *ws.Hub
}

// PlaceBid validates and places a bid, then broadcasts the update via WebSocket.
func (h *AuctionHandler) PlaceBid(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	var req models.BidRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if req.ProductID == "" || req.AmountCents <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "product_id and amount_cents required"})
	}

	bid, product, err := h.Store.PlaceBidAtomic(req.ProductID, userID, req.AmountCents)
	if err != nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error()})
	}

	// Broadcast bid update to the channel
	if product != nil && h.Hub != nil {
		payload, _ := json.Marshal(fiber.Map{
			"product_id":       product.ID,
			"current_bid":      product.CurrentBidCents,
			"highest_bidder":   product.HighestBidderID,
			"bid_count":        product.BidCount,
			"auction_end_at":   product.AuctionEndAt,
			"bidder_id":        userID,
			"bid_amount_cents": bid.AmountCents,
		})
		h.Hub.BroadcastJSON(product.ChannelID, ws.Message{
			Event:     ws.EventBidUpdate,
			ChannelID: product.ChannelID,
			Payload:   payload,
		})
	}

	return c.JSON(fiber.Map{
		"bid":     bid,
		"product": product,
	})
}

// GetBidHistory returns the bid history for a product.
func (h *AuctionHandler) GetBidHistory(c *fiber.Ctx) error {
	productID := c.Params("productId")
	if productID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "product_id required"})
	}
	bids, err := h.Store.GetBidHistory(productID, 50)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to get bid history"})
	}
	if bids == nil {
		bids = []models.Bid{}
	}
	return c.JSON(bids)
}

// StartAuction starts an auction for a product (creator only).
func (h *AuctionHandler) StartAuction(c *fiber.Ctx) error {
	var req models.StartAuctionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if req.ProductID == "" || req.DurationSecs <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "product_id and duration_secs required"})
	}

	product, err := h.Store.GetProductByID(req.ProductID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "product not found"})
	}
	if product.SaleType != "auction" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "product is not an auction item"})
	}

	endAt := time.Now().Add(time.Duration(req.DurationSecs) * time.Second)
	if err := h.Store.StartAuction(req.ProductID, endAt); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to start auction"})
	}

	// Refresh product and return
	product, _ = h.Store.GetProductByID(req.ProductID)

	// Broadcast auction start to channel
	if h.Hub != nil {
		payload, _ := json.Marshal(fiber.Map{
			"product_id":     product.ID,
			"auction_status": product.AuctionStatus,
			"auction_end_at": product.AuctionEndAt,
		})
		h.Hub.BroadcastJSON(product.ChannelID, ws.Message{
			Event:     ws.EventBidUpdate,
			ChannelID: product.ChannelID,
			Payload:   payload,
		})
	}

	return c.JSON(product)
}
