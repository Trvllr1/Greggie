package ws

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gofiber/contrib/websocket"
)

// ── Event types ──

const (
	EventChannelUpdate  = "channel:update"
	EventRailUpdate     = "rail:update"
	EventCheckoutStatus = "checkout:status"
	EventViewerCount    = "viewer:count"
	EventChatMessage    = "chat:message"
	EventBidUpdate      = "bid:update"
	EventAuctionEnd     = "auction:end"
)

// Message is the wire format for all WebSocket messages.
type Message struct {
	Event     string          `json:"event"`
	ChannelID string          `json:"channel_id,omitempty"`
	Payload   json.RawMessage `json:"payload"`
}

// ── Client ──

type Client struct {
	conn      *websocket.Conn
	hub       *Hub
	send      chan []byte
	userID    string
	channelID string // currently-watching channel
	mu        sync.Mutex
}

func (c *Client) SetChannel(channelID string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.channelID = channelID
}

func (c *Client) ChannelID() string {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.channelID
}

// readPump reads messages from the WebSocket and forwards to the hub.
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	for {
		_, raw, err := c.conn.ReadMessage()
		if err != nil {
			break
		}
		var msg Message
		if json.Unmarshal(raw, &msg) != nil {
			continue
		}
		// Handle client subscribe message
		if msg.Event == "subscribe" && msg.ChannelID != "" {
			c.hub.switchChannel(c, msg.ChannelID)
			continue
		}
		// Chat messages: broadcast to same channel
		if msg.Event == EventChatMessage && msg.ChannelID != "" {
			c.hub.BroadcastToChannel(msg.ChannelID, raw)
		}
	}
}

// writePump sends messages from the hub to the WebSocket client.
func (c *Client) writePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case data, ok := <-c.send:
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, nil)
				return
			}
			c.conn.WriteMessage(websocket.TextMessage, data)

		case <-ticker.C:
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// ── Hub — manages all connected clients ──

type Hub struct {
	clients    map[*Client]bool
	channels   map[string]map[*Client]bool // channelID → clients
	register   chan *Client
	unregister chan *Client
	broadcast  chan []byte // broadcast to ALL clients
	mu         sync.RWMutex

	// Callback when a client joins/leaves a channel. Used by main to update viewer counts.
	OnJoin  func(channelID, userID string)
	OnLeave func(channelID, userID string)
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		channels:   make(map[string]map[*Client]bool),
		register:   make(chan *Client, 64),
		unregister: make(chan *Client, 64),
		broadcast:  make(chan []byte, 256),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)

				// Remove from channel room
				chID := client.ChannelID()
				if chID != "" {
					if room, ok := h.channels[chID]; ok {
						delete(room, client)
						if len(room) == 0 {
							delete(h.channels, chID)
						}
					}
					if h.OnLeave != nil {
						go h.OnLeave(chID, client.userID)
					}
				}
			}
			h.mu.Unlock()

		case data := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- data:
				default:
					// slow client, drop message
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) switchChannel(c *Client, newChannelID string) {
	oldChannelID := c.ChannelID()
	if oldChannelID == newChannelID {
		return
	}

	h.mu.Lock()
	// Leave old channel room
	if oldChannelID != "" {
		if room, ok := h.channels[oldChannelID]; ok {
			delete(room, c)
			if len(room) == 0 {
				delete(h.channels, oldChannelID)
			}
		}
	}
	// Join new channel room
	if _, ok := h.channels[newChannelID]; !ok {
		h.channels[newChannelID] = make(map[*Client]bool)
	}
	h.channels[newChannelID][c] = true
	c.SetChannel(newChannelID)
	h.mu.Unlock()

	if h.OnLeave != nil && oldChannelID != "" {
		go h.OnLeave(oldChannelID, c.userID)
	}
	if h.OnJoin != nil {
		go h.OnJoin(newChannelID, c.userID)
	}
}

// BroadcastToChannel sends a raw message to all clients in a channel.
func (h *Hub) BroadcastToChannel(channelID string, data []byte) {
	h.mu.RLock()
	room, ok := h.channels[channelID]
	if !ok {
		h.mu.RUnlock()
		return
	}
	// Copy to avoid holding lock during writes
	targets := make([]*Client, 0, len(room))
	for c := range room {
		targets = append(targets, c)
	}
	h.mu.RUnlock()

	for _, c := range targets {
		select {
		case c.send <- data:
		default:
		}
	}
}

// BroadcastAll sends a raw message to every connected client.
func (h *Hub) BroadcastAll(data []byte) {
	h.broadcast <- data
}

// BroadcastJSON encodes and broadcasts to a single channel.
func (h *Hub) BroadcastJSON(channelID string, msg Message) {
	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("ws: marshal error: %v", err)
		return
	}
	h.BroadcastToChannel(channelID, data)
}

// BroadcastAllJSON encodes and broadcasts to all clients.
func (h *Hub) BroadcastAllJSON(msg Message) {
	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("ws: marshal error: %v", err)
		return
	}
	h.BroadcastAll(data)
}

// ClientCount returns total connected clients.
func (h *Hub) ClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

// ChannelClientCount returns clients watching a specific channel.
func (h *Hub) ChannelClientCount(channelID string) int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	if room, ok := h.channels[channelID]; ok {
		return len(room)
	}
	return 0
}

// Shutdown closes all client connections gracefully.
func (h *Hub) Shutdown() {
	h.mu.Lock()
	defer h.mu.Unlock()
	for client := range h.clients {
		close(client.send)
		client.conn.Close()
		delete(h.clients, client)
	}
	h.channels = make(map[string]map[*Client]bool)
	log.Println("ws: hub shut down, all clients disconnected")
}

// HandleWebSocket is the Fiber WebSocket handler.
// userID is extracted from JWT before the upgrade.
func HandleWebSocket(hub *Hub) func(*websocket.Conn) {
	return func(conn *websocket.Conn) {
		userID, _ := conn.Locals("user_id").(string)
		client := &Client{
			conn:   conn,
			hub:    hub,
			send:   make(chan []byte, 256),
			userID: userID,
		}
		hub.register <- client

		go client.writePump()
		client.readPump() // blocks until disconnect
	}
}
