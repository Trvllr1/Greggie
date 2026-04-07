package handlers

import (
	"greggie/backend/internal/models"
	"greggie/backend/internal/store"

	"github.com/gofiber/fiber/v2"
)

type BillboardHandler struct {
	Store *store.Store
}

// ListBillboards returns paginated billboards with optional status filter.
func (h *BillboardHandler) ListBillboards(c *fiber.Ctx) error {
	status := c.Query("status")
	limit := c.QueryInt("limit", 20)
	offset := c.QueryInt("offset", 0)

	billboards, total, err := h.Store.ListBillboards(status, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to list billboards"})
	}
	return c.JSON(fiber.Map{"billboards": billboards, "total": total})
}

// GetBillboard returns a single billboard by ID.
func (h *BillboardHandler) GetBillboard(c *fiber.Ctx) error {
	id := c.Params("id")

	billboard, err := h.Store.GetBillboardByID(id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "billboard not found"})
	}
	return c.JSON(billboard)
}

// CreateBillboard creates a new billboard.
func (h *BillboardHandler) CreateBillboard(c *fiber.Ctx) error {
	var b models.Billboard
	if err := c.BodyParser(&b); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	if err := h.Store.CreateBillboard(&b); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create billboard"})
	}
	return c.Status(fiber.StatusCreated).JSON(b)
}

// UpdateBillboard updates an existing billboard by ID.
func (h *BillboardHandler) UpdateBillboard(c *fiber.Ctx) error {
	id := c.Params("id")

	var b models.Billboard
	if err := c.BodyParser(&b); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	b.ID = id

	if err := h.Store.UpdateBillboard(&b); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update billboard"})
	}
	return c.JSON(fiber.Map{"status": "updated"})
}

// DeleteBillboard removes a billboard by ID.
func (h *BillboardHandler) DeleteBillboard(c *fiber.Ctx) error {
	id := c.Params("id")

	if err := h.Store.DeleteBillboard(id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete billboard"})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *BillboardHandler) TrackImpression(c *fiber.Ctx) error {
	billboardID := c.Params("id")
	userID, _ := c.Locals("user_id").(string)
	if err := h.Store.RecordBillboardEvent(billboardID, userID, "impression"); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "failed to record impression"})
	}
	return c.SendStatus(204)
}

func (h *BillboardHandler) TrackClick(c *fiber.Ctx) error {
	billboardID := c.Params("id")
	userID, _ := c.Locals("user_id").(string)
	if err := h.Store.RecordBillboardEvent(billboardID, userID, "click"); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "failed to record click"})
	}
	return c.SendStatus(204)
}
