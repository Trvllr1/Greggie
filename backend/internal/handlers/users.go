package handlers

import (
	"greggie/backend/internal/middleware"
	"greggie/backend/internal/models"
	"greggie/backend/internal/store"

	"github.com/gofiber/fiber/v2"
)

type UserHandler struct {
	Store *store.Store
}

func (h *UserHandler) Follow(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	channelID := c.Params("channelId")
	if channelID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "channel_id is required"})
	}
	if err := h.Store.FollowChannel(userID, channelID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to follow"})
	}
	return c.JSON(fiber.Map{"ok": true})
}

func (h *UserHandler) Unfollow(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	channelID := c.Params("channelId")
	if err := h.Store.UnfollowChannel(userID, channelID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to unfollow"})
	}
	return c.JSON(fiber.Map{"ok": true})
}

func (h *UserHandler) GetFollowing(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	channels, err := h.Store.GetFollowedChannels(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load following"})
	}
	if channels == nil {
		channels = []models.Channel{}
	}
	return c.JSON(channels)
}
