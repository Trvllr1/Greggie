package handlers

import (
	"greggie/backend/internal/middleware"
	"greggie/backend/internal/models"
	"greggie/backend/internal/store"

	"github.com/gofiber/fiber/v2"
)

type CartHandler struct {
	Store *store.Store
}

// GetCart returns the user's cart with items.
func (h *CartHandler) GetCart(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	cart, err := h.Store.GetCartWithItems(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to get cart"})
	}
	return c.JSON(cart)
}

// AddItem adds a product to the cart.
func (h *CartHandler) AddItem(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	var req models.AddCartItemRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if req.ProductID == "" || req.Quantity <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "product_id and quantity required"})
	}

	// Verify product exists and has inventory
	product, err := h.Store.GetProductByID(req.ProductID)
	if err != nil || product == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "product not found"})
	}
	if product.Inventory < req.Quantity {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "insufficient inventory"})
	}

	cart, err := h.Store.GetOrCreateCart(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to get cart"})
	}

	item, err := h.Store.AddCartItem(cart.ID, req.ProductID, req.Quantity)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to add item"})
	}
	return c.Status(fiber.StatusCreated).JSON(item)
}

// UpdateItem updates the quantity of a cart item.
func (h *CartHandler) UpdateItem(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	itemID := c.Params("id")
	var req models.UpdateCartItemRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if req.Quantity <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "quantity must be positive"})
	}

	cart, err := h.Store.GetOrCreateCart(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to get cart"})
	}
	if err := h.Store.UpdateCartItem(itemID, cart.ID, req.Quantity); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update item"})
	}
	return c.JSON(fiber.Map{"status": "updated"})
}

// RemoveItem removes an item from the cart.
func (h *CartHandler) RemoveItem(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	itemID := c.Params("id")

	cart, err := h.Store.GetOrCreateCart(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to get cart"})
	}
	if err := h.Store.RemoveCartItem(itemID, cart.ID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to remove item"})
	}
	return c.JSON(fiber.Map{"status": "removed"})
}
