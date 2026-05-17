package handlers

import (
	"strconv"

	"greggie/backend/internal/middleware"
	"greggie/backend/internal/models"
	"greggie/backend/internal/store"

	"github.com/gofiber/fiber/v2"
)

type MarketplaceHandler struct {
	Store *store.Store
}

// SearchProducts handles full-text product search with filters.
func (h *MarketplaceHandler) SearchProducts(c *fiber.Ctx) error {
	q := models.MarketplaceQuery{
		Q:         c.Query("q"),
		Category:  c.Query("category"),
		Condition: c.Query("condition"),
		MinPrice:  int64(c.QueryInt("min_price", 0)),
		MaxPrice:  int64(c.QueryInt("max_price", 0)),
		Sort:      c.Query("sort", "newest"),
		Limit:     c.QueryInt("limit", 40),
		Offset:    c.QueryInt("offset", 0),
	}

	products, err := h.Store.SearchProducts(q)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "search failed"})
	}
	if products == nil {
		products = []models.Product{}
	}
	return c.JSON(products)
}

// GetTrending returns top products by recent order volume.
func (h *MarketplaceHandler) GetTrending(c *fiber.Ctx) error {
	limit := c.QueryInt("limit", 20)
	products, err := h.Store.GetTrendingProducts(limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to get trending"})
	}
	if products == nil {
		products = []models.Product{}
	}
	return c.JSON(products)
}

// Gateway returns all marketplace landing page data in a single call.
func (h *MarketplaceHandler) Gateway(c *fiber.Ctx) error {
	gw, err := h.Store.GetMarketplaceGateway()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gateway failed"})
	}
	// Ensure no nil arrays in JSON
	if gw.Categories == nil {
		gw.Categories = []models.CategoryCount{}
	}
	if gw.LiveChannels == nil {
		gw.LiveChannels = []models.Channel{}
	}
	if gw.Trending == nil {
		gw.Trending = []models.Product{}
	}
	if gw.Deals == nil {
		gw.Deals = []models.Product{}
	}
	if gw.NewArrivals == nil {
		gw.NewArrivals = []models.Product{}
	}
	if gw.Drops == nil {
		gw.Drops = []models.Product{}
	}
	if gw.Auctions == nil {
		gw.Auctions = []models.Product{}
	}
	return c.JSON(gw)
}

// GetRecent returns the chronological "Just Posted" feed — the default
// Marketplace landing experience. Supports optional category, ZIP, and
// Near-me (lat/lng/radius_km) filters.
//
// GET /marketplace/recent?limit&offset&category&zip&lat&lng&radius_km
func (h *MarketplaceHandler) GetRecent(c *fiber.Ctx) error {
	limit := c.QueryInt("limit", 40)
	offset := c.QueryInt("offset", 0)
	category := c.Query("category")

	q := store.RecentProductsQuery{
		Limit:    limit,
		Offset:   offset,
		Category: category,
	}

	if lat, err := strconv.ParseFloat(c.Query("lat"), 64); err == nil {
		q.Lat = lat
	}
	if lng, err := strconv.ParseFloat(c.Query("lng"), 64); err == nil {
		q.Lng = lng
	}
	if r, err := strconv.ParseFloat(c.Query("radius_km"), 64); err == nil {
		q.RadiusKm = r
	}

	products, err := h.Store.GetRecentProducts(q)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load feed"})
	}
	return c.JSON(products)
}

// GetSaved — GET /marketplace/saved
func (h *MarketplaceHandler) GetSaved(c *fiber.Ctx) error {
	uid := middleware.GetUserID(c)
	limit := c.QueryInt("limit", 40)
	offset := c.QueryInt("offset", 0)
	products, err := h.Store.GetSavedProducts(uid, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load saved"})
	}
	// All returned items are saved by definition.
	for i := range products {
		products[i].IsSaved = true
	}
	return c.JSON(products)
}

// ToggleSaved — POST /marketplace/saved/:productId
// Idempotent. Returns {saved: true}.
func (h *MarketplaceHandler) ToggleSaved(c *fiber.Ctx) error {
	uid := middleware.GetUserID(c)
	pid := c.Params("productId")
	if pid == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "product id required"})
	}
	if err := h.Store.SaveProduct(uid, pid); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to save"})
	}
	return c.JSON(fiber.Map{"saved": true})
}

// RemoveSaved — DELETE /marketplace/saved/:productId
func (h *MarketplaceHandler) RemoveSaved(c *fiber.Ctx) error {
	uid := middleware.GetUserID(c)
	pid := c.Params("productId")
	if pid == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "product id required"})
	}
	if err := h.Store.UnsaveProduct(uid, pid); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to remove"})
	}
	return c.JSON(fiber.Map{"saved": false})
}
