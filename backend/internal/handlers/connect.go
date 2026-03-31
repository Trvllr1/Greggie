package handlers

import (
	"greggie/backend/internal/middleware"
	"greggie/backend/internal/payments"
	"greggie/backend/internal/store"

	"github.com/gofiber/fiber/v2"
)

type ConnectHandler struct {
	Store *store.Store
}

// StartOnboarding creates a Stripe Express account (if needed) and returns the onboarding URL.
func (h *ConnectHandler) StartOnboarding(c *fiber.Ctx) error {
	if !payments.Enabled() {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "payments not configured"})
	}

	userID := middleware.GetUserID(c)
	user, err := h.Store.GetUserByID(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could not load user"})
	}

	accountID := user.StripeAccountID

	// Create account if user doesn't have one yet
	if accountID == "" {
		accountID, err = payments.CreateConnectAccount(user.Email)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create connect account"})
		}
		if err := h.Store.SetStripeAccountID(userID, accountID); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to save account"})
		}
	}

	var req struct {
		ReturnURL  string `json:"return_url"`
		RefreshURL string `json:"refresh_url"`
	}
	if err := c.BodyParser(&req); err != nil || req.ReturnURL == "" || req.RefreshURL == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "return_url and refresh_url required"})
	}

	url, err := payments.CreateOnboardingLink(accountID, req.ReturnURL, req.RefreshURL)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create onboarding link"})
	}

	return c.JSON(fiber.Map{
		"url":        url,
		"account_id": accountID,
	})
}

// GetStatus returns the current Stripe Connect onboarding status for the authenticated user.
func (h *ConnectHandler) GetStatus(c *fiber.Ctx) error {
	if !payments.Enabled() {
		return c.JSON(fiber.Map{"enabled": false, "onboarded": false})
	}

	userID := middleware.GetUserID(c)
	user, err := h.Store.GetUserByID(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could not load user"})
	}

	if user.StripeAccountID == "" {
		return c.JSON(fiber.Map{"enabled": true, "onboarded": false, "account_id": ""})
	}

	ready, err := payments.GetAccountStatus(user.StripeAccountID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to check account status"})
	}

	// Persist onboarding completion
	if ready && !user.StripeOnboardingComplete {
		_ = h.Store.SetStripeOnboardingComplete(userID, true)
	}

	return c.JSON(fiber.Map{
		"enabled":    true,
		"onboarded":  ready,
		"account_id": user.StripeAccountID,
	})
}
