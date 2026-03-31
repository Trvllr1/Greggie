package handlers

import (
	"fmt"
	"greggie/backend/internal/middleware"
	"greggie/backend/internal/models"
	"greggie/backend/internal/store"
	"os"

	"github.com/gofiber/fiber/v2"
)

type CreatorHandler struct {
	Store *store.Store
}

// ── Channels ──

func (h *CreatorHandler) GetMyChannels(c *fiber.Ctx) error {
	uid := middleware.GetUserID(c)
	channels, err := h.Store.GetCreatorChannels(uid)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load channels"})
	}
	for i := range channels {
		prods, _ := h.Store.GetProductsByChannel(channels[i].ID)
		channels[i].Products = prods
	}
	if channels == nil {
		channels = []models.Channel{}
	}
	return c.JSON(channels)
}

func (h *CreatorHandler) CreateChannel(c *fiber.Ctx) error {
	uid := middleware.GetUserID(c)
	var req models.CreateChannelRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	if req.Title == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "title is required"})
	}

	ch := &models.Channel{
		CreatorID:   uid,
		Title:       req.Title,
		Description: req.Description,
		Category:    req.Category,
		SaleType:    req.SaleType,
	}
	if err := h.Store.CreateChannel(ch); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create channel"})
	}
	return c.Status(fiber.StatusCreated).JSON(ch)
}

func (h *CreatorHandler) UpdateChannel(c *fiber.Ctx) error {
	uid := middleware.GetUserID(c)
	channelID := c.Params("id")

	ch, err := h.Store.GetChannelByID(channelID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "channel not found"})
	}
	if ch.CreatorID != uid {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not your channel"})
	}

	var req models.UpdateChannelRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	if err := h.Store.UpdateChannel(channelID, &req); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update channel"})
	}
	updated, _ := h.Store.GetChannelByID(channelID)
	return c.JSON(updated)
}

func (h *CreatorHandler) DeleteChannel(c *fiber.Ctx) error {
	uid := middleware.GetUserID(c)
	channelID := c.Params("id")

	ch, err := h.Store.GetChannelByID(channelID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "channel not found"})
	}
	if ch.CreatorID != uid {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not your channel"})
	}
	if err := h.Store.DeleteChannel(channelID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete channel"})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *CreatorHandler) GoLive(c *fiber.Ctx) error {
	uid := middleware.GetUserID(c)
	channelID := c.Params("id")

	ch, err := h.Store.GetChannelByID(channelID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "channel not found"})
	}
	if ch.CreatorID != uid {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not your channel"})
	}

	// Build HLS URL from stream key
	hlsHost := os.Getenv("HLS_PUBLIC_URL")
	if hlsHost == "" {
		hlsHost = "http://localhost:8888"
	}
	hlsURL := fmt.Sprintf("%s/%s/index.m3u8", hlsHost, ch.StreamKey)

	// Set the stream_url to the HLS endpoint
	if err := h.Store.SetChannelStreamURL(channelID, hlsURL); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to set stream url"})
	}
	if err := h.Store.UpdateChannelStatus(channelID, "LIVE"); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to go live"})
	}

	return c.JSON(fiber.Map{
		"status":     "LIVE",
		"rtmp_url":   "rtmp://localhost:1935",
		"stream_key": ch.StreamKey,
		"hls_url":    hlsURL,
	})
}

func (h *CreatorHandler) EndStream(c *fiber.Ctx) error {
	uid := middleware.GetUserID(c)
	channelID := c.Params("id")

	ch, err := h.Store.GetChannelByID(channelID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "channel not found"})
	}
	if ch.CreatorID != uid {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not your channel"})
	}
	// Clear the live stream URL back to thumbnail
	_ = h.Store.SetChannelStreamURL(channelID, ch.ThumbnailURL)
	if err := h.Store.UpdateChannelStatus(channelID, "OFFLINE"); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to end stream"})
	}
	return c.JSON(fiber.Map{"status": "OFFLINE"})
}

// ── Products ──

func (h *CreatorHandler) CreateProduct(c *fiber.Ctx) error {
	uid := middleware.GetUserID(c)
	channelID := c.Params("id")

	ch, err := h.Store.GetChannelByID(channelID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "channel not found"})
	}
	if ch.CreatorID != uid {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not your channel"})
	}

	var req models.CreateProductRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	if req.Name == "" || req.PriceCents <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "name and price are required"})
	}

	p := &models.Product{
		ChannelID:   channelID,
		Name:        req.Name,
		Description: req.Description,
		ImageURL:    req.ImageURL,
		PriceCents:  req.PriceCents,
		Inventory:   req.Inventory,
		SaleType:    req.SaleType,
	}
	if req.OriginalPrice != nil {
		p.OriginalPrice = req.OriginalPrice
	}
	if err := h.Store.CreateProduct(p); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create product"})
	}
	return c.Status(fiber.StatusCreated).JSON(p)
}

func (h *CreatorHandler) UpdateProduct(c *fiber.Ctx) error {
	uid := middleware.GetUserID(c)
	channelID := c.Params("id")
	productID := c.Params("productId")

	ch, err := h.Store.GetChannelByID(channelID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "channel not found"})
	}
	if ch.CreatorID != uid {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not your channel"})
	}

	var req models.UpdateProductRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	if err := h.Store.UpdateProduct(productID, &req); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update product"})
	}
	updated, _ := h.Store.GetProductByID(productID)
	return c.JSON(updated)
}

func (h *CreatorHandler) DeleteProduct(c *fiber.Ctx) error {
	uid := middleware.GetUserID(c)
	channelID := c.Params("id")
	productID := c.Params("productId")

	ch, err := h.Store.GetChannelByID(channelID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "channel not found"})
	}
	if ch.CreatorID != uid {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not your channel"})
	}
	if err := h.Store.DeleteProduct(productID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete product"})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *CreatorHandler) PinProduct(c *fiber.Ctx) error {
	uid := middleware.GetUserID(c)
	channelID := c.Params("id")

	ch, err := h.Store.GetChannelByID(channelID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "channel not found"})
	}
	if ch.CreatorID != uid {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not your channel"})
	}

	var body struct {
		ProductID string `json:"product_id"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	if err := h.Store.PinProduct(channelID, body.ProductID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to pin product"})
	}
	return c.JSON(fiber.Map{"pinned": body.ProductID})
}

// ── Analytics ──

func (h *CreatorHandler) GetAnalytics(c *fiber.Ctx) error {
	uid := middleware.GetUserID(c)
	channelID := c.Params("id")

	ch, err := h.Store.GetChannelByID(channelID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "channel not found"})
	}
	if ch.CreatorID != uid {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not your channel"})
	}

	analytics, err := h.Store.GetChannelAnalytics(channelID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load analytics"})
	}
	return c.JSON(analytics)
}
