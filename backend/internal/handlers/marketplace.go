package handlers

import (
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
