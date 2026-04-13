package handlers

import (
	"strconv"

	"greggie/backend/internal/middleware"
	"greggie/backend/internal/models"
	"greggie/backend/internal/store"

	"github.com/gofiber/fiber/v2"
)

type VideoHandler struct {
	Store *store.Store
}

// ── Creator routes (auth required) ────────────────────────────

// CreateVideo — POST /api/v1/creator/channels/:id/videos
func (h *VideoHandler) CreateVideo(c *fiber.Ctx) error {
	uid := middleware.GetUserID(c)
	channelID := c.Params("id")

	// Verify channel exists and belongs to creator
	ch, err := h.Store.GetChannelByID(channelID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "channel not found"})
	}
	if ch.CreatorID != uid {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not your channel"})
	}

	var req models.CreateVideoRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	if req.Title == "" || req.VideoURL == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "title and video_url are required"})
	}

	v := &models.Video{
		ChannelID:     channelID,
		CreatorID:     uid,
		Title:         req.Title,
		Description:   req.Description,
		VideoURL:      req.VideoURL,
		ThumbnailURL:  req.ThumbnailURL,
		DurationSec:   req.DurationSec,
		FileSizeBytes: req.FileSizeBytes,
	}
	if err := h.Store.CreateVideo(v); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create video"})
	}

	// Set product links if provided
	if len(req.ProductIDs) > 0 {
		_ = h.Store.SetVideoProducts(v.ID, req.ProductIDs)
	}

	// Re-fetch to get joined fields
	created, err := h.Store.GetVideoByID(v.ID)
	if err != nil {
		return c.Status(fiber.StatusCreated).JSON(v)
	}
	return c.Status(fiber.StatusCreated).JSON(created)
}

// GetMyChannelVideos — GET /api/v1/creator/channels/:id/videos
func (h *VideoHandler) GetMyChannelVideos(c *fiber.Ctx) error {
	uid := middleware.GetUserID(c)
	channelID := c.Params("id")

	ch, err := h.Store.GetChannelByID(channelID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "channel not found"})
	}
	if ch.CreatorID != uid {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not your channel"})
	}

	videos, err := h.Store.GetCreatorVideosAll(uid)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load videos"})
	}
	// Filter to this channel only
	var channelVideos []models.Video
	for _, v := range videos {
		if v.ChannelID == channelID {
			v.Products, _ = h.Store.GetVideoProducts(v.ID)
			channelVideos = append(channelVideos, v)
		}
	}
	if channelVideos == nil {
		channelVideos = []models.Video{}
	}
	return c.JSON(channelVideos)
}

// UpdateVideo — PUT /api/v1/creator/videos/:videoId
func (h *VideoHandler) UpdateVideo(c *fiber.Ctx) error {
	uid := middleware.GetUserID(c)
	videoID := c.Params("videoId")

	v, err := h.Store.GetVideoByID(videoID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "video not found"})
	}
	if v.CreatorID != uid {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not your video"})
	}

	var req models.UpdateVideoRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	if err := h.Store.UpdateVideo(videoID, &req); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update video"})
	}

	updated, _ := h.Store.GetVideoByID(videoID)
	return c.JSON(updated)
}

// DeleteVideo — DELETE /api/v1/creator/videos/:videoId
func (h *VideoHandler) DeleteVideo(c *fiber.Ctx) error {
	uid := middleware.GetUserID(c)
	videoID := c.Params("videoId")

	v, err := h.Store.GetVideoByID(videoID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "video not found"})
	}
	if v.CreatorID != uid {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not your video"})
	}

	if err := h.Store.DeleteVideo(videoID, uid); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete video"})
	}
	return c.JSON(fiber.Map{"deleted": true})
}

// SetVideoProducts — PUT /api/v1/creator/videos/:videoId/products
func (h *VideoHandler) SetVideoProducts(c *fiber.Ctx) error {
	uid := middleware.GetUserID(c)
	videoID := c.Params("videoId")

	v, err := h.Store.GetVideoByID(videoID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "video not found"})
	}
	if v.CreatorID != uid {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not your video"})
	}

	var body struct {
		ProductIDs []string `json:"product_ids"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}

	if err := h.Store.SetVideoProducts(videoID, body.ProductIDs); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update products"})
	}

	updated, _ := h.Store.GetVideoByID(videoID)
	return c.JSON(updated)
}

// ── Public routes ─────────────────────────────────────────────

// GetVideo — GET /api/v1/videos/:id
func (h *VideoHandler) GetVideo(c *fiber.Ctx) error {
	videoID := c.Params("id")

	v, err := h.Store.GetVideoByID(videoID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "video not found"})
	}

	// Async view count increment
	go h.Store.IncrVideoViewCount(videoID)

	return c.JSON(v)
}

// GetChannelVideos — GET /api/v1/channels/:id/videos
func (h *VideoHandler) GetChannelVideos(c *fiber.Ctx) error {
	channelID := c.Params("id")
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))

	videos, err := h.Store.GetVideosByChannel(channelID, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load videos"})
	}
	if videos == nil {
		videos = []models.Video{}
	}
	return c.JSON(videos)
}

// GetUnifiedFeed — GET /api/v1/feed
func (h *VideoHandler) GetUnifiedFeed(c *fiber.Ctx) error {
	category := c.Query("category", "")
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	feed, err := h.Store.GetUnifiedFeed(category, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load feed"})
	}
	if feed == nil {
		feed = []models.FeedItem{}
	}
	return c.JSON(feed)
}
