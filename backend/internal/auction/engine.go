package auction

import (
	"encoding/json"
	"log/slog"
	"time"

	"greggie/backend/internal/store"
	"greggie/backend/internal/ws"
)

// Engine runs a background loop that auto-ends expired auctions.
type Engine struct {
	Store    *store.Store
	Hub      *ws.Hub
	interval time.Duration
	quit     chan struct{}
}

// NewEngine creates an auction engine with a 10-second poll interval.
func NewEngine(s *store.Store, hub *ws.Hub) *Engine {
	return &Engine{
		Store:    s,
		Hub:      hub,
		interval: 10 * time.Second,
		quit:     make(chan struct{}),
	}
}

// Start begins the auction expiry polling loop in a goroutine.
func (e *Engine) Start() {
	go e.run()
	slog.Info("auction: engine started", "interval", e.interval)
}

// Stop signals the engine to stop.
func (e *Engine) Stop() {
	close(e.quit)
	slog.Info("auction: engine stopped")
}

func (e *Engine) run() {
	ticker := time.NewTicker(e.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			e.processExpired()
		case <-e.quit:
			return
		}
	}
}

func (e *Engine) processExpired() {
	ids, err := e.Store.GetActiveAuctionsPastEnd()
	if err != nil {
		slog.Error("auction: failed to get expired auctions", "err", err)
		return
	}

	for _, productID := range ids {
		winningBid, err := e.Store.EndAuction(productID)
		if err != nil {
			slog.Error("auction: failed to end auction", "product_id", productID, "err", err)
			continue
		}

		product, _ := e.Store.GetProductByID(productID)
		if product == nil {
			continue
		}

		var result string
		if winningBid != nil {
			result = "sold"
			slog.Info("auction: ended with winner", "product_id", productID, "winner_user_id", winningBid.UserID, "amount_cents", winningBid.AmountCents)
		} else {
			result = "no_sale"
			slog.Info("auction: ended with no winner (reserve not met or no bids)", "product_id", productID)
		}

		// Broadcast auction end to channel viewers
		if e.Hub != nil {
			payload, _ := json.Marshal(map[string]interface{}{
				"product_id":     productID,
				"auction_status": "ended",
				"result":         result,
				"winning_bid":    winningBid,
				"product":        product,
			})
			e.Hub.BroadcastJSON(product.ChannelID, ws.Message{
				Event:     ws.EventAuctionEnd,
				ChannelID: product.ChannelID,
				Payload:   payload,
			})
		}
	}
}
