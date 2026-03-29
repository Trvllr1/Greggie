package database

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"greggie/backend/internal/scraper"

	_ "github.com/lib/pq"
	"github.com/redis/go-redis/v9"
)

// DB wraps Postgres and Redis connections.
type DB struct {
	pg  *sql.DB
	rdb *redis.Client
	ctx context.Context
}

// New initializes Postgres and Redis connections.
func New() (*DB, error) {
	pgURL := os.Getenv("DATABASE_URL")
	if pgURL == "" {
		pgURL = "postgres://localhost:5432/greggie?sslmode=disable"
	}

	pg, err := sql.Open("postgres", pgURL)
	if err != nil {
		return nil, fmt.Errorf("postgres open: %w", err)
	}
	if err := pg.Ping(); err != nil {
		return nil, fmt.Errorf("postgres ping: %w", err)
	}

	if err := migrate(pg); err != nil {
		return nil, fmt.Errorf("migration: %w", err)
	}

	redisAddr := os.Getenv("REDIS_URL")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}

	rdb := redis.NewClient(&redis.Options{Addr: redisAddr})

	return &DB{pg: pg, rdb: rdb, ctx: context.Background()}, nil
}

// Collection represents a user-created collection.
type Collection struct {
	ID        string `json:"id"`
	UserID    string `json:"user_id,omitempty"`
	Name      string `json:"name"`
	Emoji     string `json:"emoji"`
	ItemCount int    `json:"item_count"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

// StackItem represents a URL staged in the Share Stack for triage.
type StackItem struct {
	ID        string          `json:"id"`
	UserID    string          `json:"user_id,omitempty"`
	URL       string          `json:"url"`
	Source    scraper.Source  `json:"source"`
	Content   scraper.Content `json:"content"`
	Status    string          `json:"status"`
	CreatedAt string          `json:"created_at"`
}

func migrate(pg *sql.DB) error {
	_, err := pg.Exec(`
		CREATE TABLE IF NOT EXISTS feed_items (
			id          TEXT PRIMARY KEY,
			user_id     TEXT,
			source      JSONB NOT NULL,
			content     JSONB NOT NULL,
			collected_at TIMESTAMPTZ DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_feed_user ON feed_items(user_id);
		CREATE INDEX IF NOT EXISTS idx_feed_time ON feed_items(collected_at DESC);

		CREATE TABLE IF NOT EXISTS collections (
			id         TEXT PRIMARY KEY,
			user_id    TEXT,
			name       TEXT NOT NULL,
			emoji      TEXT DEFAULT '',
			created_at TIMESTAMPTZ DEFAULT NOW(),
			updated_at TIMESTAMPTZ DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_collections_user ON collections(user_id);

		CREATE TABLE IF NOT EXISTS collection_items (
			collection_id TEXT REFERENCES collections(id) ON DELETE CASCADE,
			feed_item_id  TEXT REFERENCES feed_items(id) ON DELETE CASCADE,
			added_at      TIMESTAMPTZ DEFAULT NOW(),
			PRIMARY KEY (collection_id, feed_item_id)
		);
		CREATE INDEX IF NOT EXISTS idx_ci_collection ON collection_items(collection_id);
		CREATE INDEX IF NOT EXISTS idx_ci_feeditem ON collection_items(feed_item_id);

		CREATE TABLE IF NOT EXISTS share_stack (
			id         TEXT PRIMARY KEY,
			user_id    TEXT,
			url        TEXT NOT NULL,
			source     JSONB,
			content    JSONB,
			status     TEXT DEFAULT 'pending',
			created_at TIMESTAMPTZ DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_stack_user_status ON share_stack(user_id, status);
		CREATE INDEX IF NOT EXISTS idx_stack_created ON share_stack(created_at DESC);
	`)
	return err
}

// SaveFeedItem persists an item to Postgres and invalidates the Redis cache.
func (d *DB) SaveFeedItem(item *scraper.FeedItem) error {
	srcJSON, _ := json.Marshal(item.Source)
	cntJSON, _ := json.Marshal(item.Content)

	_, err := d.pg.Exec(
		`INSERT INTO feed_items (id, user_id, source, content, collected_at)
		 VALUES ($1, $2, $3, $4, $5)
		 ON CONFLICT (id) DO NOTHING`,
		item.ID, item.UserID, srcJSON, cntJSON, item.CollectedAt,
	)
	if err != nil {
		return err
	}

	// Invalidate feed cache
	d.rdb.Del(d.ctx, "feed:global")
	if item.UserID != "" {
		d.rdb.Del(d.ctx, "feed:"+item.UserID)
	}
	return nil
}

// GetFeed returns feed items with cursor-based pagination.
// cursor is an RFC3339 timestamp; items older than cursor are returned.
// limit controls page size (default 20, max 50).
func (d *DB) GetFeed(userID, cursor string, limit int) ([]scraper.FeedItem, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	// Only cache the first page (no cursor) — paginated requests hit Postgres directly
	cacheKey := ""
	if cursor == "" {
		cacheKey = "feed:global"
		if userID != "" {
			cacheKey = "feed:" + userID
		}
		cached, err := d.rdb.Get(d.ctx, cacheKey).Result()
		if err == nil {
			var items []scraper.FeedItem
			if json.Unmarshal([]byte(cached), &items) == nil {
				return items, nil
			}
		}
	}

	// Build query with optional filters
	query := `SELECT id, user_id, source, content, collected_at FROM feed_items`
	args := []interface{}{}
	conditions := []string{}
	argIdx := 1

	if userID != "" {
		conditions = append(conditions, fmt.Sprintf("user_id = $%d", argIdx))
		args = append(args, userID)
		argIdx++
	}
	if cursor != "" {
		conditions = append(conditions, fmt.Sprintf("collected_at < $%d", argIdx))
		args = append(args, cursor)
		argIdx++
	}
	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}
	query += fmt.Sprintf(` ORDER BY collected_at DESC LIMIT $%d`, argIdx)
	args = append(args, limit)

	rows, err := d.pg.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []scraper.FeedItem
	for rows.Next() {
		var item scraper.FeedItem
		var srcJSON, cntJSON []byte
		var collectedAt sql.NullTime

		if err := rows.Scan(&item.ID, &item.UserID, &srcJSON, &cntJSON, &collectedAt); err != nil {
			return nil, err
		}
		json.Unmarshal(srcJSON, &item.Source)
		json.Unmarshal(cntJSON, &item.Content)
		if collectedAt.Valid {
			item.CollectedAt = collectedAt.Time.Format(time.RFC3339)
		}
		items = append(items, item)
	}

	// Write first page to Redis with 5-minute TTL
	if cacheKey != "" {
		if data, err := json.Marshal(items); err == nil {
			d.rdb.Set(d.ctx, cacheKey, data, 5*time.Minute)
		}
	}

	return items, nil
}

// DeleteFeedItem removes a feed item by ID and invalidates the cache.
func (d *DB) DeleteFeedItem(id string) error {
	result, err := d.pg.Exec(`DELETE FROM feed_items WHERE id = $1`, id)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("not found")
	}
	d.rdb.Del(d.ctx, "feed:global")
	return nil
}

// Close tears down both connections.
func (d *DB) Close() {
	d.pg.Close()
	d.rdb.Close()
}

// Ping checks Postgres and Redis connectivity.
func (d *DB) Ping() error {
	if err := d.pg.Ping(); err != nil {
		return fmt.Errorf("postgres: %w", err)
	}
	if err := d.rdb.Ping(d.ctx).Err(); err != nil {
		return fmt.Errorf("redis: %w", err)
	}
	return nil
}

// ── Collections CRUD ──

// CreateCollection creates a new collection.
func (d *DB) CreateCollection(id, userID, name, emoji string) (*Collection, error) {
	now := time.Now().UTC().Format(time.RFC3339)
	_, err := d.pg.Exec(
		`INSERT INTO collections (id, user_id, name, emoji, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $5)`,
		id, userID, name, emoji, now,
	)
	if err != nil {
		return nil, err
	}
	return &Collection{ID: id, UserID: userID, Name: name, Emoji: emoji, ItemCount: 0, CreatedAt: now, UpdatedAt: now}, nil
}

// GetCollections returns all collections with item counts.
func (d *DB) GetCollections(userID string) ([]Collection, error) {
	rows, err := d.pg.Query(`
		SELECT c.id, c.user_id, c.name, c.emoji, c.created_at, c.updated_at,
		       COUNT(ci.feed_item_id) AS item_count
		FROM collections c
		LEFT JOIN collection_items ci ON ci.collection_id = c.id
		WHERE c.user_id = $1 OR c.user_id IS NULL OR $1 = ''
		GROUP BY c.id
		ORDER BY c.updated_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var collections []Collection
	for rows.Next() {
		var c Collection
		var createdAt, updatedAt sql.NullTime
		if err := rows.Scan(&c.ID, &c.UserID, &c.Name, &c.Emoji, &createdAt, &updatedAt, &c.ItemCount); err != nil {
			return nil, err
		}
		if createdAt.Valid {
			c.CreatedAt = createdAt.Time.Format(time.RFC3339)
		}
		if updatedAt.Valid {
			c.UpdatedAt = updatedAt.Time.Format(time.RFC3339)
		}
		collections = append(collections, c)
	}
	return collections, nil
}

// GetCollectionWithItems returns a collection and its feed items.
func (d *DB) GetCollectionWithItems(collectionID string) (*Collection, []scraper.FeedItem, error) {
	// Get collection metadata
	var c Collection
	var createdAt, updatedAt sql.NullTime
	err := d.pg.QueryRow(`SELECT id, user_id, name, emoji, created_at, updated_at FROM collections WHERE id = $1`, collectionID).
		Scan(&c.ID, &c.UserID, &c.Name, &c.Emoji, &createdAt, &updatedAt)
	if err != nil {
		return nil, nil, err
	}
	if createdAt.Valid {
		c.CreatedAt = createdAt.Time.Format(time.RFC3339)
	}
	if updatedAt.Valid {
		c.UpdatedAt = updatedAt.Time.Format(time.RFC3339)
	}

	// Get items in this collection
	rows, err := d.pg.Query(`
		SELECT fi.id, fi.user_id, fi.source, fi.content, fi.collected_at
		FROM collection_items ci
		JOIN feed_items fi ON fi.id = ci.feed_item_id
		WHERE ci.collection_id = $1
		ORDER BY ci.added_at DESC
	`, collectionID)
	if err != nil {
		return &c, nil, err
	}
	defer rows.Close()

	var items []scraper.FeedItem
	for rows.Next() {
		var item scraper.FeedItem
		var srcJSON, cntJSON []byte
		var collectedAt sql.NullTime
		if err := rows.Scan(&item.ID, &item.UserID, &srcJSON, &cntJSON, &collectedAt); err != nil {
			return &c, nil, err
		}
		json.Unmarshal(srcJSON, &item.Source)
		json.Unmarshal(cntJSON, &item.Content)
		if collectedAt.Valid {
			item.CollectedAt = collectedAt.Time.Format(time.RFC3339)
		}
		items = append(items, item)
	}
	c.ItemCount = len(items)
	return &c, items, nil
}

// UpdateCollection updates a collection's name and emoji.
func (d *DB) UpdateCollection(id, name, emoji string) error {
	result, err := d.pg.Exec(
		`UPDATE collections SET name = $2, emoji = $3, updated_at = NOW() WHERE id = $1`,
		id, name, emoji,
	)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("not found")
	}
	return nil
}

// DeleteCollection removes a collection (CASCADE removes memberships).
func (d *DB) DeleteCollection(id string) error {
	result, err := d.pg.Exec(`DELETE FROM collections WHERE id = $1`, id)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("not found")
	}
	return nil
}

// AddItemToCollection adds a feed item to a collection.
func (d *DB) AddItemToCollection(collectionID, feedItemID string) error {
	_, err := d.pg.Exec(
		`INSERT INTO collection_items (collection_id, feed_item_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		collectionID, feedItemID,
	)
	if err != nil {
		return err
	}
	// Touch the collection's updated_at
	d.pg.Exec(`UPDATE collections SET updated_at = NOW() WHERE id = $1`, collectionID)
	return nil
}

// RemoveItemFromCollection removes a feed item from a collection.
func (d *DB) RemoveItemFromCollection(collectionID, feedItemID string) error {
	result, err := d.pg.Exec(
		`DELETE FROM collection_items WHERE collection_id = $1 AND feed_item_id = $2`,
		collectionID, feedItemID,
	)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("not found")
	}
	return nil
}

// ── Share Stack CRUD ──

// SaveStackItem stores an unfurled URL in the share stack.
func (d *DB) SaveStackItem(item *StackItem) error {
	srcJSON, _ := json.Marshal(item.Source)
	cntJSON, _ := json.Marshal(item.Content)
	_, err := d.pg.Exec(
		`INSERT INTO share_stack (id, user_id, url, source, content, status, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		item.ID, item.UserID, item.URL, srcJSON, cntJSON, item.Status, item.CreatedAt,
	)
	return err
}

// GetStack returns all pending share stack items.
func (d *DB) GetStack(userID string) ([]StackItem, error) {
	rows, err := d.pg.Query(`
		SELECT id, user_id, url, source, content, status, created_at
		FROM share_stack
		WHERE status = 'pending' AND (user_id = $1 OR user_id IS NULL OR $1 = '')
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []StackItem
	for rows.Next() {
		var s StackItem
		var srcJSON, cntJSON []byte
		var createdAt sql.NullTime
		if err := rows.Scan(&s.ID, &s.UserID, &s.URL, &srcJSON, &cntJSON, &s.Status, &createdAt); err != nil {
			return nil, err
		}
		json.Unmarshal(srcJSON, &s.Source)
		json.Unmarshal(cntJSON, &s.Content)
		if createdAt.Valid {
			s.CreatedAt = createdAt.Time.Format(time.RFC3339)
		}
		items = append(items, s)
	}
	return items, nil
}

// GetStackCount returns the number of pending share stack items.
func (d *DB) GetStackCount(userID string) (int, error) {
	var count int
	err := d.pg.QueryRow(`
		SELECT COUNT(*) FROM share_stack
		WHERE status = 'pending' AND (user_id = $1 OR user_id IS NULL OR $1 = '')
	`, userID).Scan(&count)
	return count, err
}

// AcceptStackItem moves a stack item to the feed (and optionally to a collection).
func (d *DB) AcceptStackItem(stackID, collectionID string) (*scraper.FeedItem, error) {
	tx, err := d.pg.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// Read the stack item
	var s StackItem
	var srcJSON, cntJSON []byte
	var createdAt sql.NullTime
	err = tx.QueryRow(`SELECT id, user_id, url, source, content, created_at FROM share_stack WHERE id = $1 AND status = 'pending'`, stackID).
		Scan(&s.ID, &s.UserID, &s.URL, &srcJSON, &cntJSON, &createdAt)
	if err != nil {
		return nil, fmt.Errorf("stack item not found or already processed")
	}
	json.Unmarshal(srcJSON, &s.Source)
	json.Unmarshal(cntJSON, &s.Content)

	// Create a feed item
	feedItem := &scraper.FeedItem{
		ID:          "feed-" + s.ID,
		UserID:      s.UserID,
		Source:      s.Source,
		Content:     s.Content,
		CollectedAt: time.Now().UTC().Format(time.RFC3339),
	}
	feedSrcJSON, _ := json.Marshal(feedItem.Source)
	feedCntJSON, _ := json.Marshal(feedItem.Content)

	_, err = tx.Exec(
		`INSERT INTO feed_items (id, user_id, source, content, collected_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
		feedItem.ID, feedItem.UserID, feedSrcJSON, feedCntJSON, feedItem.CollectedAt,
	)
	if err != nil {
		return nil, err
	}

	// Optionally add to collection
	if collectionID != "" {
		_, err = tx.Exec(
			`INSERT INTO collection_items (collection_id, feed_item_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
			collectionID, feedItem.ID,
		)
		if err != nil {
			return nil, err
		}
		tx.Exec(`UPDATE collections SET updated_at = NOW() WHERE id = $1`, collectionID)
	}

	// Mark stack item as accepted
	_, err = tx.Exec(`UPDATE share_stack SET status = 'accepted' WHERE id = $1`, stackID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	// Invalidate feed cache
	d.rdb.Del(d.ctx, "feed:global")
	if feedItem.UserID != "" {
		d.rdb.Del(d.ctx, "feed:"+feedItem.UserID)
	}

	return feedItem, nil
}

// DismissStackItem marks a stack item as dismissed.
func (d *DB) DismissStackItem(id string) error {
	result, err := d.pg.Exec(`UPDATE share_stack SET status = 'dismissed' WHERE id = $1 AND status = 'pending'`, id)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("not found or already processed")
	}
	return nil
}
