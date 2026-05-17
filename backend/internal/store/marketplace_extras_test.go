package store

import (
	"testing"

	"greggie/backend/internal/models"
)

// ── Pure helper tests (no DB) ──

func TestSlugify(t *testing.T) {
	cases := []struct {
		in, want string
	}{
		{"", "shop"},
		{"Cool Store", "cool-store"},
		{"  spaced  out  ", "spaced-out"},
		{"!!!", "shop"},
		{"Jane's Boutique #1", "jane-s-boutique-1"},
		{"ALL CAPS HERE", "all-caps-here"},
	}
	for _, c := range cases {
		got := slugify(c.in)
		if got != c.want {
			t.Errorf("slugify(%q) = %q, want %q", c.in, got, c.want)
		}
	}

	// truncation
	long := slugify("a-very-long-name-that-keeps-going-and-going-past-forty-chars")
	if len(long) > 40 {
		t.Errorf("slugify did not truncate: len=%d", len(long))
	}
}

func TestRandomSuffix(t *testing.T) {
	a := randomSuffix()
	b := randomSuffix()
	if len(a) != 6 || len(b) != 6 {
		t.Errorf("randomSuffix length = %d/%d, want 6", len(a), len(b))
	}
	if a == b {
		t.Errorf("randomSuffix not random: got %q twice", a)
	}
}

// ── Integration tests (need TEST_DATABASE_URL) ──

func makeBuyer(t *testing.T, s *Store, suffix string) *models.User {
	t.Helper()
	u := &models.User{
		Username:     "mp_" + suffix,
		DisplayName:  "MP " + suffix,
		Email:        "mp_" + suffix + "@test.com",
		PasswordHash: "$2a$10$fakehash",
		Role:         "buyer",
	}
	if err := s.CreateUser(u); err != nil {
		t.Fatalf("CreateUser(%s): %v", suffix, err)
	}
	return u
}

func TestEnsureSellerArtifactsForListing_Idempotent(t *testing.T) {
	s := getTestDB(t)
	defer s.PG.Close()
	cleanup(t, s)

	u := makeBuyer(t, s, "ensure1")

	shop1, err := s.EnsureSellerArtifactsForListing(u.ID)
	if err != nil {
		t.Fatalf("first ensure: %v", err)
	}
	if shop1 == nil || shop1.ID == "" {
		t.Fatal("expected shop with ID")
	}

	// MSP row was created.
	sp, err := s.GetSellerProgram(u.ID, "msp")
	if err != nil || sp == nil {
		t.Fatalf("expected msp program after ensure: %v", err)
	}
	if sp.Status != "active" {
		t.Errorf("expected msp status=active, got %s", sp.Status)
	}
	if sp.AgreementVersion != "1.0-implicit" {
		t.Errorf("expected implicit agreement, got %s", sp.AgreementVersion)
	}

	// Role upgraded buyer -> seller.
	refreshed, _ := s.GetUserByID(u.ID)
	if refreshed.Role != "seller" {
		t.Errorf("expected role=seller, got %s", refreshed.Role)
	}

	// Second call must return the same shop, not create a new one.
	shop2, err := s.EnsureSellerArtifactsForListing(u.ID)
	if err != nil {
		t.Fatalf("second ensure: %v", err)
	}
	if shop2.ID != shop1.ID {
		t.Errorf("ensure not idempotent: %s != %s", shop2.ID, shop1.ID)
	}

	// Slug should be username-based + 6 hex.
	if len(shop1.Slug) < len("mp_ensure1")+1+6 {
		t.Errorf("unexpected slug length: %s", shop1.Slug)
	}
}

func TestSaveUnsaveAndGetSavedProducts(t *testing.T) {
	s := getTestDB(t)
	defer s.PG.Close()
	cleanup(t, s)

	u := makeBuyer(t, s, "saver")
	shop, err := s.EnsureSellerArtifactsForListing(u.ID)
	if err != nil {
		t.Fatalf("ensure shop: %v", err)
	}

	prod := &models.Product{
		Name: "Test Item", Description: "desc", ImageURL: "https://img/x.jpg",
		PriceCents: 1999, Inventory: 5, SaleType: "buy_now",
		Condition: "new", Category: "Tech",
	}
	if err := s.CreateShopProductWithLocation(shop.ID, prod, LocationOverride{Zip: "94103"}); err != nil {
		t.Fatalf("CreateShopProductWithLocation: %v", err)
	}

	// Not saved initially.
	saved, err := s.IsProductSaved(u.ID, prod.ID)
	if err != nil {
		t.Fatalf("IsProductSaved: %v", err)
	}
	if saved {
		t.Error("expected product not saved initially")
	}

	if err := s.SaveProduct(u.ID, prod.ID); err != nil {
		t.Fatalf("SaveProduct: %v", err)
	}

	// Idempotent — second save is a no-op via ON CONFLICT.
	if err := s.SaveProduct(u.ID, prod.ID); err != nil {
		t.Fatalf("SaveProduct (second): %v", err)
	}

	saved, _ = s.IsProductSaved(u.ID, prod.ID)
	if !saved {
		t.Error("expected product saved")
	}

	list, err := s.GetSavedProducts(u.ID, 50, 0)
	if err != nil {
		t.Fatalf("GetSavedProducts: %v", err)
	}
	if len(list) != 1 || list[0].ID != prod.ID {
		t.Errorf("expected 1 saved product %s, got %d items", prod.ID, len(list))
	}

	if err := s.UnsaveProduct(u.ID, prod.ID); err != nil {
		t.Fatalf("UnsaveProduct: %v", err)
	}
	saved, _ = s.IsProductSaved(u.ID, prod.ID)
	if saved {
		t.Error("expected product not saved after unsave")
	}
}

func TestGetRecentProducts_GeoBoundingBox(t *testing.T) {
	s := getTestDB(t)
	defer s.PG.Close()
	cleanup(t, s)

	u := makeBuyer(t, s, "geo")
	shop, err := s.EnsureSellerArtifactsForListing(u.ID)
	if err != nil {
		t.Fatalf("ensure shop: %v", err)
	}

	// Three products: SF (near), LA (far ~560km), NYC (very far).
	sfLat, sfLng := 37.7749, -122.4194
	laLat, laLng := 34.0522, -118.2437
	nyLat, nyLng := 40.7128, -74.0060

	mk := func(name string, lat, lng float64) *models.Product {
		p := &models.Product{
			Name: name, Description: "x", ImageURL: "https://img/x.jpg",
			PriceCents: 1000, Inventory: 1, SaleType: "buy_now",
			Condition: "new", Category: "Tech",
		}
		if err := s.CreateShopProductWithLocation(shop.ID, p, LocationOverride{
			Zip: "00000", Lat: &lat, Lng: &lng,
		}); err != nil {
			t.Fatalf("CreateShopProductWithLocation(%s): %v", name, err)
		}
		return p
	}
	sfProd := mk("SF item", sfLat, sfLng)
	mk("LA item", laLat, laLng)
	mk("NYC item", nyLat, nyLng)

	// 50km around SF → only SF item.
	near, err := s.GetRecentProducts(RecentProductsQuery{
		Limit: 50, Lat: sfLat, Lng: sfLng, RadiusKm: 50,
	})
	if err != nil {
		t.Fatalf("GetRecentProducts (near): %v", err)
	}
	if len(near) != 1 || near[0].ID != sfProd.ID {
		t.Errorf("expected 1 SF item near 50km, got %d", len(near))
	}

	// 1000km around SF → SF + LA.
	mid, err := s.GetRecentProducts(RecentProductsQuery{
		Limit: 50, Lat: sfLat, Lng: sfLng, RadiusKm: 1000,
	})
	if err != nil {
		t.Fatalf("GetRecentProducts (mid): %v", err)
	}
	if len(mid) != 2 {
		t.Errorf("expected 2 items within 1000km of SF, got %d", len(mid))
	}

	// No geo → all three.
	all, err := s.GetRecentProducts(RecentProductsQuery{Limit: 50})
	if err != nil {
		t.Fatalf("GetRecentProducts (all): %v", err)
	}
	if len(all) != 3 {
		t.Errorf("expected 3 items total, got %d", len(all))
	}

	// Category filter.
	all[0].Category = "Tech"
	tech, err := s.GetRecentProducts(RecentProductsQuery{Limit: 50, Category: "Tech"})
	if err != nil {
		t.Fatalf("GetRecentProducts (cat): %v", err)
	}
	if len(tech) != 3 {
		t.Errorf("expected 3 Tech items, got %d", len(tech))
	}
	none, err := s.GetRecentProducts(RecentProductsQuery{Limit: 50, Category: "Fashion"})
	if err != nil {
		t.Fatalf("GetRecentProducts (cat=Fashion): %v", err)
	}
	if len(none) != 0 {
		t.Errorf("expected 0 Fashion items, got %d", len(none))
	}

	// Ordering is newest-first (DESC by created_at).
	if all[0].Name != "NYC item" {
		t.Errorf("expected newest-first (NYC), got %s", all[0].Name)
	}
}
