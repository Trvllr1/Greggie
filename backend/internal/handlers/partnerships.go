package handlers

import (
	"errors"
	"log/slog"
	"strings"

	"github.com/gofiber/fiber/v2"

	"greggie/backend/internal/middleware"
	"greggie/backend/internal/models"
	"greggie/backend/internal/partnerships"
	"greggie/backend/internal/store"
)

// PartnershipHandler wires the Partnership Program HTTP API:
//
//	Seller-facing (auth required):
//	  GET    /partnerships/eligibility/:program_type — checklist + current state
//	  GET    /partnerships/window                    — current open window + next scheduled
//	  POST   /partnerships/applications              — submit an application
//	  GET    /partnerships/applications              — list my applications
//	  DELETE /partnerships/applications/:id          — withdraw
//
//	Public:
//	  GET    /partnerships/directory                 — wall-of-fame list of partners
//
//	Admin (admin role required):
//	  POST   /admin/partnerships/windows             — create a new window
//	  POST   /admin/partnerships/windows/:id/status  — open/close
//	  GET    /admin/partnerships/windows             — list
//	  GET    /admin/partnerships/applications        — review queue
//	  POST   /admin/partnerships/applications/:id/decision — approve/reject
type PartnershipHandler struct {
	Store     *store.Store
	Evaluator *partnerships.Evaluator
}

// ── Seller endpoints ─────────────────────────────────────────────────

// GetEligibility returns the partnership checklist for the seller's program.
// Recomputes on demand so the dashboard always shows fresh numbers.
func (h *PartnershipHandler) GetEligibility(c *fiber.Ctx) error {
	uid := middleware.GetUserID(c)
	if uid == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	programType := c.Params("program_type")
	if programType != "csp" && programType != "msp" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "program_type must be csp or msp"})
	}

	prog, err := h.Store.GetSellerProgram(uid, programType)
	if err != nil || prog == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "no program found for this user"})
	}

	items, err := h.Evaluator.ChecklistForProgram(prog.ID)
	if err != nil {
		slog.Error("partnerships: ChecklistForProgram failed", "program", prog.ID, "err", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to compute eligibility"})
	}
	eligible := partnerships.AllPass(items)

	checklist := models.PartnershipChecklist{
		ProgramID:      prog.ID,
		ProgramType:    prog.ProgramType,
		Eligible:       eligible,
		AlreadyPartner: prog.PartnershipProgram,
		Items:          items,
	}

	// Surface window context so the UI knows whether the "Apply" button is live.
	if open, _ := h.Store.GetOpenPartnershipWindow(); open != nil {
		checklist.OpenWindow = open
	} else if next, _ := h.Store.GetNextScheduledPartnershipWindow(); next != nil {
		checklist.NextWindowOpensAt = &next.OpensAt
	}

	// Pull the cached eligible_since timestamp from the nightly snapshot
	// so we don't lie about "eligible just now" on first dashboard load.
	if _, since, _ := h.Store.GetPartnershipEligibilitySnapshot(prog.ID); since != nil {
		checklist.EligibleSince = since
	}

	return c.JSON(checklist)
}

// GetCurrentWindow returns the open application window (or null) plus the
// next scheduled window so the dashboard can show a countdown.
func (h *PartnershipHandler) GetCurrentWindow(c *fiber.Ctx) error {
	open, err := h.Store.GetOpenPartnershipWindow()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load window"})
	}
	next, _ := h.Store.GetNextScheduledPartnershipWindow()
	return c.JSON(fiber.Map{"open": open, "next": next})
}

// SubmitApplication is POST /partnerships/applications.
func (h *PartnershipHandler) SubmitApplication(c *fiber.Ctx) error {
	uid := middleware.GetUserID(c)
	if uid == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	var req models.PartnershipApplicationRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if req.ProgramType != "csp" && req.ProgramType != "msp" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "program_type must be csp or msp"})
	}
	if !req.Agreed {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "you must accept the partnership code of conduct"})
	}
	pitch := strings.TrimSpace(req.Pitch)
	if len(pitch) < 100 || len(pitch) > 2500 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "pitch must be between 100 and 2500 characters"})
	}

	app, err := h.Store.SubmitPartnershipApplication(uid, req.ProgramType, pitch, req.References)
	if err != nil {
		switch {
		case errors.Is(err, store.ErrNoOpenWindow):
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "no application window is currently open"})
		case errors.Is(err, store.ErrWindowFull):
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "this window is fully subscribed"})
		case errors.Is(err, store.ErrAlreadyApplied):
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "you already have an application in flight"})
		case errors.Is(err, store.ErrNotEligible):
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "your program does not currently meet partnership criteria"})
		case errors.Is(err, store.ErrAlreadyPartner):
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "you are already a partner"})
		}
		slog.Error("partnerships: SubmitApplication failed", "user", uid, "err", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to submit application"})
	}
	return c.Status(fiber.StatusCreated).JSON(app)
}

// ListMyApplications is GET /partnerships/applications.
func (h *PartnershipHandler) ListMyApplications(c *fiber.Ctx) error {
	uid := middleware.GetUserID(c)
	if uid == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	apps, err := h.Store.ListMyPartnershipApplications(uid)
	if err != nil {
		slog.Error("partnerships: ListMyApplications failed", "user", uid, "err", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load applications"})
	}
	return c.JSON(fiber.Map{"applications": apps})
}

// Withdraw is DELETE /partnerships/applications/:id.
func (h *PartnershipHandler) Withdraw(c *fiber.Ctx) error {
	uid := middleware.GetUserID(c)
	if uid == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	id := c.Params("id")
	if err := h.Store.WithdrawPartnershipApplication(id, uid); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "withdrawn"})
}

// ── Public endpoints ─────────────────────────────────────────────────

// Directory is GET /partnerships/directory — public partner wall-of-fame.
func (h *PartnershipHandler) Directory(c *fiber.Ctx) error {
	limit := c.QueryInt("limit", 100)
	entries, err := h.Store.ListPartnerDirectory(limit)
	if err != nil {
		slog.Error("partnerships: Directory failed", "err", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load directory"})
	}
	return c.JSON(fiber.Map{"partners": entries, "count": len(entries)})
}

// ── Admin endpoints ──────────────────────────────────────────────────

// AdminCreateWindow is POST /admin/partnerships/windows.
func (h *PartnershipHandler) AdminCreateWindow(c *fiber.Ctx) error {
	var req models.PartnershipWindowRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if strings.TrimSpace(req.Label) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "label is required"})
	}
	if !req.ClosesAt.After(req.OpensAt) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "closes_at must be after opens_at"})
	}
	w, err := h.Store.CreatePartnershipWindow(req)
	if err != nil {
		slog.Error("partnerships: CreateWindow failed", "err", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create window"})
	}
	return c.Status(fiber.StatusCreated).JSON(w)
}

// AdminSetWindowStatus is POST /admin/partnerships/windows/:id/status.
func (h *PartnershipHandler) AdminSetWindowStatus(c *fiber.Ctx) error {
	id := c.Params("id")
	var req struct {
		Status string `json:"status"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if err := h.Store.SetPartnershipWindowStatus(id, req.Status); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "updated"})
}

// AdminListWindows is GET /admin/partnerships/windows.
func (h *PartnershipHandler) AdminListWindows(c *fiber.Ctx) error {
	limit := c.QueryInt("limit", 25)
	windows, err := h.Store.ListPartnershipWindows(limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to list windows"})
	}
	return c.JSON(fiber.Map{"windows": windows})
}

// AdminListApplications is GET /admin/partnerships/applications.
func (h *PartnershipHandler) AdminListApplications(c *fiber.Ctx) error {
	status := c.Query("status", "submitted,under_review")
	limit := c.QueryInt("limit", 50)
	offset := c.QueryInt("offset", 0)
	apps, total, err := h.Store.AdminListPartnershipApplications(status, limit, offset)
	if err != nil {
		slog.Error("partnerships: AdminList failed", "err", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to list applications"})
	}
	return c.JSON(fiber.Map{
		"applications": apps,
		"total":        total,
		"limit":        limit,
		"offset":       offset,
	})
}

// AdminDecide is POST /admin/partnerships/applications/:id/decision.
func (h *PartnershipHandler) AdminDecide(c *fiber.Ctx) error {
	reviewerID := middleware.GetUserID(c)
	if reviewerID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	id := c.Params("id")
	var req models.PartnershipDecisionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if req.Decision != "approved" && req.Decision != "rejected" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "decision must be 'approved' or 'rejected'"})
	}
	if err := h.Store.DecidePartnershipApplication(
		id, reviewerID, req.Decision, req.Reason, req.AccountManagerID,
		partnerships.PartnershipTermDays,
	); err != nil {
		if errors.Is(err, store.ErrWindowFull) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "window is fully subscribed; cannot approve more"})
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	slog.Info("partnerships: decision applied", "application", id, "decision", req.Decision, "reviewer", reviewerID)
	return c.JSON(fiber.Map{"status": "decided", "decision": req.Decision})
}
