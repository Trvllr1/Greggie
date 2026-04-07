package handlers

import (
	"greggie/backend/internal/middleware"
	"greggie/backend/internal/models"
	"greggie/backend/internal/storage"
	"greggie/backend/internal/store"

	"github.com/gofiber/fiber/v2"
)

type UploadHandler struct {
	Store *store.Store
}

// PresignUpload generates a presigned S3 URL for the client to upload directly.
func (h *UploadHandler) PresignUpload(c *fiber.Ctx) error {
	if !storage.Enabled() {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "uploads not configured"})
	}

	userID := middleware.GetUserID(c)
	var req models.PresignRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if req.Filename == "" || req.ContentType == "" || req.EntityType == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "filename, content_type, and entity_type are required"})
	}

	validTypes := map[string]bool{"product": true, "channel": true, "user": true, "shop": true}
	if !validTypes[req.EntityType] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "entity_type must be product, channel, user, or shop"})
	}

	// Validate content type (images + video only)
	validContent := map[string]bool{
		"image/jpeg": true, "image/png": true, "image/webp": true, "image/gif": true,
		"video/mp4": true, "video/webm": true,
	}
	if !validContent[req.ContentType] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "unsupported content type"})
	}

	key := storage.BuildStorageKey(req.EntityType, req.EntityID, req.Filename)
	uploadURL, publicURL, err := storage.GeneratePresignedUpload(key, req.ContentType)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to generate upload URL"})
	}

	upload := &models.Upload{
		UserID:      userID,
		EntityType:  req.EntityType,
		EntityID:    req.EntityID,
		Filename:    req.Filename,
		ContentType: req.ContentType,
		StorageKey:  key,
		URL:         publicURL,
		Status:      "pending",
	}
	if err := h.Store.CreateUpload(upload); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to track upload"})
	}

	return c.JSON(models.PresignResponse{
		UploadID:  upload.ID,
		UploadURL: uploadURL,
		PublicURL: publicURL,
	})
}

// CompleteUpload marks an upload as completed after the client finishes uploading to S3.
func (h *UploadHandler) CompleteUpload(c *fiber.Ctx) error {
	uploadID := c.Params("id")
	userID := middleware.GetUserID(c)

	upload, err := h.Store.GetUpload(uploadID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "upload not found"})
	}
	if upload.UserID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not your upload"})
	}

	if err := h.Store.CompleteUpload(uploadID, upload.URL); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to complete upload"})
	}

	return c.JSON(fiber.Map{"id": uploadID, "url": upload.URL, "status": "completed"})
}
