package handlers

import (
	"database/sql"
	"time"

	"greggie/backend/internal/middleware"
	"greggie/backend/internal/models"
	"greggie/backend/internal/store"

	"github.com/gofiber/fiber/v2"
)

type SellerProgramHandler struct {
	Store *store.Store
}

// EnrollProgram — POST /programs/enroll
func (h *SellerProgramHandler) EnrollProgram(c *fiber.Ctx) error {
	uid := middleware.GetUserID(c)

	var req models.EnrollProgramRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	if req.ProgramType != "csp" && req.ProgramType != "msp" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "program_type must be 'csp' or 'msp'"})
	}
	if !req.AgreedToTerms {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "you must agree to the terms"})
	}

	// Check for existing enrollment
	existing, _ := h.Store.GetSellerProgram(uid, req.ProgramType)
	if existing != nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "already enrolled in this program", "program": existing})
	}

	now := time.Now()
	sp := &models.SellerProgram{
		UserID:           uid,
		ProgramType:      req.ProgramType,
		Status:           "pending",
		Tier:             "new",
		AgreedAt:         &now,
		AgreementVersion: "1.0",
		ApplicationNote:  req.ApplicationNote,
	}

	// For CSP: verify user has creator capabilities (channel or creator role)
	if req.ProgramType == "csp" {
		user, err := h.Store.GetUserByID(uid)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load user"})
		}
		// Upgrade role to creator if they are a buyer
		if user.Role == "buyer" {
			_ = h.Store.UpgradeUserRole(uid, "creator")
		}
	}

	// For MSP: verify or note that they need a shop
	if req.ProgramType == "msp" {
		user, err := h.Store.GetUserByID(uid)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load user"})
		}
		if user.Role == "buyer" {
			_ = h.Store.UpgradeUserRole(uid, "seller")
		}
	}

	if err := h.Store.CreateSellerProgram(sp); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to enroll"})
	}

	return c.Status(fiber.StatusCreated).JSON(sp)
}

// GetMyPrograms — GET /programs
func (h *SellerProgramHandler) GetMyPrograms(c *fiber.Ctx) error {
	uid := middleware.GetUserID(c)
	programs, err := h.Store.GetSellerPrograms(uid)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load programs"})
	}
	if programs == nil {
		programs = []models.SellerProgram{}
	}
	return c.JSON(programs)
}

// GetProgramStatus — GET /programs/:type
func (h *SellerProgramHandler) GetProgramStatus(c *fiber.Ctx) error {
	uid := middleware.GetUserID(c)
	progType := c.Params("type")

	sp, err := h.Store.GetSellerProgram(uid, progType)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not enrolled in this program"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load program"})
	}

	cr, _ := h.Store.GetCommissionRule(progType, sp.Tier)

	return c.JSON(fiber.Map{
		"program":    sp,
		"commission": cr,
	})
}

// GetCSPDashboard — GET /programs/csp/dashboard
func (h *SellerProgramHandler) GetCSPDashboard(c *fiber.Ctx) error {
	uid := middleware.GetUserID(c)
	dashboard, err := h.Store.GetCSPDashboardData(uid)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not enrolled in CSP"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load dashboard"})
	}
	return c.JSON(dashboard)
}

// GetMSPDashboard — GET /programs/msp/dashboard
func (h *SellerProgramHandler) GetMSPDashboard(c *fiber.Ctx) error {
	uid := middleware.GetUserID(c)
	dashboard, err := h.Store.GetMSPDashboardData(uid)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not enrolled in MSP"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load dashboard"})
	}
	return c.JSON(dashboard)
}

// GetSellerOrders — GET /programs/:type/orders
func (h *SellerProgramHandler) GetSellerOrders(c *fiber.Ctx) error {
	uid := middleware.GetUserID(c)
	progType := c.Params("type")
	statusFilter := c.Query("status")
	limit := c.QueryInt("limit", 50)
	offset := c.QueryInt("offset", 0)

	// Verify enrollment
	_, err := h.Store.GetSellerProgram(uid, progType)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not enrolled in this program"})
	}

	orders, err := h.Store.GetSellerOrders(uid, progType, statusFilter, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load orders"})
	}
	if orders == nil {
		orders = []models.SellerOrderView{}
	}
	return c.JSON(orders)
}

// GetSellerPayouts — GET /programs/:type/payouts
func (h *SellerProgramHandler) GetSellerPayouts(c *fiber.Ctx) error {
	uid := middleware.GetUserID(c)
	progType := c.Params("type")
	limit := c.QueryInt("limit", 50)
	offset := c.QueryInt("offset", 0)

	_, err := h.Store.GetSellerProgram(uid, progType)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not enrolled in this program"})
	}

	payouts, err := h.Store.GetPayouts(uid, progType, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load payouts"})
	}
	if payouts == nil {
		payouts = []models.Payout{}
	}
	return c.JSON(payouts)
}

// UpdateOrderFulfillment — PUT /programs/orders/:orderId/fulfillment
func (h *SellerProgramHandler) UpdateOrderFulfillment(c *fiber.Ctx) error {
	uid := middleware.GetUserID(c)
	orderID := c.Params("orderId")

	var req models.UpdateFulfillmentRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	if req.Status != nil {
		switch *req.Status {
		case "pending", "processing", "shipped", "in_transit", "delivered", "returned":
		default:
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid fulfillment status"})
		}
	}

	ownsOrder, err := h.Store.SellerOwnsOrder(uid, orderID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to verify order ownership"})
	}
	if !ownsOrder {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not your order"})
	}

	// Try to get the caller's seller-scoped fulfillment record.
	existing, err := h.Store.GetFulfillmentByOrderAndSeller(orderID, uid)
	if err != nil {
		if err != sql.ErrNoRows {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load fulfillment"})
		}
		// Create new fulfillment record
		fr := &models.FulfillmentRecord{
			OrderID:         orderID,
			SellerID:        uid,
			FulfillmentType: "fbm",
			Status:          "pending",
		}
		if req.TrackingNumber != nil {
			fr.TrackingNumber = *req.TrackingNumber
		}
		if req.Carrier != nil {
			fr.Carrier = *req.Carrier
		}
		if req.Status != nil {
			fr.Status = *req.Status
		}
		if err := h.Store.CreateFulfillmentRecord(fr); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create fulfillment"})
		}

		if err := h.Store.SyncOrderStatusFromFulfillment(orderID); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to sync order status"})
		}

		return c.Status(fiber.StatusCreated).JSON(fr)
	}

	if err := h.Store.UpdateFulfillmentRecord(existing.ID, &req); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update fulfillment"})
	}

	if err := h.Store.SyncOrderStatusFromFulfillment(orderID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to sync order status"})
	}

	updated, _ := h.Store.GetFulfillmentByOrderAndSeller(orderID, uid)
	return c.JSON(updated)
}

// GetSellerAnalytics — GET /programs/:type/analytics
func (h *SellerProgramHandler) GetSellerAnalytics(c *fiber.Ctx) error {
	uid := middleware.GetUserID(c)
	progType := c.Params("type")
	from := c.Query("from", time.Now().AddDate(0, 0, -30).Format("2006-01-02"))
	to := c.Query("to", time.Now().Format("2006-01-02"))

	_, err := h.Store.GetSellerProgram(uid, progType)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not enrolled in this program"})
	}

	analytics, err := h.Store.GetSellerAnalytics(uid, progType, from, to)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load analytics"})
	}
	if analytics == nil {
		analytics = []models.SellerAnalyticsDay{}
	}
	return c.JSON(analytics)
}
