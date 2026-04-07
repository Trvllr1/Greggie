package handlers

import (
	"log"

	"greggie/backend/internal/models"
	"greggie/backend/internal/payments"
	"greggie/backend/internal/store"

	"github.com/gofiber/fiber/v2"
)

type AdminHandler struct {
	Store *store.Store
}

// GetStats returns platform-wide dashboard statistics.
func (h *AdminHandler) GetStats(c *fiber.Ctx) error {
	stats, err := h.Store.AdminGetStats()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load stats"})
	}
	return c.JSON(stats)
}

// ListUsers returns paginated users with optional role filter.
func (h *AdminHandler) ListUsers(c *fiber.Ctx) error {
	role := c.Query("role")
	limit := c.QueryInt("limit", 50)
	offset := c.QueryInt("offset", 0)

	users, total, err := h.Store.AdminListUsers(role, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to list users"})
	}
	return c.JSON(fiber.Map{"users": users, "total": total, "limit": limit, "offset": offset})
}

// ListSellerPrograms returns paginated seller programs with optional status filter.
func (h *AdminHandler) ListSellerPrograms(c *fiber.Ctx) error {
	status := c.Query("status")
	limit := c.QueryInt("limit", 50)
	offset := c.QueryInt("offset", 0)

	programs, total, err := h.Store.AdminListSellerPrograms(status, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to list programs"})
	}
	return c.JSON(fiber.Map{"programs": programs, "total": total, "limit": limit, "offset": offset})
}

// UpdateSellerProgram approves, rejects, suspends, or closes a seller program.
func (h *AdminHandler) UpdateSellerProgram(c *fiber.Ctx) error {
	programID := c.Params("id")
	var req models.AdminUpdateProgramRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	validStatuses := map[string]bool{"approved": true, "rejected": true, "active": true, "suspended": true, "closed": true}
	if !validStatuses[req.Status] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid status; must be approved, rejected, active, suspended, or closed"})
	}
	if req.Status == "rejected" && req.Reason == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "reason is required when rejecting"})
	}

	if err := h.Store.AdminUpdateSellerProgram(programID, req.Status, req.Reason); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update program"})
	}

	return c.JSON(fiber.Map{"status": "updated"})
}

// ListOrders returns paginated orders with optional status filter.
func (h *AdminHandler) ListOrders(c *fiber.Ctx) error {
	status := c.Query("status")
	limit := c.QueryInt("limit", 50)
	offset := c.QueryInt("offset", 0)

	orders, total, err := h.Store.AdminListOrders(status, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to list orders"})
	}
	return c.JSON(fiber.Map{"orders": orders, "total": total, "limit": limit, "offset": offset})
}

// ProcessPayouts triggers payout transfers for all pending payouts with verified Stripe accounts.
func (h *AdminHandler) ProcessPayouts(c *fiber.Ctx) error {
	if !payments.Enabled() {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "stripe not configured"})
	}

	pending, err := h.Store.GetPendingPayoutsWithAccounts(200)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load pending payouts"})
	}

	var processed, failed int
	for _, p := range pending {
		if p.NetCents <= 0 {
			continue
		}
		idempotencyKey := "payout_" + p.PayoutID
		description := "Greggie payout for order " + p.OrderID
		transferID, err := payments.CreateTransfer(p.NetCents, "usd", p.StripeAccountID, description, idempotencyKey)
		if err != nil {
			log.Printf("admin: payout transfer failed for payout %s: %v", p.PayoutID, err)
			_ = h.Store.MarkPayoutFailed(p.PayoutID)
			failed++
			continue
		}
		if err := h.Store.MarkPayoutPaid(p.PayoutID, transferID); err != nil {
			log.Printf("admin: failed to mark payout %s as paid: %v", p.PayoutID, err)
			failed++
			continue
		}
		processed++
	}

	return c.JSON(fiber.Map{
		"processed": processed,
		"failed":    failed,
		"total":     len(pending),
	})
}
