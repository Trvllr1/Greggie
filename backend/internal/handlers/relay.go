package handlers

import (
	"fmt"

	"greggie/backend/internal/models"
	"greggie/backend/internal/store"

	"github.com/gofiber/fiber/v2"
)

type RelayHandler struct {
	Store *store.Store
}

// Query performs text-based transcript search for a relay channel.
// POST /api/v1/relay/query  { "channel_id": "...", "query": "..." }
func (h *RelayHandler) Query(c *fiber.Ctx) error {
	var req models.RelayQueryRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	if req.ChannelID == "" || req.Query == "" {
		return fiber.NewError(fiber.StatusBadRequest, "channel_id and query are required")
	}

	entries, err := h.Store.SearchRelayEntries(req.ChannelID, req.Query, 5)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "relay search failed")
	}

	matches := make([]models.RelayMatch, 0, len(entries))
	for _, e := range entries {
		matches = append(matches, models.RelayMatch{
			TimestampSec:    e.TimestampSec,
			TranscriptChunk: e.TranscriptChunk,
			Confidence:      0.85, // placeholder until vector similarity scoring
			FormattedTime:   formatTimestamp(e.TimestampSec),
		})
	}

	return c.JSON(models.RelayQueryResponse{
		ChannelID: req.ChannelID,
		Query:     req.Query,
		Matches:   matches,
	})
}

// GetEntries returns relay transcript entries for a channel within a time range.
// GET /api/v1/relay/:channelId/entries?from=0&to=3600
func (h *RelayHandler) GetEntries(c *fiber.Ctx) error {
	channelID := c.Params("channelId")
	from := c.QueryInt("from", 0)
	to := c.QueryInt("to", 86400)

	entries, err := h.Store.GetRelayEntries(channelID, from, to)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to fetch relay entries")
	}
	if entries == nil {
		entries = []models.RelayEntry{}
	}
	return c.JSON(entries)
}

func formatTimestamp(sec int) string {
	h := sec / 3600
	m := (sec % 3600) / 60
	s := sec % 60
	if h > 0 {
		return fmt.Sprintf("%d:%02d:%02d", h, m, s)
	}
	return fmt.Sprintf("%02d:%02d", m, s)
}
