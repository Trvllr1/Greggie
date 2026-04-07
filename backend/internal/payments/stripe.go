package payments

import (
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/stripe/stripe-go/v82"
	"github.com/stripe/stripe-go/v82/account"
	"github.com/stripe/stripe-go/v82/accountlink"
	"github.com/stripe/stripe-go/v82/paymentintent"
	"github.com/stripe/stripe-go/v82/tax/calculation"
	"github.com/stripe/stripe-go/v82/tax/transaction"
	"github.com/stripe/stripe-go/v82/transfer"
)

var webhookSecret string

type TaxAddress struct {
	Line1      string
	City       string
	State      string
	PostalCode string
	Country    string
}

type TaxLineItem struct {
	Reference   string
	AmountCents int64
	Quantity    int64
	TaxCode     string
}

type TaxCalculationResult struct {
	CalculationID string
	TaxCents      int64
	TaxRate       float64
	TotalCents    int64
}

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

func CalculateTax(currency string, customerAddress TaxAddress, shippingCents int64, items []TaxLineItem) (*TaxCalculationResult, error) {
	if !Enabled() {
		return nil, fmt.Errorf("stripe not enabled")
	}
	if len(items) == 0 {
		return &TaxCalculationResult{}, nil
	}

	params := &stripe.TaxCalculationParams{
		Currency: stripe.String(strings.ToLower(currency)),
		CustomerDetails: &stripe.TaxCalculationCustomerDetailsParams{
			Address: &stripe.AddressParams{
				Line1:      stripe.String(customerAddress.Line1),
				City:       stripe.String(customerAddress.City),
				State:      stripe.String(customerAddress.State),
				PostalCode: stripe.String(customerAddress.PostalCode),
				Country:    stripe.String(strings.ToUpper(defaultTaxAddressValue(customerAddress.Country, "US"))),
			},
			AddressSource: stripe.String("shipping"),
		},
		ShipFromDetails: &stripe.TaxCalculationShipFromDetailsParams{
			Address: &stripe.AddressParams{
				Line1:      stripe.String(defaultTaxAddressValue(os.Getenv("STRIPE_TAX_SHIP_FROM_LINE1"), "55 W 25th St")),
				City:       stripe.String(defaultTaxAddressValue(os.Getenv("STRIPE_TAX_SHIP_FROM_CITY"), "New York")),
				State:      stripe.String(defaultTaxAddressValue(os.Getenv("STRIPE_TAX_SHIP_FROM_STATE"), "NY")),
				PostalCode: stripe.String(defaultTaxAddressValue(os.Getenv("STRIPE_TAX_SHIP_FROM_POSTAL_CODE"), "10010")),
				Country:    stripe.String(strings.ToUpper(defaultTaxAddressValue(os.Getenv("STRIPE_TAX_SHIP_FROM_COUNTRY"), "US"))),
			},
		},
		TaxDate: stripe.Int64(time.Now().Unix()),
	}

	var taxableBase int64
	for _, item := range items {
		if item.AmountCents <= 0 {
			continue
		}
		taxableBase += item.AmountCents
		params.LineItems = append(params.LineItems, &stripe.TaxCalculationLineItemParams{
			Amount:      stripe.Int64(item.AmountCents),
			Quantity:    stripe.Int64(item.Quantity),
			Reference:   stripe.String(item.Reference),
			TaxBehavior: stripe.String("exclusive"),
			TaxCode:     stripe.String(defaultTaxAddressValue(item.TaxCode, "txcd_99999999")),
		})
	}

	if shippingCents > 0 {
		shippingCost := &stripe.TaxCalculationShippingCostParams{
			Amount:      stripe.Int64(shippingCents),
			TaxBehavior: stripe.String("exclusive"),
		}
		if shippingTaxCode := os.Getenv("STRIPE_TAX_SHIPPING_CODE"); shippingTaxCode != "" {
			shippingCost.TaxCode = stripe.String(shippingTaxCode)
		}
		params.ShippingCost = shippingCost
		taxableBase += shippingCents
	}

	calc, err := calculation.New(params)
	if err != nil {
		return nil, fmt.Errorf("stripe tax calculation: %w", err)
	}

	effectiveRate := 0.0
	if taxableBase > 0 {
		effectiveRate = float64(calc.TaxAmountExclusive) / float64(taxableBase)
	}

	return &TaxCalculationResult{
		CalculationID: calc.ID,
		TaxCents:      calc.TaxAmountExclusive,
		TaxRate:       effectiveRate,
		TotalCents:    calc.AmountTotal,
	}, nil
}

func CreateTaxTransactionFromCalculation(calculationID, reference string, metadata map[string]string) (string, error) {
	if !Enabled() {
		return "", fmt.Errorf("stripe not enabled")
	}

	params := &stripe.TaxTransactionCreateFromCalculationParams{
		Calculation: stripe.String(calculationID),
		Reference:   stripe.String(reference),
		PostedAt:    stripe.Int64(time.Now().Unix()),
	}
	for key, value := range metadata {
		params.AddMetadata(key, value)
	}

	txn, err := transaction.CreateFromCalculation(params)
	if err != nil {
		return "", fmt.Errorf("create stripe tax transaction: %w", err)
	}
	return txn.ID, nil
}

func defaultTaxAddressValue(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

// CreateTransfer sends funds to a connected Stripe account (seller payout).
func CreateTransfer(amountCents int64, currency, destinationAccountID, description, idempotencyKey string) (string, error) {
	if !Enabled() {
		return "", fmt.Errorf("stripe not enabled")
	}
	params := &stripe.TransferParams{
		Amount:      stripe.Int64(amountCents),
		Currency:    stripe.String(strings.ToLower(currency)),
		Destination: stripe.String(destinationAccountID),
		Description: stripe.String(description),
	}
	if idempotencyKey != "" {
		params.SetIdempotencyKey(idempotencyKey)
	}
	t, err := transfer.New(params)
	if err != nil {
		return "", fmt.Errorf("create transfer: %w", err)
	}
	return t.ID, nil
}
