package store

import (
	"database/sql"
	"os"
	"testing"

	"greggie/backend/internal/models"

	_ "github.com/lib/pq"
)

// getTestDB establishes a connection to a test database.
// Set TEST_DATABASE_URL to run integration tests; otherwise these tests are skipped.
func getTestDB(t *testing.T) *Store {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL not set – skipping integration test")
	}
	pg, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	if err := pg.Ping(); err != nil {
		t.Fatalf("failed to ping test db: %v", err)
	}
	return &Store{PG: pg, Ctx: t.Context()}
}

// ── Helper function tests (no DB needed) ──

func TestNilIfEmpty(t *testing.T) {
	if nilIfEmpty("") != nil {
		t.Error("expected nil for empty string")
	}
	if nilIfEmpty("hello") != "hello" {
		t.Error("expected 'hello' for non-empty string")
	}
}

func TestPqStringArrayScanner(t *testing.T) {
	tests := []struct {
		name  string
		input interface{}
		want  []string
	}{
		{"nil", nil, []string{}},
		{"empty braces", []byte("{}"), []string{}},
		{"single", []byte("{Tech}"), []string{"Tech"}},
		{"multiple", []byte("{Tech,Fashion,Beauty}"), []string{"Tech", "Fashion", "Beauty"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var got []string
			scanner := pqStringArray(&got)
			if err := scanner.Scan(tt.input); err != nil {
				t.Fatalf("Scan error: %v", err)
			}
			if len(got) != len(tt.want) {
				t.Fatalf("got %v, want %v", got, tt.want)
			}
			for i := range got {
				if got[i] != tt.want[i] {
					t.Errorf("index %d: got %q, want %q", i, got[i], tt.want[i])
				}
			}
		})
	}
}

// ── Integration tests (require TEST_DATABASE_URL) ──

func TestCreateAndGetUser(t *testing.T) {
	s := getTestDB(t)
	defer s.PG.Close()

	cleanup(t, s)

	u := &models.User{
		Username:     "testuser",
		DisplayName:  "Test User",
		Email:        "test@example.com",
		PasswordHash: "$2a$10$fakehash",
		Role:         "viewer",
	}
	if err := s.CreateUser(u); err != nil {
		t.Fatalf("CreateUser: %v", err)
	}
	if u.ID == "" {
		t.Fatal("expected user ID to be set")
	}

	// Create wallet
	if err := s.CreateWallet(u.ID); err != nil {
		t.Fatalf("CreateWallet: %v", err)
	}

	// GetByEmail
	got, err := s.GetUserByEmail("test@example.com")
	if err != nil {
		t.Fatalf("GetUserByEmail: %v", err)
	}
	if got.Username != "testuser" {
		t.Errorf("expected username testuser, got %s", got.Username)
	}

	// GetByID
	got2, err := s.GetUserByID(u.ID)
	if err != nil {
		t.Fatalf("GetUserByID: %v", err)
	}
	if got2.Email != "test@example.com" {
		t.Errorf("expected email test@example.com, got %s", got2.Email)
	}
}

func TestChannelCRUD(t *testing.T) {
	s := getTestDB(t)
	defer s.PG.Close()

	cleanup(t, s)

	// Create a creator first
	u := &models.User{
		Username: "creator1", DisplayName: "Creator", Email: "creator@test.com",
		PasswordHash: "$2a$10$fakehash", Role: "creator",
	}
	if err := s.CreateUser(u); err != nil {
		t.Fatalf("CreateUser: %v", err)
	}

	ch := &models.Channel{
		CreatorID:   u.ID,
		Title:       "Test Channel",
		Description: "A test channel",
		Category:    "Tech",
		SaleType:    "buy_now",
	}
	if err := s.CreateChannel(ch); err != nil {
		t.Fatalf("CreateChannel: %v", err)
	}
	if ch.ID == "" {
		t.Fatal("expected channel ID to be set")
	}

	// Set to LIVE for rail/primary queries
	if err := s.UpdateChannelStatus(ch.ID, "LIVE"); err != nil {
		t.Fatalf("UpdateChannelStatus: %v", err)
	}

	// GetByID
	got, err := s.GetChannelByID(ch.ID)
	if err != nil {
		t.Fatalf("GetChannelByID: %v", err)
	}
	if got.Title != "Test Channel" {
		t.Errorf("expected title 'Test Channel', got %s", got.Title)
	}
	if got.Status != "LIVE" {
		t.Errorf("expected status LIVE, got %s", got.Status)
	}

	// GetChannelRail
	rail, err := s.GetChannelRail("", 10)
	if err != nil {
		t.Fatalf("GetChannelRail: %v", err)
	}
	if len(rail) == 0 {
		t.Error("expected at least 1 channel in rail")
	}

	// GetChannelRail with category filter
	railFiltered, err := s.GetChannelRail("Tech", 10)
	if err != nil {
		t.Fatalf("GetChannelRail(Tech): %v", err)
	}
	if len(railFiltered) == 0 {
		t.Error("expected at least 1 Tech channel")
	}

	// GetPrimaryChannel
	primary, err := s.GetPrimaryChannel()
	if err != nil {
		t.Fatalf("GetPrimaryChannel: %v", err)
	}
	if primary.ID != ch.ID {
		t.Errorf("expected primary to be %s, got %s", ch.ID, primary.ID)
	}

	// Delete
	if err := s.DeleteChannel(ch.ID); err != nil {
		t.Fatalf("DeleteChannel: %v", err)
	}
}

func TestProductAndInventory(t *testing.T) {
	s := getTestDB(t)
	defer s.PG.Close()

	cleanup(t, s)

	u := &models.User{
		Username: "seller1", DisplayName: "Seller", Email: "seller@test.com",
		PasswordHash: "$2a$10$fakehash", Role: "creator",
	}
	if err := s.CreateUser(u); err != nil {
		t.Fatalf("CreateUser: %v", err)
	}

	ch := &models.Channel{
		CreatorID: u.ID, Title: "Shop Channel", Category: "Fashion", SaleType: "buy_now",
	}
	if err := s.CreateChannel(ch); err != nil {
		t.Fatalf("CreateChannel: %v", err)
	}

	p := &models.Product{
		ChannelID: ch.ID, Name: "Test Sneakers", Description: "Cool shoes",
		ImageURL: "https://example.com/shoe.jpg", PriceCents: 9999,
		Inventory: 5, SaleType: "buy_now",
	}
	if err := s.CreateProduct(p); err != nil {
		t.Fatalf("CreateProduct: %v", err)
	}
	if p.ID == "" {
		t.Fatal("expected product ID")
	}

	// Get by channel
	products, err := s.GetProductsByChannel(ch.ID)
	if err != nil {
		t.Fatalf("GetProductsByChannel: %v", err)
	}
	if len(products) != 1 {
		t.Fatalf("expected 1 product, got %d", len(products))
	}
	if products[0].Name != "Test Sneakers" {
		t.Errorf("expected name 'Test Sneakers', got %s", products[0].Name)
	}

	// DecrementInventory success
	if err := s.DecrementInventory(p.ID, 3); err != nil {
		t.Fatalf("DecrementInventory(3): %v", err)
	}

	// Check inventory after decrement
	got, _ := s.GetProductByID(p.ID)
	if got.Inventory != 2 {
		t.Errorf("expected inventory 2, got %d", got.Inventory)
	}

	// DecrementInventory failure (insufficient)
	if err := s.DecrementInventory(p.ID, 10); err == nil {
		t.Error("expected error for insufficient inventory")
	}

	// Pin product
	if err := s.PinProduct(ch.ID, p.ID); err != nil {
		t.Fatalf("PinProduct: %v", err)
	}
	pinned, _ := s.GetProductByID(p.ID)
	if !pinned.IsPinned {
		t.Error("expected product to be pinned")
	}

	// Unpin all
	if err := s.PinProduct(ch.ID, ""); err != nil {
		t.Fatalf("PinProduct(unpin): %v", err)
	}
	unpinned, _ := s.GetProductByID(p.ID)
	if unpinned.IsPinned {
		t.Error("expected product to be unpinned")
	}
}

func TestCreateOrder(t *testing.T) {
	s := getTestDB(t)
	defer s.PG.Close()

	cleanup(t, s)

	// Setup: user + channel + product
	u := &models.User{
		Username: "buyer1", DisplayName: "Buyer", Email: "buyer@test.com",
		PasswordHash: "$2a$10$fakehash", Role: "viewer",
	}
	if err := s.CreateUser(u); err != nil {
		t.Fatalf("CreateUser: %v", err)
	}
	if err := s.CreateWallet(u.ID); err != nil {
		t.Fatalf("CreateWallet: %v", err)
	}

	creator := &models.User{
		Username: "merchant1", DisplayName: "Merchant", Email: "merchant@test.com",
		PasswordHash: "$2a$10$fakehash", Role: "creator",
	}
	if err := s.CreateUser(creator); err != nil {
		t.Fatalf("CreateUser: %v", err)
	}

	ch := &models.Channel{
		CreatorID: creator.ID, Title: "Checkout Channel", Category: "Tech", SaleType: "buy_now",
	}
	if err := s.CreateChannel(ch); err != nil {
		t.Fatalf("CreateChannel: %v", err)
	}

	p := &models.Product{
		ChannelID: ch.ID, Name: "Widget", PriceCents: 2500, Inventory: 10, SaleType: "buy_now",
	}
	if err := s.CreateProduct(p); err != nil {
		t.Fatalf("CreateProduct: %v", err)
	}

	// Create order
	o := &models.Order{
		UserID:     u.ID,
		ChannelID:  ch.ID,
		Status:     "pending",
		TotalCents: 2500,
		Items: []models.OrderItem{
			{ProductID: p.ID, Quantity: 1, PriceCents: 2500},
		},
	}
	if err := s.CreateOrder(o); err != nil {
		t.Fatalf("CreateOrder: %v", err)
	}
	if o.ID == "" {
		t.Fatal("expected order ID")
	}
	if len(o.Items) == 0 || o.Items[0].ID == "" {
		t.Fatal("expected order item ID")
	}
}

func TestFollowUnfollow(t *testing.T) {
	s := getTestDB(t)
	defer s.PG.Close()

	cleanup(t, s)

	u := &models.User{
		Username: "follower1", DisplayName: "Follower", Email: "follow@test.com",
		PasswordHash: "$2a$10$fakehash", Role: "viewer",
	}
	if err := s.CreateUser(u); err != nil {
		t.Fatalf("CreateUser: %v", err)
	}

	creator := &models.User{
		Username: "streamer1", DisplayName: "Streamer", Email: "stream@test.com",
		PasswordHash: "$2a$10$fakehash", Role: "creator",
	}
	if err := s.CreateUser(creator); err != nil {
		t.Fatalf("CreateUser: %v", err)
	}

	ch := &models.Channel{
		CreatorID: creator.ID, Title: "Follow Test", Category: "Art", SaleType: "buy_now",
	}
	if err := s.CreateChannel(ch); err != nil {
		t.Fatalf("CreateChannel: %v", err)
	}
	if err := s.UpdateChannelStatus(ch.ID, "LIVE"); err != nil {
		t.Fatalf("UpdateChannelStatus: %v", err)
	}

	// Follow
	if err := s.FollowChannel(u.ID, ch.ID); err != nil {
		t.Fatalf("FollowChannel: %v", err)
	}

	// Idempotent follow
	if err := s.FollowChannel(u.ID, ch.ID); err != nil {
		t.Fatalf("FollowChannel (idempotent): %v", err)
	}

	// Get following
	followed, err := s.GetFollowedChannels(u.ID)
	if err != nil {
		t.Fatalf("GetFollowedChannels: %v", err)
	}
	if len(followed) != 1 {
		t.Fatalf("expected 1 followed channel, got %d", len(followed))
	}

	// Unfollow
	if err := s.UnfollowChannel(u.ID, ch.ID); err != nil {
		t.Fatalf("UnfollowChannel: %v", err)
	}
	after, _ := s.GetFollowedChannels(u.ID)
	if len(after) != 0 {
		t.Errorf("expected 0 followed channels after unfollow, got %d", len(after))
	}
}

// cleanup truncates test tables in correct order (respecting FK constraints)
func cleanup(t *testing.T, s *Store) {
	t.Helper()
	tables := []string{"events", "order_items", "orders", "checkout_sessions", "follows",
		"products", "relay_entries", "channels", "wallets", "users"}
	for _, tbl := range tables {
		if _, err := s.PG.Exec("DELETE FROM " + tbl); err != nil {
			t.Logf("cleanup %s: %v", tbl, err)
		}
	}
}
