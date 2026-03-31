package payments

import (
	"fmt"
	"log"
	"os"

	"github.com/stripe/stripe-go/v82"
	"github.com/stripe/stripe-go/v82/account"
	"github.com/stripe/stripe-go/v82/accountlink"
	"github.com/stripe/stripe-go/v82/paymentintent"
)

var webhookSecret string

// Init configures the Stripe SDK. Must be called at startup.
func Init() {
	key := os.Getenv("STRIPE_SECRET_KEY")
	if key == "" {
		env := os.Getenv("ENVIRONMENT")
		if env != "dev" && env != "test" {
			log.Fatal("FATAL: STRIPE_SECRET_KEY is required in production")
		}
		log.Println("payments: STRIPE_SECRET_KEY not set — Stripe disabled (dev mode)")
		return
	}
	stripe.Key = key

	webhookSecret = os.Getenv("STRIPE_WEBHOOK_SECRET")
	log.Println("payments: Stripe initialized")
}

// Enabled returns true if Stripe is configured.
func Enabled() bool {
	return stripe.Key != ""
}

// WebhookSecret returns the webhook signing secret.
func WebhookSecret() string {
	return webhookSecret
}

// CreateConnectAccount creates a Stripe Express connected account for a seller.
func CreateConnectAccount(email string) (string, error) {
	params := &stripe.AccountParams{
		Type:    stripe.String(string(stripe.AccountTypeExpress)),
		Email:   stripe.String(email),
		Country: stripe.String("US"),
		Capabilities: &stripe.AccountCapabilitiesParams{
			CardPayments: &stripe.AccountCapabilitiesCardPaymentsParams{
				Requested: stripe.Bool(true),
			},
			Transfers: &stripe.AccountCapabilitiesTransfersParams{
				Requested: stripe.Bool(true),
			},
		},
		BusinessProfile: &stripe.AccountBusinessProfileParams{
			ProductDescription: stripe.String("Greggie live commerce seller"),
		},
	}
	acct, err := account.New(params)
	if err != nil {
		return "", fmt.Errorf("create connect account: %w", err)
	}
	return acct.ID, nil
}

// CreateOnboardingLink generates a Stripe Connect onboarding URL.
func CreateOnboardingLink(accountID, returnURL, refreshURL string) (string, error) {
	params := &stripe.AccountLinkParams{
		Account:    stripe.String(accountID),
		RefreshURL: stripe.String(refreshURL),
		ReturnURL:  stripe.String(returnURL),
		Type:       stripe.String("account_onboarding"),
	}
	link, err := accountlink.New(params)
	if err != nil {
		return "", fmt.Errorf("create onboarding link: %w", err)
	}
	return link.URL, nil
}

// GetAccountStatus checks if a connected account has completed onboarding.
func GetAccountStatus(accountID string) (bool, error) {
	acct, err := account.GetByID(accountID, nil)
	if err != nil {
		return false, fmt.Errorf("get account: %w", err)
	}
	return acct.ChargesEnabled && acct.PayoutsEnabled, nil
}

// CreatePaymentIntent creates a PaymentIntent with optional Connect destination.
func CreatePaymentIntent(amountCents int64, currency string, sellerAccountID string, platformFeeCents int64, idempotencyKey string, metadata map[string]string) (string, string, error) {
	params := &stripe.PaymentIntentParams{
		Amount:   stripe.Int64(amountCents),
		Currency: stripe.String(currency),
		AutomaticPaymentMethods: &stripe.PaymentIntentAutomaticPaymentMethodsParams{
			Enabled: stripe.Bool(true),
		},
	}

	// Connect: route payment to seller, deduct platform fee
	if sellerAccountID != "" {
		params.TransferData = &stripe.PaymentIntentTransferDataParams{
			Destination: stripe.String(sellerAccountID),
		}
		params.ApplicationFeeAmount = stripe.Int64(platformFeeCents)
	}

	// Idempotency
	if idempotencyKey != "" {
		params.SetIdempotencyKey(idempotencyKey)
	}

	// Metadata
	if metadata != nil {
		params.Metadata = make(map[string]string)
		for k, v := range metadata {
			params.Metadata[k] = v
		}
	}

	pi, err := paymentintent.New(params)
	if err != nil {
		return "", "", fmt.Errorf("create payment intent: %w", err)
	}
	return pi.ID, pi.ClientSecret, nil
}

// CancelPaymentIntent cancels a PaymentIntent (e.g., on failed checkout).
func CancelPaymentIntent(paymentIntentID string) error {
	_, err := paymentintent.Cancel(paymentIntentID, nil)
	return err
}
