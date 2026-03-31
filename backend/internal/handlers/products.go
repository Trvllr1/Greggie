package handlers

import (
	"greggie/backend/internal/models"
	"greggie/backend/internal/store"

	"github.com/gofiber/fiber/v2"
)

type ProductHandler struct {
	Store *store.Store
}

func (h *ProductHandler) GetByID(c *fiber.Ctx) error {
	id := c.Params("id")
	product, err := h.Store.GetProductByID(id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "product not found"})
	}
	return c.JSON(product)
}

func (h *ProductHandler) GetByChannel(c *fiber.Ctx) error {
	channelID := c.Params("channelId")
	products, err := h.Store.GetProductsByChannel(channelID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load products"})
	}
	if products == nil {
		products = []models.Product{}
	}
	return c.JSON(products)
}
