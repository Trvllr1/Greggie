package handlers

import (
	"greggie/backend/internal/models"
	"greggie/backend/internal/store"

	"github.com/gofiber/fiber/v2"
)

type ChannelHandler struct {
	Store *store.Store
}

func (h *ChannelHandler) GetPrimary(c *fiber.Ctx) error {
	ch, err := h.Store.GetPrimaryChannel()
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "no live channels"})
	}
	products, _ := h.Store.GetProductsByChannel(ch.ID)
	ch.Products = products
	return c.JSON(ch)
}

func (h *ChannelHandler) GetRail(c *fiber.Ctx) error {
	category := c.Query("category")
	channels, err := h.Store.GetChannelRail(category, 20)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load channels"})
	}
	// Attach products to each channel
	for i := range channels {
		prods, _ := h.Store.GetProductsByChannel(channels[i].ID)
		channels[i].Products = prods
	}
	if channels == nil {
		channels = []models.Channel{}
	}
	return c.JSON(channels)
}

func (h *ChannelHandler) GetByID(c *fiber.Ctx) error {
	id := c.Params("id")
	ch, err := h.Store.GetChannelByID(id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "channel not found"})
	}
	products, _ := h.Store.GetProductsByChannel(ch.ID)
	ch.Products = products
	return c.JSON(ch)
}
