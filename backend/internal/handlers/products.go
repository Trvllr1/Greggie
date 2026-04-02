package handlers

import (
	"greggie/backend/internal/models"
	"greggie/backend/internal/store"
	"log"

	"github.com/gofiber/fiber/v2"
)

type ProductHandler struct {
	Store *store.Store
}

func (h *ProductHandler) GetByID(c *fiber.Ctx) error {
	id := c.Params("id")
	product, err := h.Store.GetProductByID(id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "product not found"})
	}
	return c.JSON(product)
}

func (h *ProductHandler) GetFullByID(c *fiber.Ctx) error {
	id := c.Params("id")
	product, err := h.Store.GetProductFullByID(id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "product not found"})
	}
	return c.JSON(product)
}

func (h *ProductHandler) GetByChannel(c *fiber.Ctx) error {
	channelID := c.Params("channelId")
	products, err := h.Store.GetProductsByChannel(channelID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load products"})
	}
	if products == nil {
		products = []models.Product{}
	}
	return c.JSON(products)
}

func (h *ProductHandler) GetReviews(c *fiber.Ctx) error {
	productID := c.Params("id")
	limit := c.QueryInt("limit", 10)
	offset := c.QueryInt("offset", 0)
	reviews, err := h.Store.GetProductReviews(productID, limit, offset)
	if err != nil {
		log.Printf("GetReviews error for %s: %v", productID, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load reviews"})
	}
	if reviews == nil {
		reviews = []models.ProductReview{}
	}
	return c.JSON(reviews)
}

func (h *ProductHandler) SubmitReview(c *fiber.Ctx) error {
	productID := c.Params("id")
	userID := c.Locals("userID").(string)

	var body struct {
		Rating int      `json:"rating"`
		Title  string   `json:"title"`
		Body   string   `json:"body"`
		Images []string `json:"images"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	if body.Rating < 1 || body.Rating > 5 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "rating must be 1-5"})
	}

	// Get user display name
	user, _ := h.Store.GetUserByID(userID)
	userName := "Anonymous"
	if user != nil {
		userName = user.DisplayName
	}

	userIDStr := userID

	review := &models.ProductReview{
		ProductID:        productID,
		UserID:           &userIDStr,
		UserName:         userName,
		Rating:           body.Rating,
		Title:            body.Title,
		Body:             body.Body,
		VerifiedPurchase: false,
		Images:           body.Images,
	}
	if err := h.Store.CreateProductReview(review); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to submit review"})
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"id": review.ID})
}

func (h *ProductHandler) MarkReviewHelpful(c *fiber.Ctx) error {
	reviewID := c.Params("reviewId")
	count, err := h.Store.MarkReviewHelpful(reviewID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update"})
	}
	return c.JSON(fiber.Map{"helpful_count": count})
}
