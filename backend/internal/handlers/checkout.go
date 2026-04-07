package handlers

import (
	"fmt"
	"log"
	"math"
	"os"
	"strings"
	"time"

	"greggie/backend/internal/middleware"
	"greggie/backend/internal/models"
	"greggie/backend/internal/payments"
	"greggie/backend/internal/store"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type CheckoutHandler struct {
	Store *store.Store
}

// Shipping rates in cents
var shippingRates = map[string]int64{
	"standard":  599,  // $5.99
	"express":   1299, // $12.99
	"overnight": 2499, // $24.99
}

const fallbackTaxRate = 0.0825

func (h *CheckoutHandler) InitCheckout(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	var req models.CheckoutRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if req.ProductID == "" || req.Quantity <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "product_id and quantity required"})
	}

	product, err := h.Store.GetProductByID(req.ProductID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "product not found"})
	}

	totalCents := product.PriceCents * int64(req.Quantity)
	idempotencyKey := uuid.New().String()

	// Look up seller's Stripe Connect account
	sellerID, stripeAccountID, _ := h.Store.GetSellerForProduct(req.ProductID)
	platformFeeCents := int64(0)
	if stripeAccountID != "" {
		platformFeeCents = totalCents / 10 // 10% platform fee
	}

	order := &models.Order{
		UserID:           userID,
		ChannelID:        req.ChannelID,
		SellerID:         sellerID,
		Status:           "pending",
		TotalCents:       totalCents,
		PlatformFeeCents: platformFeeCents,
		IdempotencyKey:   idempotencyKey,
		Items: []models.OrderItem{
			{
				ProductID:  req.ProductID,
				Quantity:   req.Quantity,
				PriceCents: product.PriceCents,
			},
		},
	}

	// Atomic: locks inventory rows, validates, decrements, and creates order in one transaction
	if err := h.Store.CheckoutAtomic(order); err != nil {
		if contains(err.Error(), "insufficient inventory") {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "checkout failed"})
	}

	// Create Stripe PaymentIntent if Stripe is configured
	if payments.Enabled() {
		metadata := map[string]string{
			"order_id":   order.ID,
			"user_id":    userID,
			"channel_id": req.ChannelID,
		}
		piID, clientSecret, err := payments.CreatePaymentIntent(
			totalCents, "usd", stripeAccountID, platformFeeCents, idempotencyKey, metadata,
		)
		if err != nil {
			// Rollback: restore inventory and fail the order
			_ = h.Store.RestoreInventory(order.ID)
			_ = h.Store.UpdateOrderStatus(order.ID, "failed")
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "payment setup failed"})
		}

		order.StripePaymentID = piID
		order.StripeClientSecret = clientSecret
		_ = h.Store.UpdateOrderStripePaymentID(order.ID, piID, clientSecret)
	} else if err := h.Store.EnsureSellerArtifactsForOrder(order.ID); err != nil {
		log.Printf("checkout: failed to create seller artifacts for order %s: %v", order.ID, err)
	}

	return c.Status(fiber.StatusCreated).JSON(order)
}

// MarketplaceCheckout handles multi-item checkout with shipping address, method, and tax.
// Works for both authenticated users and guests.
func (h *CheckoutHandler) MarketplaceCheckout(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c) // empty string for guests

	var req models.MarketplaceCheckoutRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	// Validate items
	if len(req.Items) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "cart is empty"})
	}
	for _, item := range req.Items {
		if item.ProductID == "" || item.Quantity <= 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "each item needs product_id and quantity > 0"})
		}
	}

	// Validate email (required for all users — guests need it for order tracking)
	if req.Email == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "email is required"})
	}

	// Validate shipping address
	addr := req.ShippingAddress
	if addr.FullName == "" || addr.AddressLine1 == "" || addr.City == "" || addr.State == "" || addr.ZipCode == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "shipping address is incomplete"})
	}

	// Validate shipping method
	shippingCents, ok := shippingRates[req.ShippingMethod]
	if !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid shipping method"})
	}

	// Save shipping address only for logged-in users
	var shippingAddrID string
	if userID != "" {
		shippingAddr := &models.ShippingAddress{
			UserID:       userID,
			FullName:     addr.FullName,
			AddressLine1: addr.AddressLine1,
			AddressLine2: addr.AddressLine2,
			City:         addr.City,
			State:        addr.State,
			ZipCode:      addr.ZipCode,
			Country:      "US",
			Phone:        addr.Phone,
			IsDefault:    true,
		}
		if err := h.Store.CreateShippingAddress(shippingAddr); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to save shipping address"})
		}
		shippingAddrID = shippingAddr.ID
	}

	// Calculate subtotal by looking up each product
	var subtotalCents int64
	var orderItems []models.OrderItem
	var taxLineItems []payments.TaxLineItem
	for _, item := range req.Items {
		product, err := h.Store.GetProductByID(item.ProductID)
		if err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "product " + item.ProductID + " not found"})
		}
		lineTotal := product.PriceCents * int64(item.Quantity)
		subtotalCents += lineTotal
		orderItems = append(orderItems, models.OrderItem{
			ProductID:  item.ProductID,
			Quantity:   item.Quantity,
			PriceCents: product.PriceCents,
		})
		taxLineItems = append(taxLineItems, payments.TaxLineItem{
			Reference:   item.ProductID,
			AmountCents: lineTotal,
			Quantity:    int64(item.Quantity),
			TaxCode:     product.TaxCode,
		})
	}

	// Apply coupon if provided
	var couponID string
	var discountCents int64
	if req.CouponCode != "" {
		coupon, err := h.Store.GetCouponByCode(req.CouponCode)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid coupon code"})
		}
		msg, ok := validateCoupon(coupon, subtotalCents)
		if !ok {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": msg})
		}
		discountCents = calcDiscount(coupon, subtotalCents)
		couponID = coupon.ID
	}

	taxCents, taxRate, taxSource, taxCalculationID, err := h.calculateMarketplaceTax(addr, shippingCents, discountCents, taxLineItems)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to calculate tax"})
	}
	totalCents := subtotalCents - discountCents + shippingCents + taxCents
	if totalCents < 0 {
		totalCents = 0
	}

	idempotencyKey := uuid.New().String()

	order := &models.Order{
		UserID:            userID,
		Status:            "processing",
		SubtotalCents:     subtotalCents,
		ShippingCents:     shippingCents,
		TaxCents:          taxCents,
		TotalCents:        totalCents,
		ShippingAddressID: shippingAddrID,
		ShippingMethod:    req.ShippingMethod,
		Email:             req.Email,
		CouponID:          couponID,
		DiscountCents:     discountCents,
		PlatformFeeCents:  totalCents / 10,
		IdempotencyKey:    idempotencyKey,
		Items:             orderItems,
	}

	if err := h.Store.MarketplaceCheckoutAtomic(order); err != nil {
		if contains(err.Error(), "insufficient inventory") {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "checkout failed"})
	}

	// Increment coupon usage counter
	if couponID != "" {
		_ = h.Store.IncrementCouponUses(couponID)
	}

	if taxSource == "stripe_tax" && taxCalculationID != "" {
		if _, err := payments.CreateTaxTransactionFromCalculation(taxCalculationID, order.ID, map[string]string{
			"order_id": order.ID,
			"tax_rate": fmt.Sprintf("%.6f", taxRate),
		}); err != nil {
			log.Printf("checkout: failed to create Stripe tax transaction for order %s: %v", order.ID, err)
		}
	}
	if err := h.Store.EnsureSellerArtifactsForOrder(order.ID); err != nil {
		log.Printf("checkout: failed to create seller artifacts for marketplace order %s: %v", order.ID, err)
	}

	return c.Status(fiber.StatusCreated).JSON(order)
}

// EstimateTax returns a tax/shipping estimate for the cart
func (h *CheckoutHandler) EstimateTax(c *fiber.Ctx) error {
	var req struct {
		Items           []models.MarketplaceCheckoutItem `json:"items"`
		ShippingAddress models.ShippingAddressInput      `json:"shipping_address"`
		ShippingMethod  string                           `json:"shipping_method"`
		CouponCode      string                           `json:"coupon_code"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	var subtotalCents int64
	var taxLineItems []payments.TaxLineItem
	for _, item := range req.Items {
		product, err := h.Store.GetProductByID(item.ProductID)
		if err != nil {
			continue
		}
		lineTotal := product.PriceCents * int64(item.Quantity)
		subtotalCents += lineTotal
		taxLineItems = append(taxLineItems, payments.TaxLineItem{
			Reference:   item.ProductID,
			AmountCents: lineTotal,
			Quantity:    int64(item.Quantity),
			TaxCode:     product.TaxCode,
		})
	}

	shippingCents := shippingRates["standard"]
	if rate, ok := shippingRates[req.ShippingMethod]; ok {
		shippingCents = rate
	}

	var discountCents int64
	if req.CouponCode != "" {
		coupon, err := h.Store.GetCouponByCode(req.CouponCode)
		if err == nil {
			if _, ok := validateCoupon(coupon, subtotalCents); ok {
				discountCents = calcDiscount(coupon, subtotalCents)
			}
		}
	}

	taxCents, taxRate, taxSource, _, err := h.calculateMarketplaceTax(req.ShippingAddress, shippingCents, discountCents, taxLineItems)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to calculate tax"})
	}
	totalCents := subtotalCents - discountCents + shippingCents + taxCents
	if totalCents < 0 {
		totalCents = 0
	}

	return c.JSON(models.TaxEstimate{
		SubtotalCents: subtotalCents,
		ShippingCents: shippingCents,
		TaxCents:      taxCents,
		TaxRate:       taxRate,
		TaxSource:     taxSource,
		DiscountCents: discountCents,
		TotalCents:    totalCents,
	})
}

// ValidateCoupon checks a coupon code and returns discount details
func (h *CheckoutHandler) ValidateCoupon(c *fiber.Ctx) error {
	var req struct {
		Code          string `json:"code"`
		SubtotalCents int64  `json:"subtotal_cents"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if req.Code == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "coupon code required"})
	}

	coupon, err := h.Store.GetCouponByCode(req.Code)
	if err != nil {
		return c.JSON(models.CouponResponse{
			Code:    req.Code,
			Valid:   false,
			Message: "Coupon code not found.",
		})
	}

	msg, ok := validateCoupon(coupon, req.SubtotalCents)
	if !ok {
		return c.JSON(models.CouponResponse{
			Code:    coupon.Code,
			Valid:   false,
			Message: msg,
		})
	}

	discount := calcDiscount(coupon, req.SubtotalCents)
	return c.JSON(models.CouponResponse{
		Code:          coupon.Code,
		Description:   coupon.Description,
		DiscountType:  coupon.DiscountType,
		DiscountValue: coupon.DiscountValue,
		DiscountCents: discount,
		Valid:         true,
	})
}

// GetShippingAddresses returns saved addresses for the current user
func (h *CheckoutHandler) GetShippingAddresses(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	addrs, err := h.Store.GetShippingAddresses(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch addresses"})
	}
	if addrs == nil {
		addrs = []models.ShippingAddress{}
	}
	return c.JSON(addrs)
}

// ── Coupon helpers ──

func validateCoupon(coupon *models.Coupon, subtotalCents int64) (string, bool) {
	if !coupon.IsActive {
		return "This coupon is no longer active.", false
	}
	now := time.Now()
	if now.Before(coupon.StartsAt) {
		return "This coupon is not yet valid.", false
	}
	if coupon.ExpiresAt != nil && now.After(*coupon.ExpiresAt) {
		return "This coupon has expired.", false
	}
	if coupon.MaxUses != nil && coupon.CurrentUses >= *coupon.MaxUses {
		return "This coupon has reached its usage limit.", false
	}
	if subtotalCents < coupon.MinOrderCents {
		minDollars := float64(coupon.MinOrderCents) / 100.0
		return fmt.Sprintf("Minimum order of $%.2f required for this coupon.", minDollars), false
	}
	return "", true
}

func calcDiscount(coupon *models.Coupon, subtotalCents int64) int64 {
	switch coupon.DiscountType {
	case "percent":
		return int64(math.Round(float64(subtotalCents) * float64(coupon.DiscountValue) / 100.0))
	case "fixed":
		if coupon.DiscountValue > subtotalCents {
			return subtotalCents
		}
		return coupon.DiscountValue
	default:
		return 0
	}
}

func (h *CheckoutHandler) calculateMarketplaceTax(addr models.ShippingAddressInput, shippingCents, discountCents int64, items []payments.TaxLineItem) (int64, float64, string, string, error) {
	adjustedItems := prorateDiscountAcrossLineItems(items, discountCents)
	if payments.Enabled() && isTaxAddressComplete(addr) {
		result, err := payments.CalculateTax("usd", payments.TaxAddress{
			Line1:      addr.AddressLine1,
			City:       addr.City,
			State:      addr.State,
			PostalCode: addr.ZipCode,
			Country:    "US",
		}, shippingCents, adjustedItems)
		if err == nil {
			return result.TaxCents, result.TaxRate, "stripe_tax", result.CalculationID, nil
		}
		if os.Getenv("ENVIRONMENT") != "dev" && os.Getenv("ENVIRONMENT") != "test" {
			return 0, 0, "", "", err
		}
		log.Printf("checkout: Stripe Tax unavailable, falling back to static estimate: %v", err)
	}

	taxableAmount := int64(0)
	for _, item := range adjustedItems {
		taxableAmount += item.AmountCents
	}
	if taxableAmount < 0 {
		taxableAmount = 0
	}
	fallback := int64(math.Round(float64(taxableAmount) * fallbackTaxRate))
	return fallback, fallbackTaxRate, "fallback", "", nil
}

func prorateDiscountAcrossLineItems(items []payments.TaxLineItem, discountCents int64) []payments.TaxLineItem {
	adjusted := make([]payments.TaxLineItem, len(items))
	copy(adjusted, items)
	if discountCents <= 0 || len(adjusted) == 0 {
		return adjusted
	}

	var subtotal int64
	for _, item := range adjusted {
		subtotal += item.AmountCents
	}
	if subtotal <= 0 {
		return adjusted
	}

	remainingDiscount := discountCents
	for index := range adjusted {
		share := int64(0)
		if index == len(adjusted)-1 {
			share = remainingDiscount
		} else {
			share = int64(math.Round(float64(adjusted[index].AmountCents) * float64(discountCents) / float64(subtotal)))
			if share > remainingDiscount {
				share = remainingDiscount
			}
		}
		if share > adjusted[index].AmountCents {
			share = adjusted[index].AmountCents
		}
		adjusted[index].AmountCents -= share
		remainingDiscount -= share
	}

	return adjusted
}

func isTaxAddressComplete(addr models.ShippingAddressInput) bool {
	return strings.TrimSpace(addr.AddressLine1) != "" &&
		strings.TrimSpace(addr.City) != "" &&
		strings.TrimSpace(addr.State) != "" &&
		strings.TrimSpace(addr.ZipCode) != ""
}

func contains(s, substr string) bool {
	return strings.Contains(s, substr)
}
