package handlers

import (
	"regexp"
	"strings"

	"greggie/backend/internal/middleware"
	"greggie/backend/internal/models"
	"greggie/backend/internal/store"

	"github.com/gofiber/fiber/v2"
)

type ShopHandler struct {
	Store *store.Store
}

var slugRe = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

// CreateShop creates a shop and upgrades the user to seller role.
func (h *ShopHandler) CreateShop(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	// Check if user already has a shop
	existing, _ := h.Store.GetShopByOwner(userID)
	if existing != nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "you already have a shop"})
	}

	var req models.CreateShopRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if req.Name == "" || req.Slug == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "name and slug required"})
	}
	req.Slug = strings.ToLower(strings.TrimSpace(req.Slug))
	if !slugRe.MatchString(req.Slug) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "slug must be lowercase alphanumeric with hyphens"})
	}

	// Copy Stripe account from user if they have one
	user, err := h.Store.GetUserByID(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to get user"})
	}

	shop := &models.Shop{
		OwnerID:         userID,
		Name:            req.Name,
		Slug:            req.Slug,
		Description:     req.Description,
		LogoURL:         req.LogoURL,
		BannerURL:       req.BannerURL,
		ShippingFrom:    req.ShippingFrom,
		StripeAccountID: user.StripeAccountID,
		Status:          "active",
	}
	if err := h.Store.CreateShop(shop); err != nil {
		if strings.Contains(err.Error(), "idx_shops_owner") || strings.Contains(err.Error(), "shops_slug_key") {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "shop name or slug already taken"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create shop"})
	}

	// Upgrade user to seller if currently buyer
	if user.Role == "buyer" {
		_ = h.Store.UpgradeUserRole(userID, "seller")
	}

	return c.Status(fiber.StatusCreated).JSON(shop)
}

// GetShopBySlug returns a public shop page by slug.
func (h *ShopHandler) GetShopBySlug(c *fiber.Ctx) error {
	slug := c.Params("slug")
	shop, err := h.Store.GetShopBySlug(slug)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "shop not found"})
	}

	products, _ := h.Store.GetShopProducts(shop.ID)
	if products == nil {
		products = []models.Product{}
	}
	shop.Products = products

	return c.JSON(shop)
}

// GetMyShop returns the current user's shop.
func (h *ShopHandler) GetMyShop(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	shop, err := h.Store.GetShopByOwner(userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "you don't have a shop yet"})
	}
	products, _ := h.Store.GetShopProducts(shop.ID)
	if products == nil {
		products = []models.Product{}
	}
	shop.Products = products
	return c.JSON(shop)
}

// UpdateMyShop updates the current user's shop.
func (h *ShopHandler) UpdateMyShop(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	var req models.UpdateShopRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if err := h.Store.UpdateShop(userID, &req); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update shop"})
	}
	return c.JSON(fiber.Map{"status": "updated"})
}

// ListMyProducts lists all products in the current user's shop.
func (h *ShopHandler) ListMyProducts(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	shop, err := h.Store.GetShopByOwner(userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "you don't have a shop"})
	}
	products, err := h.Store.GetShopProducts(shop.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to get products"})
	}
	if products == nil {
		products = []models.Product{}
	}
	return c.JSON(products)
}

// CreateProduct creates a new product in the user's shop.
func (h *ShopHandler) CreateProduct(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	shop, err := h.Store.GetShopByOwner(userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "create a shop first"})
	}

	var req models.CreateShopProductRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if req.Name == "" || req.PriceCents <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "name and price required"})
	}
	if req.SaleType == "" {
		req.SaleType = "buy_now"
	}
	if req.Condition == "" {
		req.Condition = "new"
	}

	product := &models.Product{
		Name:        req.Name,
		Description: req.Description,
		ImageURL:    req.ImageURL,
		PriceCents:  req.PriceCents,
		Inventory:   req.Inventory,
		SaleType:    req.SaleType,
		Condition:   req.Condition,
		Brand:       req.Brand,
		Tags:        req.Tags,
	}
	if req.OriginalPrice != nil {
		product.OriginalPrice = req.OriginalPrice
	}

	if err := h.Store.CreateShopProduct(shop.ID, product); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create product"})
	}
	product.ShopID = &shop.ID

	return c.Status(fiber.StatusCreated).JSON(product)
}

// UpdateProduct updates a product in the user's shop.
func (h *ShopHandler) UpdateProduct(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	productID := c.Params("id")
	shop, err := h.Store.GetShopByOwner(userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "shop not found"})
	}

	var req models.UpdateProductRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if err := h.Store.UpdateShopProduct(productID, shop.ID, &req); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update product"})
	}
	return c.JSON(fiber.Map{"status": "updated"})
}

// ArchiveProduct archives a product in the user's shop.
func (h *ShopHandler) ArchiveProduct(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	productID := c.Params("id")
	shop, err := h.Store.GetShopByOwner(userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "shop not found"})
	}
	if err := h.Store.ArchiveShopProduct(productID, shop.ID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to archive product"})
	}
	return c.JSON(fiber.Map{"status": "archived"})
}
