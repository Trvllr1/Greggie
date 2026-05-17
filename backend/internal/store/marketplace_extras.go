package store

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"math"
	"regexp"
	"strings"
	"time"

	"greggie/backend/internal/models"

	"github.com/lib/pq"
)

// ============================================================================
// Marketplace simplification (migration 022) — auto-seller, recent feed,
// saved products, location-aware queries.
// ============================================================================

var slugCleanRe = regexp.MustCompile(`[^a-z0-9]+`)

func slugify(s string) string {
	out := strings.ToLower(strings.TrimSpace(s))
	out = slugCleanRe.ReplaceAllString(out, "-")
	out = strings.Trim(out, "-")
	if out == "" {
		out = "shop"
	}
	if len(out) > 40 {
		out = out[:40]
	}
	return out
}

func randomSuffix() string {
	b := make([]byte, 3)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// EnsureSellerArtifactsForListing creates an MSP seller_programs row + a shop
// for the user if either is missing. Idempotent. Auto-approves (status=active,
// tier=new) so the FB-Marketplace-style "list immediately" flow works.
//
// Returns the shop (existing or newly created) so callers can use shop.ID.
func (s *Store) EnsureSellerArtifactsForListing(userID string) (*models.Shop, error) {
	// 1. Ensure MSP program row.
	if existing, _ := s.GetSellerProgram(userID, "msp"); existing == nil {
		now := time.Now()
		sp := &models.SellerProgram{
			UserID:           userID,
			ProgramType:      "msp",
			Status:           "active",
			Tier:             "new",
			AgreedAt:         &now,
			AgreementVersion: "1.0-implicit",
			ApplicationNote:  "auto-created on first listing",
		}
		// Match CreateSellerProgram signature but explicitly stamp approved_at +
		// activated_at so dashboards reflect the lifecycle properly.
		err := s.PG.QueryRow(
			`INSERT INTO seller_programs
			   (user_id, program_type, status, tier, agreed_at, agreement_version,
			    application_note, approved_at, activated_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $5, $5)
			 ON CONFLICT (user_id, program_type) DO NOTHING
			 RETURNING id, created_at, updated_at`,
			sp.UserID, sp.ProgramType, sp.Status, sp.Tier, sp.AgreedAt,
			sp.AgreementVersion, sp.ApplicationNote,
		).Scan(&sp.ID, &sp.CreatedAt, &sp.UpdatedAt)
		if err != nil && err != sql.ErrNoRows {
			// Conflict means a row was created concurrently — fine.
			if !strings.Contains(err.Error(), "duplicate") {
				return nil, fmt.Errorf("ensure msp: %w", err)
			}
		}

		// Upgrade buyer → seller (best effort).
		if u, _ := s.GetUserByID(userID); u != nil && u.Role == "buyer" {
			_ = s.UpgradeUserRole(userID, "seller")
		}
	}

	// 2. Ensure shop.
	if existing, _ := s.GetShopByOwner(userID); existing != nil {
		return existing, nil
	}

	user, err := s.GetUserByID(userID)
	if err != nil {
		return nil, fmt.Errorf("ensure shop: load user: %w", err)
	}

	base := slugify(user.Username)
	if base == "" || base == "shop" {
		base = slugify(user.Email)
	}
	slug := fmt.Sprintf("%s-%s", base, randomSuffix())
	name := user.Username + "'s shop"
	if user.Username == "" {
		name = "My shop"
	}

	shop := &models.Shop{
		OwnerID:         userID,
		Name:            name,
		Slug:            slug,
		Description:     "",
		ShippingFrom:    "",
		StripeAccountID: user.StripeAccountID,
		Status:          "active",
	}
	// CreateShop scans id + created_at; retry once on slug collision.
	if err := s.CreateShop(shop); err != nil {
		if strings.Contains(err.Error(), "shops_slug_key") {
			shop.Slug = fmt.Sprintf("%s-%s", base, randomSuffix())
			if err := s.CreateShop(shop); err != nil {
				return nil, fmt.Errorf("create shop (retry): %w", err)
			}
		} else {
			return nil, fmt.Errorf("create shop: %w", err)
		}
	}
	return shop, nil
}

// ----------------------------------------------------------------------------
// Recent feed + Near-me bounding-box filter
// ----------------------------------------------------------------------------

// RecentProductsQuery filters the "Just Posted" chronological feed.
//
// When Lat/Lng/RadiusKm are all > 0, results are limited to listings within a
// rough bounding box around the point. We use a degree approximation (no
// PostGIS for MVP):  1 deg lat ≈ 111 km;  1 deg lng ≈ 111 km * cos(lat).
type RecentProductsQuery struct {
	Limit    int
	Offset   int
	Category string
	Lat      float64
	Lng      float64
	RadiusKm float64
}

func (s *Store) GetRecentProducts(q RecentProductsQuery) ([]models.Product, error) {
	where := []string{"listing_status = 'active'"}
	args := []interface{}{}
	idx := 1

	if q.Category != "" {
		where = append(where, fmt.Sprintf("category = $%d", idx))
		args = append(args, q.Category)
		idx++
	}

	// Bounding-box geo filter (cheap, no PostGIS).
	if q.RadiusKm > 0 && (q.Lat != 0 || q.Lng != 0) {
		latDelta := q.RadiusKm / 111.0
		// cos(lat) — at lat=0 this is 1; clamp to avoid divide-by-zero near poles.
		cosLat := math.Cos(q.Lat * math.Pi / 180.0)
		if cosLat < 0.01 {
			cosLat = 0.01
		}
		lngDelta := q.RadiusKm / (111.0 * cosLat)

		where = append(where,
			fmt.Sprintf("location_lat IS NOT NULL AND location_lat BETWEEN $%d AND $%d", idx, idx+1),
			fmt.Sprintf("location_lng BETWEEN $%d AND $%d", idx+2, idx+3),
		)
		args = append(args, q.Lat-latDelta, q.Lat+latDelta, q.Lng-lngDelta, q.Lng+lngDelta)
		idx += 4
	}

	limit := q.Limit
	if limit <= 0 || limit > 100 {
		limit = 40
	}
	offset := q.Offset
	if offset < 0 {
		offset = 0
	}

	query := fmt.Sprintf(
		`SELECT id, COALESCE(channel_id::text,''), COALESCE(shop_id::text,''),
		        name, description, image_url, price_cents, original_price_cents,
		        inventory, sale_type, COALESCE(condition,'new'), COALESCE(brand,''),
		        COALESCE(category,''), COALESCE(location_zip,''),
		        location_lat, location_lng, created_at
		 FROM products
		 WHERE %s
		 ORDER BY created_at DESC
		 LIMIT %d OFFSET %d`,
		strings.Join(where, " AND "), limit, offset,
	)

	rows, err := s.PG.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	products := []models.Product{}
	for rows.Next() {
		var p models.Product
		var origPrice sql.NullInt64
		var shopID, channelID sql.NullString
		var lat, lng sql.NullFloat64
		if err := rows.Scan(
			&p.ID, &channelID, &shopID,
			&p.Name, &p.Description, &p.ImageURL, &p.PriceCents, &origPrice,
			&p.Inventory, &p.SaleType, &p.Condition, &p.Brand,
			&p.Category, &p.LocationZip,
			&lat, &lng, &p.CreatedAt,
		); err != nil {
			return nil, err
		}
		if origPrice.Valid {
			p.OriginalPrice = &origPrice.Int64
		}
		if shopID.Valid {
			p.ShopID = &shopID.String
		}
		if channelID.Valid {
			p.ChannelID = channelID.String
		}
		if lat.Valid {
			p.LocationLat = &lat.Float64
		}
		if lng.Valid {
			p.LocationLng = &lng.Float64
		}
		products = append(products, p)
	}
	return products, nil
}

// ----------------------------------------------------------------------------
// Saved products (wishlist)
// ----------------------------------------------------------------------------

func (s *Store) SaveProduct(userID, productID string) error {
	_, err := s.PG.Exec(
		`INSERT INTO saved_products (user_id, product_id)
		 VALUES ($1, $2)
		 ON CONFLICT (user_id, product_id) DO NOTHING`,
		userID, productID,
	)
	return err
}

func (s *Store) UnsaveProduct(userID, productID string) error {
	_, err := s.PG.Exec(
		`DELETE FROM saved_products WHERE user_id = $1 AND product_id = $2`,
		userID, productID,
	)
	return err
}

// IsProductSaved reports whether a single product is saved by the user.
func (s *Store) IsProductSaved(userID, productID string) (bool, error) {
	var exists bool
	err := s.PG.QueryRow(
		`SELECT EXISTS(SELECT 1 FROM saved_products WHERE user_id = $1 AND product_id = $2)`,
		userID, productID,
	).Scan(&exists)
	return exists, err
}

// GetSavedProducts returns the user's saved products joined with product rows.
func (s *Store) GetSavedProducts(userID string, limit, offset int) ([]models.Product, error) {
	if limit <= 0 || limit > 100 {
		limit = 40
	}
	if offset < 0 {
		offset = 0
	}

	rows, err := s.PG.Query(
		`SELECT p.id, COALESCE(p.channel_id::text,''), COALESCE(p.shop_id::text,''),
		        p.name, p.description, p.image_url, p.price_cents,
		        p.original_price_cents, p.inventory, p.sale_type,
		        COALESCE(p.condition,'new'), COALESCE(p.brand,''),
		        COALESCE(p.category,''), COALESCE(p.location_zip,''),
		        p.location_lat, p.location_lng, p.created_at
		 FROM saved_products sp
		 JOIN products p ON p.id = sp.product_id
		 WHERE sp.user_id = $1 AND p.listing_status = 'active'
		 ORDER BY sp.created_at DESC
		 LIMIT $2 OFFSET $3`,
		userID, limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	products := []models.Product{}
	for rows.Next() {
		var p models.Product
		var origPrice sql.NullInt64
		var shopID, channelID sql.NullString
		var lat, lng sql.NullFloat64
		if err := rows.Scan(
			&p.ID, &channelID, &shopID,
			&p.Name, &p.Description, &p.ImageURL, &p.PriceCents, &origPrice,
			&p.Inventory, &p.SaleType, &p.Condition, &p.Brand,
			&p.Category, &p.LocationZip,
			&lat, &lng, &p.CreatedAt,
		); err != nil {
			return nil, err
		}
		if origPrice.Valid {
			p.OriginalPrice = &origPrice.Int64
		}
		if shopID.Valid {
			p.ShopID = &shopID.String
		}
		if channelID.Valid {
			p.ChannelID = channelID.String
		}
		if lat.Valid {
			p.LocationLat = &lat.Float64
		}
		if lng.Valid {
			p.LocationLng = &lng.Float64
		}
		products = append(products, p)
	}
	return products, nil
}

// ----------------------------------------------------------------------------
// Listing creation with location passthrough
// ----------------------------------------------------------------------------

// CreateShopProductWithLocation inserts a product, denormalizing location from
// the parent shop unless an explicit override is provided on the product.
// Falls through to the legacy CreateShopProduct INSERT shape with the
// additional location columns appended.
func (s *Store) CreateShopProductWithLocation(shopID string, p *models.Product, override LocationOverride) error {
	// Default to shop's location if no override provided.
	zip := override.Zip
	lat := override.Lat
	lng := override.Lng
	if zip == "" || (lat == nil && lng == nil) {
		var shopZip sql.NullString
		var shopLat, shopLng sql.NullFloat64
		_ = s.PG.QueryRow(
			`SELECT COALESCE(location_zip,''), location_lat, location_lng FROM shops WHERE id = $1`,
			shopID,
		).Scan(&shopZip, &shopLat, &shopLng)
		if zip == "" && shopZip.Valid {
			zip = shopZip.String
		}
		if lat == nil && shopLat.Valid {
			v := shopLat.Float64
			lat = &v
		}
		if lng == nil && shopLng.Valid {
			v := shopLng.Float64
			lng = &v
		}
	}

	err := s.PG.QueryRow(
		`INSERT INTO products
		   (shop_id, name, description, image_url, price_cents,
		    original_price_cents, inventory, sale_type, condition, brand, tags,
		    category, location_zip, location_lat, location_lng, listing_status)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'active')
		 RETURNING id, created_at`,
		shopID, p.Name, p.Description, p.ImageURL, p.PriceCents,
		nilIfZeroInt64(p.OriginalPrice), p.Inventory, p.SaleType,
		p.Condition, p.Brand, pq.Array(p.Tags),
		p.Category, zip, lat, lng,
	).Scan(&p.ID, &p.CreatedAt)
	if err != nil {
		return err
	}
	p.LocationZip = zip
	p.LocationLat = lat
	p.LocationLng = lng
	return nil
}

// LocationOverride lets callers explicitly stamp location on a listing.
type LocationOverride struct {
	Zip string
	Lat *float64
	Lng *float64
}
