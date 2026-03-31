package handlers

import (
	"greggie/backend/internal/middleware"
	"greggie/backend/internal/models"
	"greggie/backend/internal/store"

	"github.com/gofiber/fiber/v2"
)

type EventHandler struct {
	Store *store.Store
}

type trackEventRequest struct {
	EventType string `json:"event_type"`
	ChannelID string `json:"channel_id"`
	Payload   string `json:"payload"`
}

func (h *EventHandler) TrackEvent(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	var req trackEventRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	if req.EventType == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "event_type required"})
	}

	evt := &models.Event{
		UserID:    userID,
		ChannelID: req.ChannelID,
		EventType: req.EventType,
		Payload:   req.Payload,
	}
	if err := h.Store.LogEvent(evt); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to log event"})
	}
	return c.SendStatus(fiber.StatusNoContent)
}
