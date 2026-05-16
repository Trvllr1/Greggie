package handlers

import (
	"log"
	"os"
	"strings"

	"greggie/backend/internal/store"

	"github.com/gofiber/fiber/v2"
)

// InternalHandler hosts endpoints meant ONLY for internal services
// (MediaMTX → backend over the Docker network). Not exposed via Caddy.
type InternalHandler struct {
	Store *store.Store
}

// mediaMTXAuthRequest matches the JSON body MediaMTX POSTs to authHTTPAddress.
// Reference: https://github.com/bluenviron/mediamtx#authentication
type mediaMTXAuthRequest struct {
	User     string `json:"user"`
	Password string `json:"password"`
	IP       string `json:"ip"`
	Action   string `json:"action"`   // "publish" | "read" | "playback" | "api" | "metrics" | "pprof"
	Path     string `json:"path"`     // stream path (e.g. the stream key)
	Protocol string `json:"protocol"` // "rtmp" | "webrtc" | "hls" | ...
	Query    string `json:"query"`
	ID       string `json:"id"`
}

// MediaMTXAuth validates RTMP/WebRTC publish requests against channels.stream_key.
// Read actions (HLS playback) are allowed unconditionally — the stream is public once live.
//
// Security:
//   - Endpoint mounted under /internal/* which is NOT exposed via Caddy (Caddy only proxies /api/*, /ws/*, /hls/*, /whip/*).
//   - Optionally gated by MEDIAMTX_AUTH_TOKEN — when set, the request must include it as a query
//     param (?token=...) since MediaMTX doesn't allow custom headers. The token travels only over
//     the Docker internal network.
func (h *InternalHandler) MediaMTXAuth(c *fiber.Ctx) error {
	// Optional shared-secret gate.
	if expected := os.Getenv("MEDIAMTX_AUTH_TOKEN"); expected != "" {
		if c.Query("token") != expected {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
		}
	}

	var req mediaMTXAuthRequest
	if err := c.BodyParser(&req); err != nil {
		log.Printf("mediamtx-auth: bad body: %v", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "bad request"})
	}

	// Reads (HLS playback, etc.) are always allowed — streams are public.
	if req.Action != "publish" {
		return c.SendStatus(fiber.StatusOK)
	}

	// Extract stream key from path. Supports both `<key>` and `live/<key>` URL shapes.
	key := req.Path
	if idx := strings.LastIndex(key, "/"); idx >= 0 {
		key = key[idx+1:]
	}
	if key == "" {
		log.Printf("mediamtx-auth: publish denied (empty path) from %s", req.IP)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing stream key"})
	}

	ch, err := h.Store.GetChannelByStreamKey(key)
	if err != nil || ch == nil {
		log.Printf("mediamtx-auth: publish denied (unknown key) from %s protocol=%s", req.IP, req.Protocol)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid stream key"})
	}

	log.Printf("mediamtx-auth: publish allowed channel=%s from %s protocol=%s", ch.ID, req.IP, req.Protocol)
	return c.SendStatus(fiber.StatusOK)
}
