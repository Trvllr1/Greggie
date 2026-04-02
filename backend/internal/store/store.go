package store

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"greggie/backend/internal/models"

	"github.com/lib/pq"
	"github.com/redis/go-redis/v9"
)

type Store struct {
	PG  *sql.DB
	RDB *redis.Client
	Ctx context.Context
}

func New() (*Store, error) {
	pgURL := os.Getenv("DATABASE_URL")
	if pgURL == "" {
		pgURL = "postgres://localhost:5432/greggie?sslmode=disable"
	}
	pg, err := sql.Open("postgres", pgURL)
	if err != nil {
		return nil, fmt.Errorf("postgres open: %w", err)
	}
	pg.SetMaxOpenConns(envInt("DB_MAX_OPEN", 50))
	pg.SetMaxIdleConns(envInt("DB_MAX_IDLE", 10))
	pg.SetConnMaxLifetime(5 * time.Minute)
	pg.SetConnMaxIdleTime(3 * time.Minute)

	log.Printf("DB pool: maxOpen=%d, maxIdle=%d", envInt("DB_MAX_OPEN", 50), envInt("DB_MAX_IDLE", 10))

	if err := pg.Ping(); err != nil {
		return nil, fmt.Errorf("postgres ping: %w", err)
	}

	redisAddr := os.Getenv("REDIS_URL")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}
	rdb := redis.NewClient(&redis.Options{Addr: redisAddr})

	return &Store{PG: pg, RDB: rdb, Ctx: context.Background()}, nil
}

func (s *Store) Close() {
	s.PG.Close()
	s.RDB.Close()
}

func (s *Store) Ping() error {
	return s.PG.Ping()
}

// ── Users ──

func (s *Store) CreateUser(u *models.User) error {
	return s.PG.QueryRow(
		`INSERT INTO users (username, display_name, email, password_hash, role, preferred_categories)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, created_at, updated_at`,
		u.Username, u.DisplayName, u.Email, u.PasswordHash, u.Role, pq.Array(u.PreferredCategories),
	).Scan(&u.ID, &u.CreatedAt, &u.UpdatedAt)
}

func (s *Store) GetUserByEmail(email string) (*models.User, error) {
	u := &models.User{}
	err := s.PG.QueryRow(
		`SELECT id, username, display_name, email, password_hash, COALESCE(avatar_url, ''), role,
		        onboarding_complete, preferred_categories,
		        COALESCE(stripe_account_id, ''), COALESCE(stripe_onboarding_complete, false),
		        created_at, updated_at
		 FROM users WHERE email = $1`, email,
	).Scan(&u.ID, &u.Username, &u.DisplayName, &u.Email, &u.PasswordHash, &u.AvatarURL,
		&u.Role, &u.OnboardingComplete, pq.Array(&u.PreferredCategories),
		&u.StripeAccountID, &u.StripeOnboardingComplete,
		&u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (s *Store) GetUserByID(id string) (*models.User, error) {
	u := &models.User{}
	err := s.PG.QueryRow(
		`SELECT id, username, display_name, email, password_hash, COALESCE(avatar_url, ''), role,
		        onboarding_complete, preferred_categories,
		        COALESCE(stripe_account_id, ''), COALESCE(stripe_onboarding_complete, false),
		        created_at, updated_at
		 FROM users WHERE id = $1`, id,
	).Scan(&u.ID, &u.Username, &u.DisplayName, &u.Email, &u.PasswordHash, &u.AvatarURL,
		&u.Role, &u.OnboardingComplete, pq.Array(&u.PreferredCategories),
		&u.StripeAccountID, &u.StripeOnboardingComplete,
		&u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (s *Store) CreateWallet(userID string) error {
	_, err := s.PG.Exec(
		`INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, userID,
	)
	return err
}

// ── Channels ──

func (s *Store) CreateChannel(ch *models.Channel) error {
	return s.PG.QueryRow(
		`INSERT INTO channels (creator_id, title, description, category, sale_type, status)
		 VALUES ($1, $2, $3, $4, $5, 'OFFLINE')
		 RETURNING id, thumbnail_url, stream_url, stream_key, viewer_count, created_at, updated_at`,
		ch.CreatorID, ch.Title, ch.Description, ch.Category, ch.SaleType,
	).Scan(&ch.ID, &ch.ThumbnailURL, &ch.StreamURL, &ch.StreamKey, &ch.ViewerCount, &ch.CreatedAt, &ch.UpdatedAt)
}

func (s *Store) UpdateChannel(id string, req *models.UpdateChannelRequest) error {
	sets := []string{}
	args := []interface{}{}
	i := 1
	if req.Title != nil {
		sets = append(sets, fmt.Sprintf("title = $%d", i))
		args = append(args, *req.Title)
		i++
	}
	if req.Description != nil {
		sets = append(sets, fmt.Sprintf("description = $%d", i))
		args = append(args, *req.Description)
		i++
	}
	if req.Category != nil {
		sets = append(sets, fmt.Sprintf("category = $%d", i))
		args = append(args, *req.Category)
		i++
	}
	if req.ThumbnailURL != nil {
		sets = append(sets, fmt.Sprintf("thumbnail_url = $%d", i))
		args = append(args, *req.ThumbnailURL)
		i++
	}
	if req.StreamURL != nil {
		sets = append(sets, fmt.Sprintf("stream_url = $%d", i))
		args = append(args, *req.StreamURL)
		i++
	}
	if req.SaleType != nil {
		sets = append(sets, fmt.Sprintf("sale_type = $%d", i))
		args = append(args, *req.SaleType)
		i++
	}
	if len(sets) == 0 {
		return nil
	}
	sets = append(sets, fmt.Sprintf("updated_at = NOW()"))
	query := fmt.Sprintf("UPDATE channels SET %s WHERE id = $%d", strings.Join(sets, ", "), i)
	args = append(args, id)
	_, err := s.PG.Exec(query, args...)
	return err
}

func (s *Store) DeleteChannel(id string) error {
	_, err := s.PG.Exec(`DELETE FROM channels WHERE id = $1`, id)
	return err
}

func (s *Store) GetCreatorChannels(creatorID string) ([]models.Channel, error) {
	rows, err := s.PG.Query(
		`SELECT c.id, c.creator_id, c.title, c.description, c.category, c.thumbnail_url,
		        c.stream_url, c.stream_key, c.status, c.viewer_count, c.sale_type, c.scheduled_at,
		        c.created_at, c.updated_at,
		        COALESCE(c.badge, ''), COALESCE(c.is_primary, false),
		        u.display_name, COALESCE(u.avatar_url, '')
		 FROM channels c
		 JOIN users u ON u.id = c.creator_id
		 WHERE c.creator_id = $1
		 ORDER BY c.updated_at DESC`, creatorID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var channels []models.Channel
	for rows.Next() {
		ch := models.Channel{Merchant: &models.Merchant{}}
		var scheduledAt sql.NullTime
		if err := rows.Scan(
			&ch.ID, &ch.CreatorID, &ch.Title, &ch.Description, &ch.Category, &ch.ThumbnailURL,
			&ch.StreamURL, &ch.StreamKey, &ch.Status, &ch.ViewerCount, &ch.SaleType, &scheduledAt,
			&ch.CreatedAt, &ch.UpdatedAt,
			&ch.Badge, &ch.IsPrimary,
			&ch.Merchant.Name, &ch.Merchant.AvatarURL,
		); err != nil {
			return nil, err
		}
		if scheduledAt.Valid {
			ch.ScheduledAt = &scheduledAt.Time
		}
		channels = append(channels, ch)
	}
	return channels, nil
}

func (s *Store) UpdateChannelStatus(id, status string) error {
	_, err := s.PG.Exec(
		`UPDATE channels SET status = $1, updated_at = NOW() WHERE id = $2`, status, id,
	)
	return err
}

func (s *Store) SetChannelStreamURL(id, streamURL string) error {
	_, err := s.PG.Exec(
		`UPDATE channels SET stream_url = $1, updated_at = NOW() WHERE id = $2`, streamURL, id,
	)
	return err
}

func (s *Store) GetChannelStreamKey(id string) (string, error) {
	var key string
	err := s.PG.QueryRow(`SELECT stream_key FROM channels WHERE id = $1`, id).Scan(&key)
	return key, err
}

func (s *Store) GetPrimaryChannel() (*models.Channel, error) {
	ch := &models.Channel{Merchant: &models.Merchant{}}
	var scheduledAt sql.NullTime
	err := s.PG.QueryRow(
		`SELECT c.id, c.creator_id, c.title, c.description, c.category, c.thumbnail_url,
		        c.stream_url, c.stream_key, c.status, c.viewer_count, c.sale_type, c.scheduled_at,
		        c.created_at, c.updated_at,
		        COALESCE(c.badge, ''), COALESCE(c.is_primary, false),
		        u.display_name, COALESCE(u.avatar_url, '')
		 FROM channels c
		 JOIN users u ON u.id = c.creator_id
		 WHERE c.is_primary = true AND c.status = 'LIVE'
		 ORDER BY c.viewer_count DESC
		 LIMIT 1`,
	).Scan(&ch.ID, &ch.CreatorID, &ch.Title, &ch.Description, &ch.Category, &ch.ThumbnailURL,
		&ch.StreamURL, &ch.StreamKey, &ch.Status, &ch.ViewerCount, &ch.SaleType, &scheduledAt,
		&ch.CreatedAt, &ch.UpdatedAt,
		&ch.Badge, &ch.IsPrimary,
		&ch.Merchant.Name, &ch.Merchant.AvatarURL)
	if scheduledAt.Valid {
		ch.ScheduledAt = &scheduledAt.Time
	}
	if err != nil {
		return nil, err
	}
	return ch, nil
}

func (s *Store) GetChannelRail(category string, limit int) ([]models.Channel, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	query := `SELECT c.id, c.creator_id, c.title, c.description, c.category, c.thumbnail_url,
	                  c.stream_url, c.stream_key, c.status, c.viewer_count, c.sale_type, c.scheduled_at,
	                  c.created_at, c.updated_at,
	                  COALESCE(c.badge, ''), COALESCE(c.is_primary, false),
	                  u.display_name, COALESCE(u.avatar_url, '')
	           FROM channels c
	           JOIN users u ON u.id = c.creator_id
	           WHERE c.status IN ('LIVE', 'RELAY', 'SCHEDULED')`
	args := []interface{}{}
	argIdx := 1
	if category != "" {
		query += fmt.Sprintf(" AND c.category = $%d", argIdx)
		args = append(args, category)
		argIdx++
	}
	query += ` ORDER BY
	             CASE c.status WHEN 'LIVE' THEN 0 WHEN 'RELAY' THEN 1 ELSE 2 END,
	             c.viewer_count DESC`
	query += fmt.Sprintf(" LIMIT $%d", argIdx)
	args = append(args, limit)

	rows, err := s.PG.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var channels []models.Channel
	for rows.Next() {
		ch := models.Channel{Merchant: &models.Merchant{}}
		var scheduledAt sql.NullTime
		if err := rows.Scan(
			&ch.ID, &ch.CreatorID, &ch.Title, &ch.Description, &ch.Category, &ch.ThumbnailURL,
			&ch.StreamURL, &ch.StreamKey, &ch.Status, &ch.ViewerCount, &ch.SaleType, &scheduledAt,
			&ch.CreatedAt, &ch.UpdatedAt,
			&ch.Badge, &ch.IsPrimary,
			&ch.Merchant.Name, &ch.Merchant.AvatarURL,
		); err != nil {
			return nil, err
		}
		if scheduledAt.Valid {
			ch.ScheduledAt = &scheduledAt.Time
		}
		channels = append(channels, ch)
	}
	return channels, nil
}

func (s *Store) GetChannelByID(id string) (*models.Channel, error) {
	ch := &models.Channel{Merchant: &models.Merchant{}}
	var scheduledAt sql.NullTime
	err := s.PG.QueryRow(
		`SELECT c.id, c.creator_id, c.title, c.description, c.category, c.thumbnail_url,
		        c.stream_url, c.stream_key, c.status, c.viewer_count, c.sale_type, c.scheduled_at,
		        c.created_at, c.updated_at,
		        COALESCE(c.badge, ''), COALESCE(c.is_primary, false),
		        u.display_name, COALESCE(u.avatar_url, '')
		 FROM channels c
		 JOIN users u ON u.id = c.creator_id
		 WHERE c.id = $1`, id,
	).Scan(&ch.ID, &ch.CreatorID, &ch.Title, &ch.Description, &ch.Category, &ch.ThumbnailURL,
		&ch.StreamURL, &ch.StreamKey, &ch.Status, &ch.ViewerCount, &ch.SaleType, &scheduledAt,
		&ch.CreatedAt, &ch.UpdatedAt,
		&ch.Badge, &ch.IsPrimary,
		&ch.Merchant.Name, &ch.Merchant.AvatarURL)
	if scheduledAt.Valid {
		ch.ScheduledAt = &scheduledAt.Time
	}
	if err != nil {
		return nil, err
	}
	return ch, nil
}

// ── Products ──

func (s *Store) CreateProduct(p *models.Product) error {
	return s.PG.QueryRow(
		`INSERT INTO products (channel_id, name, description, image_url, price_cents, original_price_cents, inventory, sale_type, auction_end_at, drop_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		 RETURNING id, is_pinned, created_at`,
		p.ChannelID, p.Name, p.Description, p.ImageURL, p.PriceCents, p.OriginalPrice,
		p.Inventory, p.SaleType, p.AuctionEndAt, p.DropAt,
	).Scan(&p.ID, &p.IsPinned, &p.CreatedAt)
}

func (s *Store) UpdateProduct(id string, req *models.UpdateProductRequest) error {
	sets := []string{}
	args := []interface{}{}
	i := 1
	if req.Name != nil {
		sets = append(sets, fmt.Sprintf("name = $%d", i))
		args = append(args, *req.Name)
		i++
	}
	if req.Description != nil {
		sets = append(sets, fmt.Sprintf("description = $%d", i))
		args = append(args, *req.Description)
		i++
	}
	if req.ImageURL != nil {
		sets = append(sets, fmt.Sprintf("image_url = $%d", i))
		args = append(args, *req.ImageURL)
		i++
	}
	if req.PriceCents != nil {
		sets = append(sets, fmt.Sprintf("price_cents = $%d", i))
		args = append(args, *req.PriceCents)
		i++
	}
	if req.OriginalPrice != nil {
		sets = append(sets, fmt.Sprintf("original_price_cents = $%d", i))
		args = append(args, *req.OriginalPrice)
		i++
	}
	if req.Inventory != nil {
		sets = append(sets, fmt.Sprintf("inventory = $%d", i))
		args = append(args, *req.Inventory)
		i++
	}
	if req.SaleType != nil {
		sets = append(sets, fmt.Sprintf("sale_type = $%d", i))
		args = append(args, *req.SaleType)
		i++
	}
	if len(sets) == 0 {
		return nil
	}
	query := fmt.Sprintf("UPDATE products SET %s WHERE id = $%d", strings.Join(sets, ", "), i)
	args = append(args, id)
	_, err := s.PG.Exec(query, args...)
	return err
}

func (s *Store) DeleteProduct(id string) error {
	_, err := s.PG.Exec(`DELETE FROM products WHERE id = $1`, id)
	return err
}

func (s *Store) PinProduct(channelID, productID string) error {
	tx, err := s.PG.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	// Unpin all products in the channel
	if _, err := tx.Exec(`UPDATE products SET is_pinned = false WHERE channel_id = $1`, channelID); err != nil {
		return err
	}
	// Pin the target product (empty productID = unpin all)
	if productID != "" {
		if _, err := tx.Exec(`UPDATE products SET is_pinned = true WHERE id = $1 AND channel_id = $2`, productID, channelID); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (s *Store) GetChannelAnalytics(channelID string) (*models.ChannelAnalytics, error) {
	a := &models.ChannelAnalytics{ChannelID: channelID}

	// Total viewers from Redis
	v, _ := s.GetViewers(channelID)
	a.TotalViewers = v

	// Revenue + order count
	err := s.PG.QueryRow(
		`SELECT COALESCE(SUM(total_cents), 0), COUNT(*)
		 FROM orders WHERE channel_id = $1`, channelID,
	).Scan(&a.TotalRevenue, &a.TotalOrders)
	if err != nil {
		return nil, err
	}

	// Likes from events
	err = s.PG.QueryRow(
		`SELECT COUNT(*) FROM events WHERE channel_id = $1 AND event_type = 'like'`, channelID,
	).Scan(&a.TotalLikes)
	if err != nil {
		return nil, err
	}

	// Conversion rate
	var totalViews int
	_ = s.PG.QueryRow(
		`SELECT COUNT(*) FROM events WHERE channel_id = $1 AND event_type = 'view'`, channelID,
	).Scan(&totalViews)
	if totalViews > 0 {
		a.ConversionRate = float64(a.TotalOrders) / float64(totalViews) * 100
	}

	return a, nil
}

func (s *Store) GetProductsByChannel(channelID string) ([]models.Product, error) {
	rows, err := s.PG.Query(
		`SELECT id, channel_id, name, description, image_url, price_cents,
		        original_price_cents, inventory, sale_type, is_pinned,
		        auction_end_at, drop_at,
		        COALESCE(auction_status, 'pending'), COALESCE(auction_reserve_cents, 0),
		        auction_winner_id, COALESCE(current_bid_cents, 0), highest_bidder_id,
		        COALESCE(bid_count, 0), created_at
		 FROM products WHERE channel_id = $1
		 ORDER BY is_pinned DESC, created_at DESC`, channelID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		p := models.Product{}
		var origPrice sql.NullInt64
		var auctionEnd, dropAt sql.NullTime
		var winnerID, bidderID sql.NullString
		if err := rows.Scan(
			&p.ID, &p.ChannelID, &p.Name, &p.Description, &p.ImageURL, &p.PriceCents,
			&origPrice, &p.Inventory, &p.SaleType, &p.IsPinned,
			&auctionEnd, &dropAt,
			&p.AuctionStatus, &p.AuctionReserveCents,
			&winnerID, &p.CurrentBidCents, &bidderID,
			&p.BidCount, &p.CreatedAt,
		); err != nil {
			return nil, err
		}
		if origPrice.Valid {
			p.OriginalPrice = &origPrice.Int64
		}
		if auctionEnd.Valid {
			p.AuctionEndAt = &auctionEnd.Time
		}
		if dropAt.Valid {
			p.DropAt = &dropAt.Time
		}
		if winnerID.Valid {
			p.AuctionWinnerID = &winnerID.String
		}
		if bidderID.Valid {
			p.HighestBidderID = &bidderID.String
		}
		products = append(products, p)
	}
	return products, nil
}

func (s *Store) GetProductByID(id string) (*models.Product, error) {
	p := &models.Product{}
	var origPrice sql.NullInt64
	var auctionEnd, dropAt sql.NullTime
	var winnerID, bidderID sql.NullString
	err := s.PG.QueryRow(
		`SELECT id, COALESCE(channel_id::text,''), name, COALESCE(description,''), COALESCE(image_url,''), price_cents,
		        original_price_cents, inventory, sale_type, is_pinned,
		        auction_end_at, drop_at,
		        COALESCE(auction_status, 'pending'), COALESCE(auction_reserve_cents, 0),
		        auction_winner_id, COALESCE(current_bid_cents, 0), highest_bidder_id,
		        COALESCE(bid_count, 0), created_at
		 FROM products WHERE id = $1`, id,
	).Scan(&p.ID, &p.ChannelID, &p.Name, &p.Description, &p.ImageURL, &p.PriceCents,
		&origPrice, &p.Inventory, &p.SaleType, &p.IsPinned,
		&auctionEnd, &dropAt,
		&p.AuctionStatus, &p.AuctionReserveCents,
		&winnerID, &p.CurrentBidCents, &bidderID,
		&p.BidCount, &p.CreatedAt)
	if err != nil {
		return nil, err
	}
	if origPrice.Valid {
		p.OriginalPrice = &origPrice.Int64
	}
	if auctionEnd.Valid {
		p.AuctionEndAt = &auctionEnd.Time
	}
	if dropAt.Valid {
		p.DropAt = &dropAt.Time
	}
	if winnerID.Valid {
		p.AuctionWinnerID = &winnerID.String
	}
	if bidderID.Valid {
		p.HighestBidderID = &bidderID.String
	}
	return p, nil
}

// GetProductFullByID returns a product with all rich data: variants, shipping, reviews, specs, bundles, relations.
func (s *Store) GetProductFullByID(id string) (*models.Product, error) {
	p, err := s.GetProductByID(id)
	if err != nil {
		return nil, err
	}

	// Fetch extra columns from products table
	var category, subcategory, warrantyInfo sql.NullString
	var returnDays sql.NullInt64
	var isDigital sql.NullBool
	var reviewCount sql.NullInt64
	var reviewAvg sql.NullFloat64
	_ = s.PG.QueryRow(
		`SELECT COALESCE(category,''), COALESCE(subcategory,''), return_days, warranty_info,
		        COALESCE(is_digital, false), COALESCE(review_count, 0), COALESCE(review_avg, 0),
		        COALESCE(bullet_points, '{}'), COALESCE(brand, ''), COALESCE(condition, 'new')
		 FROM products WHERE id = $1`, id,
	).Scan(&category, &subcategory, &returnDays, &warrantyInfo,
		&isDigital, &reviewCount, &reviewAvg,
		pq.Array(&p.BulletPoints), &p.Brand, &p.Condition)
	if category.Valid {
		p.Category = category.String
	}
	if subcategory.Valid {
		p.Subcategory = subcategory.String
	}
	if returnDays.Valid {
		p.ReturnDays = int(returnDays.Int64)
	}
	if warrantyInfo.Valid {
		p.WarrantyInfo = warrantyInfo.String
	}
	if isDigital.Valid {
		p.IsDigital = isDigital.Bool
	}
	p.ReviewCount = int(reviewCount.Int64)
	p.ReviewAvg = reviewAvg.Float64

	// Variant groups + options
	p.VariantGroups, _ = s.getVariantGroups(id)

	// Variants
	p.Variants, _ = s.getVariants(id)

	// Shipping
	p.Shipping, _ = s.getShipping(id)

	// Reviews (first page)
	p.Reviews, _ = s.GetProductReviews(id, 5, 0)

	// Specs
	p.Specs, _ = s.getSpecs(id)

	// Bundles
	p.Bundles, _ = s.getBundles(id)

	// Related products
	p.RelatedProducts, _ = s.getRelatedProducts(id)

	// Images
	p.Images, _ = s.getProductImages(id)

	return p, nil
}

func (s *Store) getVariantGroups(productID string) ([]models.ProductVariantGroup, error) {
	rows, err := s.PG.Query(
		`SELECT id, product_id, name, position FROM product_variant_groups
		 WHERE product_id = $1 ORDER BY position`, productID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var groups []models.ProductVariantGroup
	for rows.Next() {
		g := models.ProductVariantGroup{}
		if err := rows.Scan(&g.ID, &g.ProductID, &g.Name, &g.Position); err != nil {
			return nil, err
		}
		// Fetch options for this group
		optRows, err := s.PG.Query(
			`SELECT id, group_id, label, COALESCE(value,''), position
			 FROM product_variant_options WHERE group_id = $1 ORDER BY position`, g.ID,
		)
		if err == nil {
			defer optRows.Close()
			for optRows.Next() {
				o := models.ProductVariantOption{}
				optRows.Scan(&o.ID, &o.GroupID, &o.Label, &o.Value, &o.Position)
				g.Options = append(g.Options, o)
			}
		}
		groups = append(groups, g)
	}
	return groups, nil
}

func (s *Store) getVariants(productID string) ([]models.ProductVariant, error) {
	rows, err := s.PG.Query(
		`SELECT id, product_id, COALESCE(sku,''), price_cents, inventory,
		        COALESCE(image_url,''), is_default
		 FROM product_variants WHERE product_id = $1`, productID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var variants []models.ProductVariant
	for rows.Next() {
		v := models.ProductVariant{}
		var priceCents sql.NullInt64
		var imageURL sql.NullString
		if err := rows.Scan(&v.ID, &v.ProductID, &v.SKU, &priceCents, &v.Inventory, &imageURL, &v.IsDefault); err != nil {
			return nil, err
		}
		if priceCents.Valid {
			pc := priceCents.Int64
			v.PriceCents = &pc
		}
		if imageURL.Valid && imageURL.String != "" {
			v.ImageURL = imageURL.String
		}
		// Get option IDs for this variant
		optRows, err := s.PG.Query(
			`SELECT option_id FROM product_variant_option_map WHERE variant_id = $1`, v.ID,
		)
		if err == nil {
			defer optRows.Close()
			for optRows.Next() {
				var oid string
				optRows.Scan(&oid)
				v.OptionIDs = append(v.OptionIDs, oid)
			}
		}
		variants = append(variants, v)
	}
	return variants, nil
}

func (s *Store) getShipping(productID string) (*models.ProductShipping, error) {
	sh := &models.ProductShipping{}
	var flatRate sql.NullInt64
	var state sql.NullString
	err := s.PG.QueryRow(
		`SELECT id, product_id, COALESCE(free_shipping, false), COALESCE(shipping_class, 'standard'),
		        flat_rate_cents, COALESCE(ships_from_country, 'US'), ships_from_state,
		        COALESCE(handling_days, 1), COALESCE(estimated_days_min, 3), COALESCE(estimated_days_max, 7)
		 FROM product_shipping WHERE product_id = $1`, productID,
	).Scan(&sh.ID, &sh.ProductID, &sh.FreeShipping, &sh.ShippingClass, &flatRate, &sh.ShipsFromCountry, &state,
		&sh.HandlingDays, &sh.EstDaysMin, &sh.EstDaysMax)
	if err != nil {
		return nil, err
	}
	if flatRate.Valid {
		fc := flatRate.Int64
		sh.FlatRateCents = &fc
	}
	if state.Valid {
		sh.ShipsFromState = state.String
	}
	return sh, nil
}

func (s *Store) GetProductReviews(productID string, limit, offset int) ([]models.ProductReview, error) {
	rows, err := s.PG.Query(
		`SELECT id, product_id, COALESCE(user_id::text,''), COALESCE(user_name,''), rating,
		        COALESCE(title,''), COALESCE(body,''), COALESCE(verified_purchase, false),
		        COALESCE(helpful_count, 0), COALESCE(images, '{}'), created_at
		 FROM product_reviews WHERE product_id = $1
		 ORDER BY helpful_count DESC, created_at DESC
		 LIMIT $2 OFFSET $3`, productID, limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reviews []models.ProductReview
	for rows.Next() {
		r := models.ProductReview{}
		var userID string
		if err := rows.Scan(&r.ID, &r.ProductID, &userID, &r.UserName, &r.Rating,
			&r.Title, &r.Body, &r.VerifiedPurchase, &r.HelpfulCount,
			pq.Array(&r.Images), &r.CreatedAt); err != nil {
			return nil, err
		}
		if userID != "" {
			r.UserID = &userID
		}
		reviews = append(reviews, r)
	}
	return reviews, nil
}

func (s *Store) CreateProductReview(r *models.ProductReview) error {
	err := s.PG.QueryRow(
		`INSERT INTO product_reviews (product_id, user_id, user_name, rating, title, body, verified_purchase, images)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING id, created_at`,
		r.ProductID, r.UserID, r.UserName, r.Rating, r.Title, r.Body, r.VerifiedPurchase,
		pq.Array(r.Images),
	).Scan(&r.ID, &r.CreatedAt)
	if err != nil {
		return err
	}
	// Update aggregate counts on the product
	_, _ = s.PG.Exec(
		`UPDATE products SET
		   review_count = (SELECT COUNT(*) FROM product_reviews WHERE product_id = $1),
		   review_avg = (SELECT COALESCE(AVG(rating), 0) FROM product_reviews WHERE product_id = $1)
		 WHERE id = $1`, r.ProductID,
	)
	return nil
}

func (s *Store) MarkReviewHelpful(reviewID string) (int, error) {
	var count int
	err := s.PG.QueryRow(
		`UPDATE product_reviews SET helpful_count = helpful_count + 1 WHERE id = $1 RETURNING helpful_count`,
		reviewID,
	).Scan(&count)
	return count, err
}

func (s *Store) getSpecs(productID string) ([]models.ProductSpec, error) {
	rows, err := s.PG.Query(
		`SELECT id, product_id, key, value, position FROM product_specs WHERE product_id = $1 ORDER BY position`, productID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var specs []models.ProductSpec
	for rows.Next() {
		sp := models.ProductSpec{}
		rows.Scan(&sp.ID, &sp.ProductID, &sp.Key, &sp.Value, &sp.Position)
		specs = append(specs, sp)
	}
	return specs, nil
}

func (s *Store) getBundles(productID string) ([]models.ProductBundle, error) {
	rows, err := s.PG.Query(
		`SELECT id, name, COALESCE(description,''), COALESCE(discount_pct,0), COALESCE(discount_cents,0)
		 FROM product_bundles WHERE id IN (
		   SELECT bundle_id FROM product_bundle_items WHERE product_id = $1
		 )`, productID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bundles []models.ProductBundle
	for rows.Next() {
		b := models.ProductBundle{}
		rows.Scan(&b.ID, &b.Name, &b.Description, &b.DiscountPct, &b.DiscountCents)
		// Fetch items
		itemRows, err := s.PG.Query(
			`SELECT bi.product_id, bi.quantity FROM product_bundle_items bi WHERE bi.bundle_id = $1`, b.ID,
		)
		if err == nil {
			defer itemRows.Close()
			for itemRows.Next() {
				item := models.ProductBundleItem{}
				var prodID string
				itemRows.Scan(&prodID, &item.Quantity)
				// Avoid deep recursion — get basic product info only
				prod, err := s.GetProductByID(prodID)
				if err == nil {
					item.Product = prod
				}
				b.Items = append(b.Items, item)
			}
		}
		bundles = append(bundles, b)
	}
	return bundles, nil
}

func (s *Store) getRelatedProducts(productID string) ([]models.Product, error) {
	rows, err := s.PG.Query(
		`SELECT related_id FROM product_relations
		 WHERE product_id = $1 ORDER BY position LIMIT 12`, productID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		var relID string
		rows.Scan(&relID)
		p, err := s.GetProductByID(relID)
		if err == nil {
			products = append(products, *p)
		}
	}
	return products, nil
}

func (s *Store) getProductImages(productID string) ([]models.ProductImage, error) {
	rows, err := s.PG.Query(
		`SELECT id, product_id, url, position FROM product_images
		 WHERE product_id = $1 ORDER BY position`, productID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var images []models.ProductImage
	for rows.Next() {
		img := models.ProductImage{}
		rows.Scan(&img.ID, &img.ProductID, &img.URL, &img.Position)
		images = append(images, img)
	}
	return images, nil
}

// CheckoutAtomic performs inventory decrement + order creation in a single
// transaction with SELECT...FOR UPDATE to prevent race conditions.
func (s *Store) CheckoutAtomic(o *models.Order) error {
	tx, err := s.PG.Begin()
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	// Lock and verify inventory for each item
	for _, item := range o.Items {
		var inventory int
		err := tx.QueryRow(
			`SELECT inventory FROM products WHERE id = $1 FOR UPDATE`, item.ProductID,
		).Scan(&inventory)
		if err != nil {
			return fmt.Errorf("product %s not found", item.ProductID)
		}
		if inventory < item.Quantity {
			return fmt.Errorf("insufficient inventory for product %s", item.ProductID)
		}
		// Decrement within the same transaction
		_, err = tx.Exec(
			`UPDATE products SET inventory = inventory - $1 WHERE id = $2`,
			item.Quantity, item.ProductID,
		)
		if err != nil {
			return fmt.Errorf("decrement inventory: %w", err)
		}
	}

	// Create order
	err = tx.QueryRow(
		`INSERT INTO orders (user_id, channel_id, seller_id, status, total_cents, platform_fee_cents, stripe_payment_id, stripe_client_secret, idempotency_key)
		 VALUES ($1, $2, NULLIF($3, ''), $4, $5, $6, $7, $8, NULLIF($9, '')) RETURNING id, created_at`,
		o.UserID, o.ChannelID, o.SellerID, o.Status, o.TotalCents, o.PlatformFeeCents,
		o.StripePaymentID, o.StripeClientSecret, o.IdempotencyKey,
	).Scan(&o.ID, &o.CreatedAt)
	if err != nil {
		return fmt.Errorf("create order: %w", err)
	}

	// Create order items
	for i := range o.Items {
		item := &o.Items[i]
		item.OrderID = o.ID
		err = tx.QueryRow(
			`INSERT INTO order_items (order_id, product_id, quantity, price_cents)
			 VALUES ($1, $2, $3, $4) RETURNING id`,
			item.OrderID, item.ProductID, item.Quantity, item.PriceCents,
		).Scan(&item.ID)
		if err != nil {
			return fmt.Errorf("create order item: %w", err)
		}
	}

	return tx.Commit()
}

// ── Follows ──

func (s *Store) FollowChannel(userID, channelID string) error {
	_, err := s.PG.Exec(
		`INSERT INTO follows (user_id, channel_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		userID, channelID,
	)
	return err
}

func (s *Store) UnfollowChannel(userID, channelID string) error {
	_, err := s.PG.Exec(
		`DELETE FROM follows WHERE user_id = $1 AND channel_id = $2`,
		userID, channelID,
	)
	return err
}

func (s *Store) GetFollowedChannels(userID string) ([]models.Channel, error) {
	rows, err := s.PG.Query(
		`SELECT c.id, c.creator_id, c.title, c.description, c.category, c.thumbnail_url,
		        c.stream_url, c.stream_key, c.status, c.viewer_count, c.sale_type, c.scheduled_at,
		        c.created_at, c.updated_at,
		        COALESCE(c.badge, ''), COALESCE(c.is_primary, false),
		        u.display_name, COALESCE(u.avatar_url, '')
		 FROM channels c
		 JOIN users u ON u.id = c.creator_id
		 JOIN follows f ON f.channel_id = c.id
		 WHERE f.user_id = $1
		 ORDER BY c.viewer_count DESC`, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var channels []models.Channel
	for rows.Next() {
		ch := models.Channel{Merchant: &models.Merchant{}}
		var scheduledAt sql.NullTime
		if err := rows.Scan(
			&ch.ID, &ch.CreatorID, &ch.Title, &ch.Description, &ch.Category, &ch.ThumbnailURL,
			&ch.StreamURL, &ch.StreamKey, &ch.Status, &ch.ViewerCount, &ch.SaleType, &scheduledAt,
			&ch.CreatedAt, &ch.UpdatedAt,
			&ch.Badge, &ch.IsPrimary,
			&ch.Merchant.Name, &ch.Merchant.AvatarURL,
		); err != nil {
			return nil, err
		}
		if scheduledAt.Valid {
			ch.ScheduledAt = &scheduledAt.Time
		}
		channels = append(channels, ch)
	}
	return channels, nil
}

// ── Events ──

func (s *Store) LogEvent(e *models.Event) error {
	_, err := s.PG.Exec(
		`INSERT INTO events (user_id, channel_id, event_type, payload) VALUES ($1, $2, $3, $4)`,
		e.UserID, nilIfEmpty(e.ChannelID), e.EventType, e.Payload,
	)
	return err
}

// ── Viewer count (Redis) ──

func (s *Store) IncrViewers(channelID string) (int64, error) {
	key := "viewers:" + channelID
	val, err := s.RDB.Incr(s.Ctx, key).Result()
	if err == nil {
		s.RDB.Expire(s.Ctx, key, 5*time.Minute)
	}
	return val, err
}

func (s *Store) DecrViewers(channelID string) (int64, error) {
	key := "viewers:" + channelID
	val, err := s.RDB.Decr(s.Ctx, key).Result()
	if err == nil {
		s.RDB.Expire(s.Ctx, key, 5*time.Minute)
	}
	return val, err
}

// ── Relay ──

func (s *Store) CreateRelayEntry(e *models.RelayEntry) error {
	return s.PG.QueryRow(
		`INSERT INTO relay_entries (channel_id, transcript_chunk, timestamp_sec)
		 VALUES ($1, $2, $3)
		 RETURNING id, created_at`,
		e.ChannelID, e.TranscriptChunk, e.TimestampSec,
	).Scan(&e.ID, &e.CreatedAt)
}

// SearchRelayEntries performs a text-based search on relay transcripts.
// Uses PostgreSQL ILIKE for now; swap for vector similarity when embedding pipeline is ready.
func (s *Store) SearchRelayEntries(channelID, query string, limit int) ([]models.RelayEntry, error) {
	if limit <= 0 {
		limit = 5
	}
	// Split query into words for multi-word ranking
	words := strings.Fields(strings.TrimSpace(query))
	if len(words) == 0 {
		return nil, nil
	}

	// Build a rank expression: count how many words match each chunk
	// This gives better results than a single ILIKE for multi-word queries
	var rankParts []string
	var args []interface{}
	args = append(args, channelID) // $1
	for i, w := range words {
		paramIdx := i + 2
		rankParts = append(rankParts, fmt.Sprintf(
			"CASE WHEN LOWER(transcript_chunk) LIKE '%%' || LOWER($%d) || '%%' THEN 1 ELSE 0 END", paramIdx,
		))
		args = append(args, w)
	}

	rankExpr := strings.Join(rankParts, " + ")
	sql := fmt.Sprintf(
		`SELECT id, channel_id, transcript_chunk, timestamp_sec, created_at,
		        (%s) AS rank
		 FROM relay_entries
		 WHERE channel_id = $1 AND (%s) > 0
		 ORDER BY rank DESC, timestamp_sec ASC
		 LIMIT %d`, rankExpr, rankExpr, limit,
	)

	rows, err := s.PG.Query(sql, args...)
	if err != nil {
		return nil, fmt.Errorf("relay search: %w", err)
	}
	defer rows.Close()

	var entries []models.RelayEntry
	for rows.Next() {
		var e models.RelayEntry
		var rank int
		if err := rows.Scan(&e.ID, &e.ChannelID, &e.TranscriptChunk, &e.TimestampSec, &e.CreatedAt, &rank); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, nil
}

func (s *Store) GetRelayEntries(channelID string, fromSec, toSec int) ([]models.RelayEntry, error) {
	rows, err := s.PG.Query(
		`SELECT id, channel_id, transcript_chunk, timestamp_sec, created_at
		 FROM relay_entries
		 WHERE channel_id = $1 AND timestamp_sec BETWEEN $2 AND $3
		 ORDER BY timestamp_sec ASC`,
		channelID, fromSec, toSec,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []models.RelayEntry
	for rows.Next() {
		var e models.RelayEntry
		if err := rows.Scan(&e.ID, &e.ChannelID, &e.TranscriptChunk, &e.TimestampSec, &e.CreatedAt); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, nil
}
func (s *Store) GetViewers(channelID string) (int64, error) {
	v, err := s.RDB.Get(s.Ctx, "viewers:"+channelID).Int64()
	if err == redis.Nil {
		return 0, nil
	}
	return v, err
}

// ── Auction Engine ──

// PlaceBidAtomic validates and places a bid in a single transaction.
// Returns the created bid. Enforces: auction active, bid > current highest, bid >= reserve (if first).
func (s *Store) PlaceBidAtomic(productID, userID string, amountCents int64) (*models.Bid, *models.Product, error) {
	tx, err := s.PG.Begin()
	if err != nil {
		return nil, nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	// Lock the product row
	var currentBid int64
	var auctionStatus string
	var reserveCents int64
	var auctionEnd sql.NullTime
	err = tx.QueryRow(
		`SELECT COALESCE(current_bid_cents, 0), COALESCE(auction_status, 'pending'),
		        COALESCE(auction_reserve_cents, 0), auction_end_at
		 FROM products WHERE id = $1 FOR UPDATE`, productID,
	).Scan(&currentBid, &auctionStatus, &reserveCents, &auctionEnd)
	if err != nil {
		return nil, nil, fmt.Errorf("product not found: %w", err)
	}

	if auctionStatus != "active" {
		return nil, nil, fmt.Errorf("auction is not active (status: %s)", auctionStatus)
	}
	if auctionEnd.Valid && time.Now().After(auctionEnd.Time) {
		return nil, nil, fmt.Errorf("auction has ended")
	}

	// First bid must meet reserve price
	if currentBid == 0 && amountCents < reserveCents {
		return nil, nil, fmt.Errorf("bid must be at least %d cents (reserve price)", reserveCents)
	}
	// Subsequent bids must exceed current highest
	if currentBid > 0 && amountCents <= currentBid {
		return nil, nil, fmt.Errorf("bid must exceed current highest bid of %d cents", currentBid)
	}

	// Insert bid record
	bid := &models.Bid{ProductID: productID, UserID: userID, AmountCents: amountCents}
	err = tx.QueryRow(
		`INSERT INTO bids (product_id, user_id, amount_cents) VALUES ($1, $2, $3) RETURNING id, created_at`,
		productID, userID, amountCents,
	).Scan(&bid.ID, &bid.CreatedAt)
	if err != nil {
		return nil, nil, fmt.Errorf("insert bid: %w", err)
	}

	// Update product with new highest bid
	_, err = tx.Exec(
		`UPDATE products SET current_bid_cents = $1, highest_bidder_id = $2, bid_count = bid_count + 1
		 WHERE id = $3`, amountCents, userID, productID,
	)
	if err != nil {
		return nil, nil, fmt.Errorf("update product bid: %w", err)
	}

	// Anti-sniping: extend auction if bid placed in last 30 seconds
	if auctionEnd.Valid {
		remaining := time.Until(auctionEnd.Time)
		if remaining > 0 && remaining < 30*time.Second {
			newEnd := time.Now().Add(30 * time.Second)
			_, err = tx.Exec(
				`UPDATE products SET auction_end_at = $1 WHERE id = $2`, newEnd, productID,
			)
			if err != nil {
				return nil, nil, fmt.Errorf("extend auction: %w", err)
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, nil, fmt.Errorf("commit: %w", err)
	}

	// Return updated product
	product, _ := s.GetProductByID(productID)
	return bid, product, nil
}

// GetBidHistory returns bids for a product, most recent first.
func (s *Store) GetBidHistory(productID string, limit int) ([]models.Bid, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := s.PG.Query(
		`SELECT id, product_id, user_id, amount_cents, created_at
		 FROM bids WHERE product_id = $1
		 ORDER BY amount_cents DESC LIMIT $2`, productID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bids []models.Bid
	for rows.Next() {
		var b models.Bid
		if err := rows.Scan(&b.ID, &b.ProductID, &b.UserID, &b.AmountCents, &b.CreatedAt); err != nil {
			return nil, err
		}
		bids = append(bids, b)
	}
	return bids, nil
}

// StartAuction sets a product's auction to active with a given end time.
func (s *Store) StartAuction(productID string, endAt time.Time) error {
	_, err := s.PG.Exec(
		`UPDATE products SET auction_status = 'active', auction_end_at = $1,
		        current_bid_cents = 0, highest_bidder_id = NULL, bid_count = 0,
		        auction_winner_id = NULL
		 WHERE id = $2 AND sale_type = 'auction'`, endAt, productID,
	)
	return err
}

// GetActiveAuctionsPastEnd returns product IDs of active auctions that have passed their end time.
func (s *Store) GetActiveAuctionsPastEnd() ([]string, error) {
	rows, err := s.PG.Query(
		`SELECT id FROM products
		 WHERE auction_status = 'active' AND auction_end_at IS NOT NULL AND auction_end_at <= NOW()`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, nil
}

// EndAuction marks an auction as ended and records the winner.
// Returns the winning bid (or nil if no bids / reserve not met).
func (s *Store) EndAuction(productID string) (*models.Bid, error) {
	tx, err := s.PG.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var currentBid int64
	var reserveCents int64
	var bidderID sql.NullString
	err = tx.QueryRow(
		`SELECT COALESCE(current_bid_cents, 0), COALESCE(auction_reserve_cents, 0), highest_bidder_id
		 FROM products WHERE id = $1 FOR UPDATE`, productID,
	).Scan(&currentBid, &reserveCents, &bidderID)
	if err != nil {
		return nil, err
	}

	// Check if reserve was met
	if currentBid == 0 || (reserveCents > 0 && currentBid < reserveCents) || !bidderID.Valid {
		// No winner — end without settlement
		_, err = tx.Exec(`UPDATE products SET auction_status = 'ended' WHERE id = $1`, productID)
		if err != nil {
			return nil, err
		}
		return nil, tx.Commit()
	}

	// Set winner
	_, err = tx.Exec(
		`UPDATE products SET auction_status = 'ended', auction_winner_id = $1 WHERE id = $2`,
		bidderID.String, productID,
	)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	// Return winning bid
	winningBid := &models.Bid{
		ProductID:   productID,
		UserID:      bidderID.String,
		AmountCents: currentBid,
	}
	return winningBid, nil
}

// ── Stripe Connect ──

func (s *Store) SetStripeAccountID(userID, accountID string) error {
	_, err := s.PG.Exec(
		`UPDATE users SET stripe_account_id = $1, updated_at = NOW() WHERE id = $2`,
		accountID, userID,
	)
	return err
}

func (s *Store) SetStripeOnboardingComplete(userID string, complete bool) error {
	_, err := s.PG.Exec(
		`UPDATE users SET stripe_onboarding_complete = $1, updated_at = NOW() WHERE id = $2`,
		complete, userID,
	)
	return err
}

func (s *Store) GetOrderByStripePaymentID(paymentID string) (*models.Order, error) {
	o := &models.Order{}
	err := s.PG.QueryRow(
		`SELECT id, user_id, channel_id, COALESCE(seller_id::text, ''), status, total_cents,
		        platform_fee_cents, stripe_payment_id, COALESCE(stripe_client_secret, ''),
		        COALESCE(idempotency_key, ''), created_at
		 FROM orders WHERE stripe_payment_id = $1`, paymentID,
	).Scan(&o.ID, &o.UserID, &o.ChannelID, &o.SellerID, &o.Status, &o.TotalCents,
		&o.PlatformFeeCents, &o.StripePaymentID, &o.StripeClientSecret,
		&o.IdempotencyKey, &o.CreatedAt)
	if err != nil {
		return nil, err
	}
	return o, nil
}

func (s *Store) UpdateOrderStatus(orderID, status string) error {
	_, err := s.PG.Exec(
		`UPDATE orders SET status = $1 WHERE id = $2`, status, orderID,
	)
	return err
}

func (s *Store) UpdateOrderStripePaymentID(orderID, paymentID, clientSecret string) error {
	_, err := s.PG.Exec(
		`UPDATE orders SET stripe_payment_id = $1, stripe_client_secret = $2 WHERE id = $3`,
		paymentID, clientSecret, orderID,
	)
	return err
}

func (s *Store) RestoreInventory(orderID string) error {
	tx, err := s.PG.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	rows, err := tx.Query(
		`SELECT product_id, quantity FROM order_items WHERE order_id = $1`, orderID,
	)
	if err != nil {
		return err
	}
	defer rows.Close()

	type item struct {
		productID string
		quantity  int
	}
	var items []item
	for rows.Next() {
		var it item
		if err := rows.Scan(&it.productID, &it.quantity); err != nil {
			return err
		}
		items = append(items, it)
	}
	rows.Close()

	for _, it := range items {
		_, err := tx.Exec(
			`UPDATE products SET inventory = inventory + $1 WHERE id = $2`,
			it.quantity, it.productID,
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (s *Store) GetSellerForProduct(productID string) (string, string, error) {
	// Returns (sellerUserID, stripeAccountID) for the creator who owns the channel containing the product
	var sellerID, stripeAccountID string
	err := s.PG.QueryRow(
		`SELECT u.id, COALESCE(u.stripe_account_id, '')
		 FROM products p
		 JOIN channels c ON c.id = p.channel_id
		 JOIN users u ON u.id = c.creator_id
		 WHERE p.id = $1`, productID,
	).Scan(&sellerID, &stripeAccountID)
	return sellerID, stripeAccountID, err
}

func (s *Store) SetStripeOnboardingByAccountID(accountID string, complete bool) error {
	_, err := s.PG.Exec(
		`UPDATE users SET stripe_onboarding_complete = $1, updated_at = NOW() WHERE stripe_account_id = $2`,
		complete, accountID,
	)
	return err
}

// ── Shops ──

func (s *Store) CreateShop(shop *models.Shop) error {
	return s.PG.QueryRow(
		`INSERT INTO shops (owner_id, name, slug, description, logo_url, banner_url, shipping_from, stripe_account_id)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING id, created_at`,
		shop.OwnerID, shop.Name, shop.Slug, shop.Description,
		shop.LogoURL, shop.BannerURL, shop.ShippingFrom, nilIfEmpty(shop.StripeAccountID),
	).Scan(&shop.ID, &shop.CreatedAt)
}

func (s *Store) GetShopBySlug(slug string) (*models.Shop, error) {
	var sh models.Shop
	var stripeAcct sql.NullString
	err := s.PG.QueryRow(
		`SELECT id, owner_id, name, slug, description, logo_url, banner_url,
		        return_policy, shipping_from, COALESCE(stripe_account_id,''),
		        is_verified, status, created_at, updated_at
		 FROM shops WHERE slug = $1 AND status = 'active'`, slug,
	).Scan(&sh.ID, &sh.OwnerID, &sh.Name, &sh.Slug, &sh.Description,
		&sh.LogoURL, &sh.BannerURL, &sh.ReturnPolicy, &sh.ShippingFrom,
		&stripeAcct, &sh.IsVerified, &sh.Status, &sh.CreatedAt, &sh.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if stripeAcct.Valid {
		sh.StripeAccountID = stripeAcct.String
	}
	return &sh, nil
}

func (s *Store) GetShopByOwner(ownerID string) (*models.Shop, error) {
	var sh models.Shop
	var stripeAcct sql.NullString
	err := s.PG.QueryRow(
		`SELECT id, owner_id, name, slug, description, logo_url, banner_url,
		        return_policy, shipping_from, COALESCE(stripe_account_id,''),
		        is_verified, status, created_at, updated_at
		 FROM shops WHERE owner_id = $1`, ownerID,
	).Scan(&sh.ID, &sh.OwnerID, &sh.Name, &sh.Slug, &sh.Description,
		&sh.LogoURL, &sh.BannerURL, &sh.ReturnPolicy, &sh.ShippingFrom,
		&stripeAcct, &sh.IsVerified, &sh.Status, &sh.CreatedAt, &sh.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if stripeAcct.Valid {
		sh.StripeAccountID = stripeAcct.String
	}
	return &sh, nil
}

func (s *Store) UpdateShop(ownerID string, req *models.UpdateShopRequest) error {
	setClauses := []string{}
	args := []interface{}{}
	idx := 1

	if req.Name != nil {
		setClauses = append(setClauses, fmt.Sprintf("name = $%d", idx))
		args = append(args, *req.Name)
		idx++
	}
	if req.Description != nil {
		setClauses = append(setClauses, fmt.Sprintf("description = $%d", idx))
		args = append(args, *req.Description)
		idx++
	}
	if req.LogoURL != nil {
		setClauses = append(setClauses, fmt.Sprintf("logo_url = $%d", idx))
		args = append(args, *req.LogoURL)
		idx++
	}
	if req.BannerURL != nil {
		setClauses = append(setClauses, fmt.Sprintf("banner_url = $%d", idx))
		args = append(args, *req.BannerURL)
		idx++
	}
	if req.ReturnPolicy != nil {
		setClauses = append(setClauses, fmt.Sprintf("return_policy = $%d", idx))
		args = append(args, *req.ReturnPolicy)
		idx++
	}
	if req.ShippingFrom != nil {
		setClauses = append(setClauses, fmt.Sprintf("shipping_from = $%d", idx))
		args = append(args, *req.ShippingFrom)
		idx++
	}
	if len(setClauses) == 0 {
		return nil
	}

	setClauses = append(setClauses, "updated_at = NOW()")
	query := fmt.Sprintf(
		"UPDATE shops SET %s WHERE owner_id = $%d",
		strings.Join(setClauses, ", "), idx,
	)
	args = append(args, ownerID)
	_, err := s.PG.Exec(query, args...)
	return err
}

func (s *Store) GetShopProducts(shopID string) ([]models.Product, error) {
	rows, err := s.PG.Query(
		`SELECT id, COALESCE(channel_id::text,''), name, description, image_url,
		        price_cents, original_price_cents, inventory, sale_type, is_pinned,
		        COALESCE(condition,'new'), COALESCE(listing_status,'active'),
		        COALESCE(brand,''), created_at
		 FROM products WHERE shop_id = $1 AND listing_status = 'active'
		 ORDER BY created_at DESC`, shopID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		var p models.Product
		var origPrice sql.NullInt64
		if err := rows.Scan(
			&p.ID, &p.ChannelID, &p.Name, &p.Description, &p.ImageURL,
			&p.PriceCents, &origPrice, &p.Inventory, &p.SaleType, &p.IsPinned,
			&p.Condition, &p.ListingStatus, &p.Brand, &p.CreatedAt,
		); err != nil {
			return nil, err
		}
		if origPrice.Valid {
			p.OriginalPrice = &origPrice.Int64
		}
		p.ShopID = &shopID
		products = append(products, p)
	}
	return products, nil
}

func (s *Store) CreateShopProduct(shopID string, p *models.Product) error {
	return s.PG.QueryRow(
		`INSERT INTO products (shop_id, name, description, image_url, price_cents,
		  original_price_cents, inventory, sale_type, condition, brand, tags, listing_status)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active')
		 RETURNING id, created_at`,
		shopID, p.Name, p.Description, p.ImageURL, p.PriceCents,
		nilIfZeroInt64(p.OriginalPrice), p.Inventory, p.SaleType,
		p.Condition, p.Brand, pq.Array(p.Tags),
	).Scan(&p.ID, &p.CreatedAt)
}

func (s *Store) UpdateShopProduct(productID, shopID string, req *models.UpdateProductRequest) error {
	setClauses := []string{}
	args := []interface{}{}
	idx := 1

	if req.Name != nil {
		setClauses = append(setClauses, fmt.Sprintf("name = $%d", idx))
		args = append(args, *req.Name)
		idx++
	}
	if req.Description != nil {
		setClauses = append(setClauses, fmt.Sprintf("description = $%d", idx))
		args = append(args, *req.Description)
		idx++
	}
	if req.ImageURL != nil {
		setClauses = append(setClauses, fmt.Sprintf("image_url = $%d", idx))
		args = append(args, *req.ImageURL)
		idx++
	}
	if req.PriceCents != nil {
		setClauses = append(setClauses, fmt.Sprintf("price_cents = $%d", idx))
		args = append(args, *req.PriceCents)
		idx++
	}
	if req.Inventory != nil {
		setClauses = append(setClauses, fmt.Sprintf("inventory = $%d", idx))
		args = append(args, *req.Inventory)
		idx++
	}
	if len(setClauses) == 0 {
		return nil
	}

	setClauses = append(setClauses, "updated_at = NOW()")
	query := fmt.Sprintf(
		"UPDATE products SET %s WHERE id = $%d AND shop_id = $%d",
		strings.Join(setClauses, ", "), idx, idx+1,
	)
	args = append(args, productID, shopID)
	_, err := s.PG.Exec(query, args...)
	return err
}

func (s *Store) ArchiveShopProduct(productID, shopID string) error {
	_, err := s.PG.Exec(
		`UPDATE products SET listing_status = 'archived', updated_at = NOW()
		 WHERE id = $1 AND shop_id = $2`, productID, shopID,
	)
	return err
}

func (s *Store) UpgradeUserRole(userID, role string) error {
	_, err := s.PG.Exec(
		`UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2`, role, userID,
	)
	return err
}

// ── Marketplace Search ──

func (s *Store) SearchProducts(q models.MarketplaceQuery) ([]models.Product, error) {
	where := []string{"listing_status = 'active'"}
	args := []interface{}{}
	idx := 1

	if q.Q != "" {
		where = append(where, fmt.Sprintf("search_vector @@ plainto_tsquery('english', $%d)", idx))
		args = append(args, q.Q)
		idx++
	}
	if q.Category != "" {
		where = append(where, fmt.Sprintf("sale_type = $%d", idx))
		args = append(args, q.Category)
		idx++
	}
	if q.Condition != "" {
		where = append(where, fmt.Sprintf("condition = $%d", idx))
		args = append(args, q.Condition)
		idx++
	}
	if q.MinPrice > 0 {
		where = append(where, fmt.Sprintf("price_cents >= $%d", idx))
		args = append(args, q.MinPrice)
		idx++
	}
	if q.MaxPrice > 0 {
		where = append(where, fmt.Sprintf("price_cents <= $%d", idx))
		args = append(args, q.MaxPrice)
		idx++
	}

	orderBy := "created_at DESC"
	switch q.Sort {
	case "price_asc":
		orderBy = "price_cents ASC"
	case "price_desc":
		orderBy = "price_cents DESC"
	case "newest":
		orderBy = "created_at DESC"
	case "relevance":
		if q.Q != "" {
			orderBy = fmt.Sprintf("ts_rank(search_vector, plainto_tsquery('english', $1)) DESC")
		}
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
		        created_at
		 FROM products
		 WHERE %s
		 ORDER BY %s
		 LIMIT %d OFFSET %d`,
		strings.Join(where, " AND "), orderBy, limit, offset,
	)

	rows, err := s.PG.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		var p models.Product
		var origPrice sql.NullInt64
		var shopID, channelID sql.NullString
		if err := rows.Scan(
			&p.ID, &channelID, &shopID,
			&p.Name, &p.Description, &p.ImageURL, &p.PriceCents, &origPrice,
			&p.Inventory, &p.SaleType, &p.Condition, &p.Brand, &p.CreatedAt,
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
		products = append(products, p)
	}
	return products, nil
}

func (s *Store) GetTrendingProducts(limit int) ([]models.Product, error) {
	if limit <= 0 {
		limit = 20
	}
	rows, err := s.PG.Query(
		`SELECT p.id, COALESCE(p.channel_id::text,''), COALESCE(p.shop_id::text,''),
		        p.name, p.description, p.image_url, p.price_cents,
		        p.original_price_cents, p.inventory, p.sale_type,
		        COALESCE(p.condition,'new'), COALESCE(p.brand,''), p.created_at
		 FROM products p
		 LEFT JOIN order_items oi ON oi.product_id = p.id
		 LEFT JOIN orders o ON o.id = oi.order_id AND o.created_at > NOW() - INTERVAL '7 days'
		 WHERE p.listing_status = 'active'
		 GROUP BY p.id
		 ORDER BY COUNT(oi.id) DESC, p.created_at DESC
		 LIMIT $1`, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		var p models.Product
		var origPrice sql.NullInt64
		var shopID, channelID sql.NullString
		if err := rows.Scan(
			&p.ID, &channelID, &shopID,
			&p.Name, &p.Description, &p.ImageURL, &p.PriceCents,
			&origPrice, &p.Inventory, &p.SaleType,
			&p.Condition, &p.Brand, &p.CreatedAt,
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
		products = append(products, p)
	}
	return products, nil
}

// ── Marketplace Gateway ──

var categoryIcons = map[string]string{
	"Tech": "💻", "Fashion": "👗", "Collectibles": "🎴", "Beauty": "✨",
	"Food": "🍕", "Art": "🎨", "Fitness": "💪", "Automotive": "🚗",
	"Home": "🏠", "Luxury": "💎", "Pets": "🐾", "Travel": "✈️", "Electronics": "📱",
}

func (s *Store) GetMarketplaceGateway() (*models.MarketplaceGateway, error) {
	gw := &models.MarketplaceGateway{}

	// 1. Categories with product counts
	catRows, err := s.PG.Query(
		`SELECT COALESCE(c.category,'Other'), COUNT(p.id)
		 FROM channels c
		 LEFT JOIN products p ON p.channel_id = c.id AND p.listing_status = 'active'
		 GROUP BY c.category
		 UNION
		 SELECT 'Marketplace', COUNT(id) FROM products WHERE shop_id IS NOT NULL AND listing_status = 'active'
		 ORDER BY 2 DESC`)
	if err == nil {
		defer catRows.Close()
		for catRows.Next() {
			var cc models.CategoryCount
			if err := catRows.Scan(&cc.Name, &cc.Count); err == nil {
				// Also count shop products that match by category-ish
				cc.Icon = categoryIcons[cc.Name]
				if cc.Icon == "" {
					cc.Icon = "🛍️"
				}
				gw.Categories = append(gw.Categories, cc)
			}
		}
	}

	// 2. Live channels (top 10 by viewers)
	liveRows, err := s.PG.Query(
		`SELECT id, creator_id, title, COALESCE(description,''), category,
		        COALESCE(thumbnail_url,''), COALESCE(stream_url,''), status,
		        viewer_count, sale_type, is_primary, COALESCE(badge,''),
		        scheduled_at, created_at, updated_at
		 FROM channels WHERE status = 'LIVE'
		 ORDER BY viewer_count DESC LIMIT 10`)
	if err == nil {
		defer liveRows.Close()
		for liveRows.Next() {
			var ch models.Channel
			var schedAt *time.Time
			if err := liveRows.Scan(
				&ch.ID, &ch.CreatorID, &ch.Title, &ch.Description, &ch.Category,
				&ch.ThumbnailURL, &ch.StreamURL, &ch.Status,
				&ch.ViewerCount, &ch.SaleType, &ch.IsPrimary, &ch.Badge,
				&schedAt, &ch.CreatedAt, &ch.UpdatedAt,
			); err == nil {
				ch.ScheduledAt = schedAt
				gw.LiveChannels = append(gw.LiveChannels, ch)
			}
		}
		if len(gw.LiveChannels) > 0 {
			featured := gw.LiveChannels[0]
			gw.FeaturedLive = &featured
		}
	}

	// 3. Deals (products with original_price > price)
	gw.Deals, _ = s.scanProductRows(s.PG.Query(
		`SELECT id, COALESCE(channel_id::text,''), COALESCE(shop_id::text,''),
		        name, description, image_url, price_cents, original_price_cents,
		        inventory, sale_type, COALESCE(condition,'new'), COALESCE(brand,''), created_at
		 FROM products
		 WHERE listing_status = 'active'
		   AND original_price_cents IS NOT NULL
		   AND original_price_cents > price_cents
		 ORDER BY (original_price_cents - price_cents)::float / original_price_cents DESC
		 LIMIT 10`))

	// 4. New arrivals
	gw.NewArrivals, _ = s.scanProductRows(s.PG.Query(
		`SELECT id, COALESCE(channel_id::text,''), COALESCE(shop_id::text,''),
		        name, description, image_url, price_cents, original_price_cents,
		        inventory, sale_type, COALESCE(condition,'new'), COALESCE(brand,''), created_at
		 FROM products
		 WHERE listing_status = 'active'
		 ORDER BY created_at DESC
		 LIMIT 10`))

	// 5. Drops
	gw.Drops, _ = s.scanProductRows(s.PG.Query(
		`SELECT id, COALESCE(channel_id::text,''), COALESCE(shop_id::text,''),
		        name, description, image_url, price_cents, original_price_cents,
		        inventory, sale_type, COALESCE(condition,'new'), COALESCE(brand,''), created_at
		 FROM products
		 WHERE listing_status = 'active' AND sale_type = 'drop'
		 ORDER BY created_at DESC
		 LIMIT 10`))

	// 6. Auctions
	gw.Auctions, _ = s.scanProductRows(s.PG.Query(
		`SELECT id, COALESCE(channel_id::text,''), COALESCE(shop_id::text,''),
		        name, description, image_url, price_cents, original_price_cents,
		        inventory, sale_type, COALESCE(condition,'new'), COALESCE(brand,''), created_at
		 FROM products
		 WHERE listing_status = 'active' AND sale_type = 'auction'
		 ORDER BY price_cents DESC
		 LIMIT 10`))

	// 7. Trending (reuse existing)
	gw.Trending, _ = s.GetTrendingProducts(10)

	return gw, nil
}

// scanProductRows scans standard product rows into a slice.
func (s *Store) scanProductRows(rows *sql.Rows, err error) ([]models.Product, error) {
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var products []models.Product
	for rows.Next() {
		var p models.Product
		var origPrice sql.NullInt64
		var shopID, channelID sql.NullString
		if err := rows.Scan(
			&p.ID, &channelID, &shopID,
			&p.Name, &p.Description, &p.ImageURL, &p.PriceCents,
			&origPrice, &p.Inventory, &p.SaleType,
			&p.Condition, &p.Brand, &p.CreatedAt,
		); err != nil {
			return products, err
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
		products = append(products, p)
	}
	return products, nil
}

// ── Cart ──

func (s *Store) GetOrCreateCart(userID string) (*models.Cart, error) {
	var cart models.Cart
	err := s.PG.QueryRow(
		`INSERT INTO carts (user_id) VALUES ($1)
		 ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
		 RETURNING id, user_id, created_at`, userID,
	).Scan(&cart.ID, &cart.UserID, &cart.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &cart, nil
}

func (s *Store) GetCartWithItems(userID string) (*models.Cart, error) {
	cart, err := s.GetOrCreateCart(userID)
	if err != nil {
		return nil, err
	}

	rows, err := s.PG.Query(
		`SELECT ci.id, ci.cart_id, ci.product_id, ci.quantity, ci.added_at,
		        p.name, p.image_url, p.price_cents, p.inventory, p.sale_type,
		        COALESCE(p.shop_id::text,'')
		 FROM cart_items ci
		 JOIN products p ON p.id = ci.product_id
		 WHERE ci.cart_id = $1
		 ORDER BY ci.added_at DESC`, cart.ID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	cart.Items = []models.CartItem{}
	for rows.Next() {
		var ci models.CartItem
		var prod models.Product
		var shopID sql.NullString
		if err := rows.Scan(
			&ci.ID, &ci.CartID, &ci.ProductID, &ci.Quantity, &ci.AddedAt,
			&prod.Name, &prod.ImageURL, &prod.PriceCents, &prod.Inventory, &prod.SaleType,
			&shopID,
		); err != nil {
			return nil, err
		}
		prod.ID = ci.ProductID
		if shopID.Valid && shopID.String != "" {
			prod.ShopID = &shopID.String
		}
		ci.Product = &prod
		cart.Items = append(cart.Items, ci)
	}
	return cart, nil
}

func (s *Store) AddCartItem(cartID, productID string, quantity int) (*models.CartItem, error) {
	var ci models.CartItem
	err := s.PG.QueryRow(
		`INSERT INTO cart_items (cart_id, product_id, quantity)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (cart_id, product_id) DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity
		 RETURNING id, cart_id, product_id, quantity, added_at`,
		cartID, productID, quantity,
	).Scan(&ci.ID, &ci.CartID, &ci.ProductID, &ci.Quantity, &ci.AddedAt)
	return &ci, err
}

func (s *Store) UpdateCartItem(itemID, cartID string, quantity int) error {
	_, err := s.PG.Exec(
		`UPDATE cart_items SET quantity = $1 WHERE id = $2 AND cart_id = $3`,
		quantity, itemID, cartID,
	)
	return err
}

func (s *Store) RemoveCartItem(itemID, cartID string) error {
	_, err := s.PG.Exec(
		`DELETE FROM cart_items WHERE id = $1 AND cart_id = $2`, itemID, cartID,
	)
	return err
}

// ── Shipping Addresses ──

func (s *Store) CreateShippingAddress(addr *models.ShippingAddress) error {
	return s.PG.QueryRow(
		`INSERT INTO shipping_addresses (user_id, full_name, address_line1, address_line2, city, state, zip_code, country, phone, is_default)
		 VALUES ($1, $2, $3, NULLIF($4,''), $5, $6, $7, 'US', NULLIF($8,''), $9)
		 RETURNING id, created_at`,
		addr.UserID, addr.FullName, addr.AddressLine1, addr.AddressLine2,
		addr.City, addr.State, addr.ZipCode, addr.Phone, addr.IsDefault,
	).Scan(&addr.ID, &addr.CreatedAt)
}

func (s *Store) GetShippingAddresses(userID string) ([]models.ShippingAddress, error) {
	rows, err := s.PG.Query(
		`SELECT id, user_id, full_name, address_line1, COALESCE(address_line2,''), city, state, zip_code, country, COALESCE(phone,''), is_default, created_at
		 FROM shipping_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC`, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var addrs []models.ShippingAddress
	for rows.Next() {
		var a models.ShippingAddress
		if err := rows.Scan(&a.ID, &a.UserID, &a.FullName, &a.AddressLine1, &a.AddressLine2, &a.City, &a.State, &a.ZipCode, &a.Country, &a.Phone, &a.IsDefault, &a.CreatedAt); err != nil {
			return nil, err
		}
		addrs = append(addrs, a)
	}
	return addrs, nil
}

// ── Coupons ──

func (s *Store) GetCouponByCode(code string) (*models.Coupon, error) {
	c := &models.Coupon{}
	var maxUses sql.NullInt32
	var expiresAt sql.NullTime
	err := s.PG.QueryRow(
		`SELECT id, code, description, discount_type, discount_value,
		        min_order_cents, max_uses, current_uses, starts_at, expires_at,
		        is_active, created_at
		 FROM coupons WHERE UPPER(code) = UPPER($1)`, code,
	).Scan(&c.ID, &c.Code, &c.Description, &c.DiscountType, &c.DiscountValue,
		&c.MinOrderCents, &maxUses, &c.CurrentUses, &c.StartsAt, &expiresAt,
		&c.IsActive, &c.CreatedAt)
	if err != nil {
		return nil, err
	}
	if maxUses.Valid {
		v := int(maxUses.Int32)
		c.MaxUses = &v
	}
	if expiresAt.Valid {
		c.ExpiresAt = &expiresAt.Time
	}
	return c, nil
}

func (s *Store) IncrementCouponUses(couponID string) error {
	_, err := s.PG.Exec(
		`UPDATE coupons SET current_uses = current_uses + 1 WHERE id = $1`, couponID,
	)
	return err
}

// ── Marketplace Checkout (multi-item with shipping/tax) ──

func (s *Store) MarketplaceCheckoutAtomic(o *models.Order) error {
	tx, err := s.PG.Begin()
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	// Lock and verify inventory for each item
	for _, item := range o.Items {
		var inventory int
		err := tx.QueryRow(
			`SELECT inventory FROM products WHERE id = $1 FOR UPDATE`, item.ProductID,
		).Scan(&inventory)
		if err != nil {
			return fmt.Errorf("product %s not found", item.ProductID)
		}
		if inventory < item.Quantity {
			return fmt.Errorf("insufficient inventory for product %s", item.ProductID)
		}
		_, err = tx.Exec(
			`UPDATE products SET inventory = inventory - $1 WHERE id = $2`,
			item.Quantity, item.ProductID,
		)
		if err != nil {
			return fmt.Errorf("decrement inventory: %w", err)
		}
	}

	// Create order with shipping/tax fields
	err = tx.QueryRow(
		`INSERT INTO orders (user_id, channel_id, seller_id, status, total_cents, subtotal_cents,
		  shipping_cents, tax_cents, shipping_address_id, shipping_method, email,
		  platform_fee_cents, stripe_payment_id, stripe_client_secret, idempotency_key,
		  coupon_id, discount_cents)
		 VALUES (NULLIF($1,'')::uuid, NULLIF($2,'')::uuid, NULLIF($3,'')::uuid, $4, $5, $6, $7, $8, NULLIF($9,'')::uuid, NULLIF($10,''),
		  NULLIF($11,''), $12, $13, $14, NULLIF($15,''), NULLIF($16,'')::uuid, $17)
		 RETURNING id, created_at`,
		o.UserID, o.ChannelID, o.SellerID, o.Status, o.TotalCents, o.SubtotalCents,
		o.ShippingCents, o.TaxCents, o.ShippingAddressID, o.ShippingMethod, o.Email,
		o.PlatformFeeCents, o.StripePaymentID, o.StripeClientSecret, o.IdempotencyKey,
		o.CouponID, o.DiscountCents,
	).Scan(&o.ID, &o.CreatedAt)
	if err != nil {
		return fmt.Errorf("create order: %w", err)
	}

	// Create order items
	for i := range o.Items {
		item := &o.Items[i]
		item.OrderID = o.ID
		err = tx.QueryRow(
			`INSERT INTO order_items (order_id, product_id, quantity, price_cents)
			 VALUES ($1, $2, $3, $4) RETURNING id`,
			item.OrderID, item.ProductID, item.Quantity, item.PriceCents,
		).Scan(&item.ID)
		if err != nil {
			return fmt.Errorf("create order item: %w", err)
		}
	}

	return tx.Commit()
}

// ── Helpers ──

func nilIfEmpty(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

func envInt(key string, defaultVal int) int {
	v := os.Getenv(key)
	if v == "" {
		return defaultVal
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return defaultVal
	}
	return n
}

func nilIfZeroInt64(v *int64) interface{} {
	if v == nil || *v == 0 {
		return nil
	}
	return *v
}
