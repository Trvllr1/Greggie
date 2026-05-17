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

	// New path: multi-seller marketplace orders dispatch via order_payments.
	if op, perr := h.Store.GetOrderPaymentByStripePI(pi.ID); perr == nil && op != nil {
		if err := h.Store.UpdateOrderPaymentStatus(op.ID, "succeeded"); err != nil {
			slog.Error("webhook: failed to confirm sub-payment", "order_payment_id", op.ID, "err", err)
		}
		if err := h.Store.CreatePayoutForOrderPayment(op); err != nil {
			slog.Error("webhook: failed to create seller artifacts", "order_id", op.OrderID, "seller_id", op.SellerID, "err", err)
		}
		done, derr := h.Store.AllOrderPaymentsSucceeded(op.OrderID)
		if derr != nil {
			slog.Error("webhook: failed to check sibling payments", "order_id", op.OrderID, "err", derr)
			return
		}
		if !done {
			slog.Info("webhook: sub-payment confirmed, waiting on siblings", "order_id", op.OrderID, "seller_id", op.SellerID)
			return
		}
		// All seller portions paid — confirm order + email customer.
		if err := h.Store.UpdateOrderStatus(op.OrderID, "confirmed"); err != nil {
			slog.Error("webhook: failed to confirm order", "order_id", op.OrderID, "err", err)
		}
		h.sendOrderConfirmationEmail(op.OrderID)
		slog.Info("webhook: order fully confirmed via sub-payments", "order_id", op.OrderID)
		return
	}

	// Legacy path: single-seller orders set orders.stripe_payment_id directly.
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

// sendOrderConfirmationEmail fires the customer email asynchronously for the
// multi-seller path. Looks up order details fresh so we get the final totals.
func (h *WebhookHandler) sendOrderConfirmationEmail(orderID string) {
	go func() {
		order, err := h.Store.GetOrderByID(orderID)
		if err != nil || order == nil {
			return
		}
		recipientEmail := order.Email
		if recipientEmail == "" && order.UserID != "" {
			if user, uerr := h.Store.GetUserByID(order.UserID); uerr == nil {
				recipientEmail = user.Email
			}
		}
		if recipientEmail == "" {
			return
		}
		itemCount := len(order.Items)
		if itemCount == 0 {
			itemCount = 1
		}
		body := email.OrderConfirmationEmail(order.ID, order.TotalCents, itemCount)
		if err := email.Send(recipientEmail, "Order Confirmed — Greggie", body); err != nil {
			slog.Error("webhook: failed to send confirmation email", "order_id", order.ID, "err", err)
		}
	}()
}

func (h *WebhookHandler) handlePaymentFailed(raw json.RawMessage) {
	var pi stripe.PaymentIntent
	if err := json.Unmarshal(raw, &pi); err != nil {
		slog.Error("webhook: failed to parse payment_intent.payment_failed", "err", err)
		return
	}

	// New path: marketplace sub-payment. Cancel siblings, restore inventory,
	// fail the whole order — partial fulfillment is worse than retrying.
	if op, perr := h.Store.GetOrderPaymentByStripePI(pi.ID); perr == nil && op != nil {
		if err := h.Store.UpdateOrderPaymentStatus(op.ID, "failed"); err != nil {
			slog.Error("webhook: failed to mark sub-payment failed", "order_payment_id", op.ID, "err", err)
		}
		siblings, _ := h.Store.GetOrderPayments(op.OrderID)
		for _, sib := range siblings {
			if sib.ID == op.ID || sib.StripePaymentID == "" {
				continue
			}
			if sib.Status == "processing" || sib.Status == "pending" {
				if err := payments.CancelPaymentIntent(sib.StripePaymentID); err != nil {
					slog.Error("webhook: failed to cancel sibling PI", "pi_id", sib.StripePaymentID, "err", err)
				}
				_ = h.Store.UpdateOrderPaymentStatus(sib.ID, "canceled")
			}
		}
		if err := h.Store.RestoreInventory(op.OrderID); err != nil {
			slog.Error("webhook: failed to restore inventory", "order_id", op.OrderID, "err", err)
		}
		if err := h.Store.UpdateOrderStatus(op.OrderID, "failed"); err != nil {
			slog.Error("webhook: failed to mark order failed", "order_id", op.OrderID, "err", err)
		}
		slog.Info("webhook: marketplace order failed", "order_id", op.OrderID, "payment_id", pi.ID, "seller_id", op.SellerID)
		return
	}

	// Legacy path
	order, err := h.Store.GetOrderByStripePaymentID(pi.ID)
	if err != nil {
		slog.Error("webhook: order not found for failed payment", "payment_id", pi.ID, "err", err)
		return
	}

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
