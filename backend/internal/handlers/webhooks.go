package handlers

import (
	"encoding/json"
	"log"

	"greggie/backend/internal/payments"
	"greggie/backend/internal/store"

	"github.com/gofiber/fiber/v2"
	"github.com/stripe/stripe-go/v82"
	"github.com/stripe/stripe-go/v82/webhook"
)

type WebhookHandler struct {
	Store *store.Store
}

// HandleStripeWebhook verifies and processes Stripe webhook events.
func (h *WebhookHandler) HandleStripeWebhook(c *fiber.Ctx) error {
	if !payments.Enabled() {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "payments not configured"})
	}

	body := c.Body()
	sig := c.Get("Stripe-Signature")
	secret := payments.WebhookSecret()

	if secret == "" {
		log.Println("webhook: STRIPE_WEBHOOK_SECRET not set, skipping verification")
		return c.SendStatus(fiber.StatusOK)
	}

	event, err := webhook.ConstructEvent(body, sig, secret)
	if err != nil {
		log.Printf("webhook: signature verification failed: %v", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid signature"})
	}

	switch event.Type {
	case "payment_intent.succeeded":
		h.handlePaymentSuccess(event.Data.Raw)
	case "payment_intent.payment_failed":
		h.handlePaymentFailed(event.Data.Raw)
	case "account.updated":
		h.handleAccountUpdated(event.Data.Raw)
	default:
		log.Printf("webhook: unhandled event type %s", event.Type)
	}

	return c.SendStatus(fiber.StatusOK)
}

func (h *WebhookHandler) handlePaymentSuccess(raw json.RawMessage) {
	var pi stripe.PaymentIntent
	if err := json.Unmarshal(raw, &pi); err != nil {
		log.Printf("webhook: failed to parse payment_intent.succeeded: %v", err)
		return
	}

	order, err := h.Store.GetOrderByStripePaymentID(pi.ID)
	if err != nil {
		log.Printf("webhook: order not found for payment %s: %v", pi.ID, err)
		return
	}

	if err := h.Store.UpdateOrderStatus(order.ID, "confirmed"); err != nil {
		log.Printf("webhook: failed to confirm order %s: %v", order.ID, err)
	}
	log.Printf("webhook: order %s confirmed (payment %s)", order.ID, pi.ID)
}

func (h *WebhookHandler) handlePaymentFailed(raw json.RawMessage) {
	var pi stripe.PaymentIntent
	if err := json.Unmarshal(raw, &pi); err != nil {
		log.Printf("webhook: failed to parse payment_intent.payment_failed: %v", err)
		return
	}

	order, err := h.Store.GetOrderByStripePaymentID(pi.ID)
	if err != nil {
		log.Printf("webhook: order not found for failed payment %s: %v", pi.ID, err)
		return
	}

	// Restore inventory and mark order as failed
	if err := h.Store.RestoreInventory(order.ID); err != nil {
		log.Printf("webhook: failed to restore inventory for order %s: %v", order.ID, err)
	}
	if err := h.Store.UpdateOrderStatus(order.ID, "failed"); err != nil {
		log.Printf("webhook: failed to update order %s status: %v", order.ID, err)
	}
	log.Printf("webhook: order %s failed (payment %s)", order.ID, pi.ID)
}

func (h *WebhookHandler) handleAccountUpdated(raw json.RawMessage) {
	var acct stripe.Account
	if err := json.Unmarshal(raw, &acct); err != nil {
		log.Printf("webhook: failed to parse account.updated: %v", err)
		return
	}

	ready := acct.ChargesEnabled && acct.PayoutsEnabled
	if ready {
		// Find user by stripe_account_id and mark onboarding complete
		// We search from the account ID
		if err := h.Store.SetStripeOnboardingByAccountID(acct.ID, true); err != nil {
			log.Printf("webhook: failed to update onboarding for account %s: %v", acct.ID, err)
		} else {
			log.Printf("webhook: account %s onboarding complete", acct.ID)
		}
	}
}
