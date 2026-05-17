package handlers

import (
	"encoding/json"
	"log/slog"

	"greggie/backend/internal/email"
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
		slog.Warn("webhook: STRIPE_WEBHOOK_SECRET not set, skipping verification")
		return c.SendStatus(fiber.StatusOK)
	}

	event, err := webhook.ConstructEvent(body, sig, secret)
	if err != nil {
		slog.Error("webhook: signature verification failed", "err", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid signature"})
	}

	// Idempotency: Stripe redelivers events on retry. Dedup by event ID so we don't
	// double-send confirmation emails, double-restore inventory, etc.
	fresh, err := h.Store.MarkWebhookEventProcessed(event.ID, "stripe", string(event.Type))
	if err != nil {
		slog.Error("webhook: dedup check failed", "event_id", event.ID, "err", err)
		// Fall through and process anyway — better to risk a duplicate than to drop on the floor.
		// Stripe will retry on non-2xx, so returning 500 here would just amplify the problem.
	} else if !fresh {
		slog.Info("webhook: duplicate event — already processed, ack", "event_id", event.ID, "event_type", event.Type)
		return c.SendStatus(fiber.StatusOK)
	}

	switch event.Type {
	case "payment_intent.succeeded":
		h.handlePaymentSuccess(event.Data.Raw)
	case "payment_intent.payment_failed":
		h.handlePaymentFailed(event.Data.Raw)
	case "account.updated":
		h.handleAccountUpdated(event.Data.Raw)
	default:
		slog.Info("webhook: unhandled event type", "event_type", event.Type)
	}

	return c.SendStatus(fiber.StatusOK)
}

func (h *WebhookHandler) handlePaymentSuccess(raw json.RawMessage) {
	var pi stripe.PaymentIntent
	if err := json.Unmarshal(raw, &pi); err != nil {
		slog.Error("webhook: failed to parse payment_intent.succeeded", "err", err)
		return
	}

	order, err := h.Store.GetOrderByStripePaymentID(pi.ID)
	if err != nil {
		slog.Error("webhook: order not found for payment", "payment_id", pi.ID, "err", err)
		return
	}

	if err := h.Store.UpdateOrderStatus(order.ID, "confirmed"); err != nil {
		slog.Error("webhook: failed to confirm order", "order_id", order.ID, "err", err)
	}
	if err := h.Store.EnsureSellerArtifactsForOrder(order.ID); err != nil {
		slog.Error("webhook: failed to create seller artifacts", "order_id", order.ID, "err", err)
	}

	// Send order confirmation email
	go func() {
		recipientEmail := order.Email
		if recipientEmail == "" {
			if user, err := h.Store.GetUserByID(order.UserID); err == nil {
				recipientEmail = user.Email
			}
		}
		if recipientEmail != "" {
			itemCount := len(order.Items)
			if itemCount == 0 {
				itemCount = 1
			}
			body := email.OrderConfirmationEmail(order.ID, order.TotalCents, itemCount)
			if err := email.Send(recipientEmail, "Order Confirmed — Greggie", body); err != nil {
				slog.Error("webhook: failed to send confirmation email", "order_id", order.ID, "err", err)
			}
		}
	}()

	slog.Info("webhook: order confirmed", "order_id", order.ID, "payment_id", pi.ID)
}

func (h *WebhookHandler) handlePaymentFailed(raw json.RawMessage) {
	var pi stripe.PaymentIntent
	if err := json.Unmarshal(raw, &pi); err != nil {
		slog.Error("webhook: failed to parse payment_intent.payment_failed", "err", err)
		return
	}

	order, err := h.Store.GetOrderByStripePaymentID(pi.ID)
	if err != nil {
		slog.Error("webhook: order not found for failed payment", "payment_id", pi.ID, "err", err)
		return
	}

	// Restore inventory and mark order as failed
	if err := h.Store.RestoreInventory(order.ID); err != nil {
		slog.Error("webhook: failed to restore inventory", "order_id", order.ID, "err", err)
	}
	if err := h.Store.UpdateOrderStatus(order.ID, "failed"); err != nil {
		slog.Error("webhook: failed to update order status", "order_id", order.ID, "err", err)
	}
	slog.Info("webhook: order failed", "order_id", order.ID, "payment_id", pi.ID)
}

func (h *WebhookHandler) handleAccountUpdated(raw json.RawMessage) {
	var acct stripe.Account
	if err := json.Unmarshal(raw, &acct); err != nil {
		slog.Error("webhook: failed to parse account.updated", "err", err)
		return
	}

	ready := acct.ChargesEnabled && acct.PayoutsEnabled
	if ready {
		// Find user by stripe_account_id and mark onboarding complete
		// We search from the account ID
		if err := h.Store.SetStripeOnboardingByAccountID(acct.ID, true); err != nil {
			slog.Error("webhook: failed to update onboarding", "account_id", acct.ID, "err", err)
		} else {
			slog.Info("webhook: account onboarding complete", "account_id", acct.ID)
		}
	}
}
