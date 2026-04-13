package models

import "time"

type User struct {
	ID                       string    `json:"id"`
	Username                 string    `json:"username"`
	DisplayName              string    `json:"display_name"`
	Email                    string    `json:"email"`
	PasswordHash             string    `json:"-"`
	AvatarURL                string    `json:"avatar_url"`
	Role                     string    `json:"role"`
	OnboardingComplete       bool      `json:"onboarding_complete"`
	PreferredCategories      []string  `json:"preferred_categories"`
	StripeAccountID          string    `json:"stripe_account_id,omitempty"`
	StripeOnboardingComplete bool      `json:"stripe_onboarding_complete"`
	CreatedAt                time.Time `json:"created_at"`
	UpdatedAt                time.Time `json:"updated_at"`
}

type Wallet struct {
	ID           string    `json:"id"`
	UserID       string    `json:"user_id"`
	BalanceCents int64     `json:"balance_cents"`
	Currency     string    `json:"currency"`
	CreatedAt    time.Time `json:"created_at"`
}

type Channel struct {
	ID           string     `json:"id"`
	CreatorID    string     `json:"creator_id"`
	Title        string     `json:"title"`
	Description  string     `json:"description"`
	Category     string     `json:"category"`
	ThumbnailURL string     `json:"thumbnail_url"`
	StreamURL    string     `json:"stream_url"`
	StreamKey    string     `json:"stream_key,omitempty"`
	Status       string     `json:"status"`
	ViewerCount  int        `json:"viewer_count"`
	SaleType     string     `json:"sale_type"`
	IsPrimary    bool       `json:"is_primary"`
	Badge        string     `json:"badge"`
	ScheduledAt  *time.Time `json:"scheduled_at,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	// Joined fields
	Merchant *Merchant `json:"merchant,omitempty"`
	Products []Product `json:"products,omitempty"`
}

type Merchant struct {
	Name      string `json:"name"`
	AvatarURL string `json:"avatar"`
}

type Product struct {
	ID                  string                `json:"id"`
	ChannelID           string                `json:"channel_id"`
	ShopID              *string               `json:"shop_id,omitempty"`
	Name                string                `json:"name"`
	Description         string                `json:"description"`
	ImageURL            string                `json:"image_url"`
	TaxCode             string                `json:"tax_code,omitempty"`
	PriceCents          int64                 `json:"price_cents"`
	OriginalPrice       *int64                `json:"original_price_cents,omitempty"`
	Inventory           int                   `json:"inventory"`
	SaleType            string                `json:"sale_type"`
	IsPinned            bool                  `json:"is_pinned"`
	AuctionEndAt        *time.Time            `json:"auction_end_at,omitempty"`
	DropAt              *time.Time            `json:"drop_at,omitempty"`
	AuctionStatus       string                `json:"auction_status,omitempty"`
	AuctionReserveCents int64                 `json:"auction_reserve_cents,omitempty"`
	AuctionWinnerID     *string               `json:"auction_winner_id,omitempty"`
	CurrentBidCents     int64                 `json:"current_bid_cents,omitempty"`
	HighestBidderID     *string               `json:"highest_bidder_id,omitempty"`
	BidCount            int                   `json:"bid_count,omitempty"`
	Condition           string                `json:"condition,omitempty"`
	ListingStatus       string                `json:"listing_status,omitempty"`
	Tags                []string              `json:"tags,omitempty"`
	Brand               string                `json:"brand,omitempty"`
	Images              []ProductImage        `json:"images,omitempty"`
	Category            string                `json:"category,omitempty"`
	Subcategory         string                `json:"subcategory,omitempty"`
	ReturnDays          int                   `json:"return_days,omitempty"`
	WarrantyInfo        string                `json:"warranty_info,omitempty"`
	IsDigital           bool                  `json:"is_digital,omitempty"`
	BulletPoints        []string              `json:"bullet_points,omitempty"`
	ReviewCount         int                   `json:"review_count"`
	ReviewAvg           float64               `json:"review_avg"`
	Variants            []ProductVariant      `json:"variants,omitempty"`
	VariantGroups       []ProductVariantGroup `json:"variant_groups,omitempty"`
	Specs               []ProductSpec         `json:"specs,omitempty"`
	Shipping            *ProductShipping      `json:"shipping,omitempty"`
	RelatedProducts     []Product             `json:"related_products,omitempty"`
	Bundles             []ProductBundle       `json:"bundles,omitempty"`
	Reviews             []ProductReview       `json:"reviews,omitempty"`
	CreatedAt           time.Time             `json:"created_at"`
}

type Bid struct {
	ID          string    `json:"id"`
	ProductID   string    `json:"product_id"`
	UserID      string    `json:"user_id"`
	AmountCents int64     `json:"amount_cents"`
	CreatedAt   time.Time `json:"created_at"`
}

type Order struct {
	ID                 string      `json:"id"`
	UserID             string      `json:"user_id"`
	ChannelID          string      `json:"channel_id"`
	SellerID           string      `json:"seller_id,omitempty"`
	Status             string      `json:"status"`
	TotalCents         int64       `json:"total_cents"`
	SubtotalCents      int64       `json:"subtotal_cents,omitempty"`
	ShippingCents      int64       `json:"shipping_cents,omitempty"`
	TaxCents           int64       `json:"tax_cents,omitempty"`
	ShippingAddressID  string      `json:"shipping_address_id,omitempty"`
	ShippingMethod     string      `json:"shipping_method,omitempty"`
	Email              string      `json:"email,omitempty"`
	PlatformFeeCents   int64       `json:"platform_fee_cents,omitempty"`
	StripePaymentID    string      `json:"stripe_payment_id,omitempty"`
	StripeClientSecret string      `json:"stripe_client_secret,omitempty"`
	CouponID           string      `json:"coupon_id,omitempty"`
	DiscountCents      int64       `json:"discount_cents,omitempty"`
	IdempotencyKey     string      `json:"idempotency_key,omitempty"`
	CreatedAt          time.Time   `json:"created_at"`
	Items              []OrderItem `json:"items,omitempty"`
}

type ShippingAddress struct {
	ID           string    `json:"id"`
	UserID       string    `json:"user_id"`
	FullName     string    `json:"full_name"`
	AddressLine1 string    `json:"address_line1"`
	AddressLine2 string    `json:"address_line2,omitempty"`
	City         string    `json:"city"`
	State        string    `json:"state"`
	ZipCode      string    `json:"zip_code"`
	Country      string    `json:"country"`
	Phone        string    `json:"phone,omitempty"`
	IsDefault    bool      `json:"is_default"`
	CreatedAt    time.Time `json:"created_at"`
}

type OrderItem struct {
	ID         string `json:"id"`
	OrderID    string `json:"order_id"`
	ProductID  string `json:"product_id"`
	Quantity   int    `json:"quantity"`
	PriceCents int64  `json:"price_cents"`
}

type CheckoutSession struct {
	ID              string    `json:"id"`
	UserID          string    `json:"user_id"`
	ChannelID       string    `json:"channel_id"`
	Status          string    `json:"status"`
	StripeSessionID string    `json:"stripe_session_id,omitempty"`
	ExpiresAt       time.Time `json:"expires_at"`
	CreatedAt       time.Time `json:"created_at"`
}

type Follow struct {
	UserID    string    `json:"user_id"`
	ChannelID string    `json:"channel_id"`
	CreatedAt time.Time `json:"created_at"`
}

type Event struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	ChannelID string    `json:"channel_id,omitempty"`
	EventType string    `json:"event_type"`
	Payload   string    `json:"payload"`
	CreatedAt time.Time `json:"created_at"`
}

// ── Request / Response types ──

type RegisterRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role,omitempty"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type CheckoutRequest struct {
	ProductID string `json:"product_id"`
	Quantity  int    `json:"quantity"`
	ChannelID string `json:"channel_id"`
}

type Coupon struct {
	ID            string     `json:"id"`
	Code          string     `json:"code"`
	Description   string     `json:"description"`
	DiscountType  string     `json:"discount_type"`  // "percent" or "fixed"
	DiscountValue int64      `json:"discount_value"` // percent (10=10%) or cents (500=$5)
	MinOrderCents int64      `json:"min_order_cents"`
	MaxUses       *int       `json:"max_uses"`
	CurrentUses   int        `json:"current_uses"`
	StartsAt      time.Time  `json:"starts_at"`
	ExpiresAt     *time.Time `json:"expires_at"`
	IsActive      bool       `json:"is_active"`
	CreatedAt     time.Time  `json:"created_at"`
}

type CouponResponse struct {
	Code          string `json:"code"`
	Description   string `json:"description"`
	DiscountType  string `json:"discount_type"`
	DiscountValue int64  `json:"discount_value"`
	DiscountCents int64  `json:"discount_cents"` // actual savings for current cart
	Valid         bool   `json:"valid"`
	Message       string `json:"message,omitempty"`
}

type MarketplaceCheckoutRequest struct {
	Items           []MarketplaceCheckoutItem `json:"items"`
	ShippingAddress ShippingAddressInput      `json:"shipping_address"`
	ShippingMethod  string                    `json:"shipping_method"`
	Email           string                    `json:"email"`
	CouponCode      string                    `json:"coupon_code,omitempty"`
}

type MarketplaceCheckoutItem struct {
	ProductID string `json:"product_id"`
	Quantity  int    `json:"quantity"`
}

type ShippingAddressInput struct {
	FullName     string `json:"full_name"`
	AddressLine1 string `json:"address_line1"`
	AddressLine2 string `json:"address_line2"`
	City         string `json:"city"`
	State        string `json:"state"`
	ZipCode      string `json:"zip_code"`
	Phone        string `json:"phone"`
}

type TaxEstimate struct {
	SubtotalCents int64   `json:"subtotal_cents"`
	ShippingCents int64   `json:"shipping_cents"`
	TaxCents      int64   `json:"tax_cents"`
	TaxRate       float64 `json:"tax_rate"`
	TaxSource     string  `json:"tax_source,omitempty"`
	DiscountCents int64   `json:"discount_cents"`
	TotalCents    int64   `json:"total_cents"`
}

type BidRequest struct {
	ProductID   string `json:"product_id"`
	AmountCents int64  `json:"amount_cents"`
}

type StartAuctionRequest struct {
	ProductID    string `json:"product_id"`
	DurationSecs int    `json:"duration_secs"`
}

// ── Creator types ──

type CreateChannelRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Category    string `json:"category"`
	SaleType    string `json:"sale_type"`
}

type UpdateChannelRequest struct {
	Title        *string `json:"title,omitempty"`
	Description  *string `json:"description,omitempty"`
	Category     *string `json:"category,omitempty"`
	ThumbnailURL *string `json:"thumbnail_url,omitempty"`
	StreamURL    *string `json:"stream_url,omitempty"`
	SaleType     *string `json:"sale_type,omitempty"`
}

type CreateProductRequest struct {
	Name          string  `json:"name"`
	Description   string  `json:"description"`
	ImageURL      string  `json:"image_url"`
	PriceCents    int64   `json:"price_cents"`
	OriginalPrice *int64  `json:"original_price_cents,omitempty"`
	Inventory     int     `json:"inventory"`
	SaleType      string  `json:"sale_type"`
	AuctionEndAt  *string `json:"auction_end_at,omitempty"`
	DropAt        *string `json:"drop_at,omitempty"`
}

type UpdateProductRequest struct {
	Name          *string `json:"name,omitempty"`
	Description   *string `json:"description,omitempty"`
	ImageURL      *string `json:"image_url,omitempty"`
	PriceCents    *int64  `json:"price_cents,omitempty"`
	OriginalPrice *int64  `json:"original_price_cents,omitempty"`
	Inventory     *int    `json:"inventory,omitempty"`
	SaleType      *string `json:"sale_type,omitempty"`
}

type ChannelAnalytics struct {
	ChannelID      string  `json:"channel_id"`
	TotalViewers   int64   `json:"total_viewers"`
	TotalRevenue   int64   `json:"total_revenue_cents"`
	TotalOrders    int     `json:"total_orders"`
	TotalLikes     int     `json:"total_likes"`
	ConversionRate float64 `json:"conversion_rate"`
}

// ── Relay types ──

type RelayEntry struct {
	ID              string    `json:"id"`
	ChannelID       string    `json:"channel_id"`
	TranscriptChunk string    `json:"transcript_chunk"`
	TimestampSec    int       `json:"timestamp_sec"`
	CreatedAt       time.Time `json:"created_at"`
}

type RelayQueryRequest struct {
	Query     string `json:"query"`
	ChannelID string `json:"channel_id"`
}

// ── Marketplace types ──

type Shop struct {
	ID              string    `json:"id"`
	OwnerID         string    `json:"owner_id"`
	Name            string    `json:"name"`
	Slug            string    `json:"slug"`
	Description     string    `json:"description"`
	LogoURL         string    `json:"logo_url"`
	BannerURL       string    `json:"banner_url"`
	ReturnPolicy    string    `json:"return_policy"`
	ShippingFrom    string    `json:"shipping_from"`
	StripeAccountID string    `json:"stripe_account_id,omitempty"`
	IsVerified      bool      `json:"is_verified"`
	Status          string    `json:"status"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
	Products        []Product `json:"products,omitempty"`
}

type Cart struct {
	ID        string     `json:"id"`
	UserID    string     `json:"user_id"`
	Items     []CartItem `json:"items"`
	CreatedAt time.Time  `json:"created_at"`
}

type CartItem struct {
	ID        string    `json:"id"`
	CartID    string    `json:"cart_id"`
	ProductID string    `json:"product_id"`
	Quantity  int       `json:"quantity"`
	AddedAt   time.Time `json:"added_at"`
	Product   *Product  `json:"product,omitempty"`
}

type ProductImage struct {
	ID        string    `json:"id"`
	ProductID string    `json:"product_id"`
	URL       string    `json:"url"`
	Position  int       `json:"position"`
	CreatedAt time.Time `json:"created_at"`
}

type ProductVariantGroup struct {
	ID        string                 `json:"id"`
	ProductID string                 `json:"product_id"`
	Name      string                 `json:"name"`
	Position  int                    `json:"position"`
	Options   []ProductVariantOption `json:"options"`
}

type ProductVariantOption struct {
	ID       string `json:"id"`
	GroupID  string `json:"group_id"`
	Label    string `json:"label"`
	Value    string `json:"value"`
	Position int    `json:"position"`
}

type ProductVariant struct {
	ID         string   `json:"id"`
	ProductID  string   `json:"product_id"`
	SKU        string   `json:"sku,omitempty"`
	PriceCents *int64   `json:"price_cents,omitempty"`
	Inventory  int      `json:"inventory"`
	ImageURL   string   `json:"image_url,omitempty"`
	IsDefault  bool     `json:"is_default"`
	OptionIDs  []string `json:"option_ids,omitempty"`
}

type ProductShipping struct {
	ID               string  `json:"id"`
	ProductID        string  `json:"product_id"`
	WeightOz         float64 `json:"weight_oz,omitempty"`
	LengthIn         float64 `json:"length_in,omitempty"`
	WidthIn          float64 `json:"width_in,omitempty"`
	HeightIn         float64 `json:"height_in,omitempty"`
	ShippingClass    string  `json:"shipping_class"`
	FreeShipping     bool    `json:"free_shipping"`
	FlatRateCents    *int64  `json:"flat_rate_cents,omitempty"`
	ShipsFromCountry string  `json:"ships_from_country"`
	ShipsFromState   string  `json:"ships_from_state,omitempty"`
	HandlingDays     int     `json:"handling_days"`
	EstDaysMin       int     `json:"estimated_days_min"`
	EstDaysMax       int     `json:"estimated_days_max"`
}

type ProductReview struct {
	ID               string   `json:"id"`
	ProductID        string   `json:"product_id"`
	UserID           *string  `json:"user_id,omitempty"`
	UserName         string   `json:"user_name,omitempty"`
	Rating           int      `json:"rating"`
	Title            string   `json:"title"`
	Body             string   `json:"body"`
	VerifiedPurchase bool     `json:"verified_purchase"`
	HelpfulCount     int      `json:"helpful_count"`
	Images           []string `json:"images,omitempty"`
	CreatedAt        string   `json:"created_at"`
}

type ProductSpec struct {
	ID        string `json:"id"`
	ProductID string `json:"product_id"`
	Key       string `json:"key"`
	Value     string `json:"value"`
	Position  int    `json:"position"`
}

type ProductBundle struct {
	ID            string              `json:"id"`
	Name          string              `json:"name"`
	Description   string              `json:"description"`
	DiscountPct   float64             `json:"discount_pct"`
	DiscountCents int64               `json:"discount_cents"`
	IsActive      bool                `json:"is_active"`
	Items         []ProductBundleItem `json:"items"`
}

type ProductBundleItem struct {
	ID        string   `json:"id"`
	BundleID  string   `json:"bundle_id"`
	ProductID string   `json:"product_id"`
	Product   *Product `json:"product,omitempty"`
	Quantity  int      `json:"quantity"`
	Position  int      `json:"position"`
}

type CreateShopRequest struct {
	Name         string `json:"name"`
	Slug         string `json:"slug"`
	Description  string `json:"description"`
	LogoURL      string `json:"logo_url"`
	BannerURL    string `json:"banner_url"`
	ShippingFrom string `json:"shipping_from"`
}

type UpdateShopRequest struct {
	Name         *string `json:"name,omitempty"`
	Description  *string `json:"description,omitempty"`
	LogoURL      *string `json:"logo_url,omitempty"`
	BannerURL    *string `json:"banner_url,omitempty"`
	ReturnPolicy *string `json:"return_policy,omitempty"`
	ShippingFrom *string `json:"shipping_from,omitempty"`
}

type MarketplaceQuery struct {
	Q         string `query:"q"`
	Category  string `query:"category"`
	Condition string `query:"condition"`
	MinPrice  int64  `query:"min_price"`
	MaxPrice  int64  `query:"max_price"`
	Sort      string `query:"sort"`
	Limit     int    `query:"limit"`
	Offset    int    `query:"offset"`
}

type CategoryCount struct {
	Name  string `json:"name"`
	Count int    `json:"count"`
	Icon  string `json:"icon"`
}

type MarketplaceGateway struct {
	Categories   []CategoryCount `json:"categories"`
	LiveChannels []Channel       `json:"live_channels"`
	Trending     []Product       `json:"trending"`
	Deals        []Product       `json:"deals"`
	NewArrivals  []Product       `json:"new_arrivals"`
	Drops        []Product       `json:"drops"`
	Auctions     []Product       `json:"auctions"`
	FeaturedLive *Channel        `json:"featured_live,omitempty"`
	Billboards   []Billboard     `json:"billboards"`
}

// ── Billboards ──

type Billboard struct {
	ID            string     `json:"id"`
	BillboardType string     `json:"billboard_type"`
	TargetType    string     `json:"target_type"`
	TargetID      string     `json:"target_id,omitempty"`
	SponsorID     string     `json:"sponsor_id,omitempty"`
	Title         string     `json:"title"`
	Subtitle      string     `json:"subtitle"`
	Description   string     `json:"description"`
	ImageURL      string     `json:"image_url"`
	CTALabel      string     `json:"cta_label"`
	BadgeText     string     `json:"badge_text"`
	BadgeColor    string     `json:"badge_color"`
	Priority      int        `json:"priority"`
	StartsAt      time.Time  `json:"starts_at"`
	EndsAt        *time.Time `json:"ends_at,omitempty"`
	Status        string     `json:"status"`
	Impressions   int64      `json:"impressions"`
	Clicks        int64      `json:"clicks"`
	BudgetCents   int64      `json:"budget_cents"`
	SpentCents    int64      `json:"spent_cents"`
	CPMCents      int64      `json:"cpm_cents"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	// Joined data for frontend rendering
	TargetChannel *Channel `json:"target_channel,omitempty"`
	TargetProduct *Product `json:"target_product,omitempty"`
}

type CreateShopProductRequest struct {
	Name          string   `json:"name"`
	Description   string   `json:"description"`
	ImageURL      string   `json:"image_url"`
	PriceCents    int64    `json:"price_cents"`
	OriginalPrice *int64   `json:"original_price_cents,omitempty"`
	Inventory     int      `json:"inventory"`
	SaleType      string   `json:"sale_type"`
	Condition     string   `json:"condition"`
	Brand         string   `json:"brand"`
	Tags          []string `json:"tags"`
}

type AddCartItemRequest struct {
	ProductID string `json:"product_id"`
	Quantity  int    `json:"quantity"`
}

type UpdateCartItemRequest struct {
	Quantity int `json:"quantity"`
}

type RelayMatch struct {
	TimestampSec    int     `json:"timestamp_sec"`
	TranscriptChunk string  `json:"transcript_chunk"`
	Confidence      float64 `json:"confidence"`
	FormattedTime   string  `json:"formatted_time"`
}

type RelayQueryResponse struct {
	ChannelID string       `json:"channel_id"`
	Query     string       `json:"query"`
	Matches   []RelayMatch `json:"matches"`
}

// ── Seller Programs ──

type SellerProgram struct {
	ID               string     `json:"id"`
	UserID           string     `json:"user_id"`
	ProgramType      string     `json:"program_type"`
	Status           string     `json:"status"`
	Tier             string     `json:"tier"`
	AgreedAt         *time.Time `json:"agreed_at,omitempty"`
	AgreementVersion string     `json:"agreement_version"`
	ApplicationNote  string     `json:"application_note,omitempty"`
	RejectionReason  string     `json:"rejection_reason,omitempty"`
	ApprovedAt       *time.Time `json:"approved_at,omitempty"`
	ActivatedAt      *time.Time `json:"activated_at,omitempty"`
	SuspendedAt      *time.Time `json:"suspended_at,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

type EnrollProgramRequest struct {
	ProgramType     string `json:"program_type"`
	ApplicationNote string `json:"application_note"`
	AgreedToTerms   bool   `json:"agreed_to_terms"`
}

type CommissionRule struct {
	ID              string  `json:"id"`
	ProgramType     string  `json:"program_type"`
	Tier            string  `json:"tier"`
	CommissionPct   float64 `json:"commission_pct"`
	ListingFeeCents int64   `json:"listing_fee_cents"`
	IsActive        bool    `json:"is_active"`
}

type Payout struct {
	ID               string     `json:"id"`
	UserID           string     `json:"user_id"`
	ProgramType      string     `json:"program_type"`
	OrderID          string     `json:"order_id"`
	GrossCents       int64      `json:"gross_cents"`
	CommissionCents  int64      `json:"commission_cents"`
	NetCents         int64      `json:"net_cents"`
	PayoutStatus     string     `json:"payout_status"`
	StripeTransferID string     `json:"stripe_transfer_id,omitempty"`
	PaidAt           *time.Time `json:"paid_at,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
}

type SellerDashboard struct {
	Program           SellerProgram `json:"program"`
	TotalRevenueCents int64         `json:"total_revenue_cents"`
	TotalOrders       int           `json:"total_orders"`
	PendingPayouts    int64         `json:"pending_payouts_cents"`
	PaidPayouts       int64         `json:"paid_payouts_cents"`
	CommissionPct     float64       `json:"commission_pct"`
	CurrentTier       string        `json:"current_tier"`
	// CSP-specific
	TotalStreamHours float64 `json:"total_stream_hours,omitempty"`
	TotalViewers     int64   `json:"total_viewers,omitempty"`
	// MSP-specific
	ActiveListings int `json:"active_listings,omitempty"`
	PendingOrders  int `json:"pending_orders,omitempty"`
	ShippedOrders  int `json:"shipped_orders,omitempty"`
}

type FulfillmentRecord struct {
	ID              string     `json:"id"`
	OrderID         string     `json:"order_id"`
	SellerID        string     `json:"seller_id"`
	FulfillmentType string     `json:"fulfillment_type"`
	TrackingNumber  string     `json:"tracking_number,omitempty"`
	Carrier         string     `json:"carrier,omitempty"`
	ShippedAt       *time.Time `json:"shipped_at,omitempty"`
	DeliveredAt     *time.Time `json:"delivered_at,omitempty"`
	Status          string     `json:"status"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type UpdateFulfillmentRequest struct {
	TrackingNumber *string `json:"tracking_number,omitempty"`
	Carrier        *string `json:"carrier,omitempty"`
	Status         *string `json:"status,omitempty"`
}

type SellerOrderView struct {
	Order
	Items           []OrderItem        `json:"items"`
	Fulfillment     *FulfillmentRecord `json:"fulfillment,omitempty"`
	BuyerEmail      string             `json:"buyer_email"`
	ShippingAddress *ShippingAddress   `json:"shipping_address,omitempty"`
}

type SellerAnalyticsDay struct {
	Date           string  `json:"date"`
	RevenueCents   int64   `json:"revenue_cents"`
	OrdersCount    int     `json:"orders_count"`
	UnitsSold      int     `json:"units_sold"`
	Views          int     `json:"views"`
	ConversionRate float64 `json:"conversion_rate"`
}

// ── M10: Payout transfer join model ───────────────────────────

type PayoutWithAccount struct {
	PayoutID        string `json:"payout_id"`
	UserID          string `json:"user_id"`
	ProgramType     string `json:"program_type"`
	OrderID         string `json:"order_id"`
	NetCents        int64  `json:"net_cents"`
	StripeAccountID string `json:"stripe_account_id"`
	Email           string `json:"email"`
}

// ── M11: Password Reset ──────────────────────────────────────

type PasswordResetRequest struct {
	Email string `json:"email"`
}

type PasswordResetConfirm struct {
	Token       string `json:"token"`
	NewPassword string `json:"new_password"`
}

// ── M12: Uploads ──────────────────────────────────────────────

type Upload struct {
	ID          string    `json:"id"`
	UserID      string    `json:"user_id"`
	EntityType  string    `json:"entity_type"` // product, channel, user, shop
	EntityID    string    `json:"entity_id"`
	Filename    string    `json:"filename"`
	ContentType string    `json:"content_type"`
	SizeBytes   int64     `json:"size_bytes"`
	StorageKey  string    `json:"storage_key"`
	URL         string    `json:"url"`
	Status      string    `json:"status"` // pending, completed
	CreatedAt   time.Time `json:"created_at"`
}

type PresignRequest struct {
	EntityType  string `json:"entity_type"`
	EntityID    string `json:"entity_id"`
	Filename    string `json:"filename"`
	ContentType string `json:"content_type"`
}

type PresignResponse struct {
	UploadID  string `json:"upload_id"`
	UploadURL string `json:"upload_url"`
	PublicURL string `json:"public_url"`
}

// ── Videos / VOD ─────────────────────────────────────────────

type Video struct {
	ID            string    `json:"id"`
	ChannelID     string    `json:"channel_id"`
	CreatorID     string    `json:"creator_id"`
	Title         string    `json:"title"`
	Description   string    `json:"description"`
	VideoURL      string    `json:"video_url"`
	ThumbnailURL  string    `json:"thumbnail_url"`
	DurationSec   int       `json:"duration_sec"`
	FileSizeBytes int64     `json:"file_size_bytes"`
	Status        string    `json:"status"` // processing, ready, failed
	ViewCount     int       `json:"view_count"`
	LikeCount     int       `json:"like_count"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
	// Joined fields
	Merchant     *Merchant `json:"merchant,omitempty"`
	ChannelTitle string    `json:"channel_title,omitempty"`
	Products     []Product `json:"products,omitempty"`
}

type CreateVideoRequest struct {
	Title         string   `json:"title"`
	Description   string   `json:"description"`
	VideoURL      string   `json:"video_url"`
	ThumbnailURL  string   `json:"thumbnail_url"`
	DurationSec   int      `json:"duration_sec"`
	FileSizeBytes int64    `json:"file_size_bytes"`
	ProductIDs    []string `json:"product_ids,omitempty"`
}

type UpdateVideoRequest struct {
	Title        *string `json:"title,omitempty"`
	Description  *string `json:"description,omitempty"`
	ThumbnailURL *string `json:"thumbnail_url,omitempty"`
	Status       *string `json:"status,omitempty"`
}

type FeedItem struct {
	ItemType string   `json:"item_type"` // "channel" or "video"
	Channel  *Channel `json:"channel,omitempty"`
	Video    *Video   `json:"video,omitempty"`
}

type CreatorProfileResponse struct {
	User     User      `json:"user"`
	Channels []Channel `json:"channels"`
	Videos   []Video   `json:"videos"`
	Shop     *Shop     `json:"shop,omitempty"`
}

// ── M14: Admin ────────────────────────────────────────────────

type AdminStats struct {
	TotalUsers          int   `json:"total_users"`
	TotalOrders         int   `json:"total_orders"`
	TotalRevenueCents   int64 `json:"total_revenue_cents"`
	LiveChannels        int   `json:"live_channels"`
	PendingPrograms     int   `json:"pending_programs"`
	ActiveProducts      int   `json:"active_products"`
	PendingPayoutsCents int64 `json:"pending_payouts_cents"`
}

type AdminUpdateProgramRequest struct {
	Status string `json:"status"` // approved, rejected, active, suspended, closed
	Reason string `json:"reason,omitempty"`
}
