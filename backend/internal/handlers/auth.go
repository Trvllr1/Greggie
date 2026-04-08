package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"os"
	"time"

	"greggie/backend/internal/email"
	"greggie/backend/internal/middleware"
	"greggie/backend/internal/models"
	"greggie/backend/internal/store"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	Store *store.Store
}

func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req models.RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if req.Username == "" || req.Email == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "username, email, and password are required"})
	}
	if len(req.Password) < 8 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "password must be at least 8 characters"})
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to hash password"})
	}

	role := "viewer"
	if req.Role == "creator" {
		role = "creator"
	}

	user := &models.User{
		Username:     req.Username,
		DisplayName:  req.Username,
		Email:        req.Email,
		PasswordHash: string(hash),
		Role:         role,
	}
	if err := h.Store.CreateUser(user); err != nil {
		if isDuplicateKey(err) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "username or email already taken"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create user"})
	}

	// Create wallet
	_ = h.Store.CreateWallet(user.ID)

	token, err := middleware.GenerateToken(user.ID, user.Role)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to generate token"})
	}

	return c.Status(fiber.StatusCreated).JSON(models.AuthResponse{Token: token, User: *user})
}

func (h *AuthHandler) DevLogin(c *fiber.Ctx) error {
	// Only available when ENVIRONMENT=dev
	if os.Getenv("ENVIRONMENT") != "dev" {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not found"})
	}
	email := "dev-creator@greggie.app"
	user, err := h.Store.GetUserByEmail(email)
	if err != nil {
		// Try by username (may exist from seed data with different email)
		user, err = h.Store.GetUserByUsername("dev_creator")
	}
	if err != nil {
		// Auto-create dev creator
		hash, _ := bcrypt.GenerateFromPassword([]byte("dev12345"), bcrypt.DefaultCost)
		user = &models.User{
			Username:     "dev_creator",
			DisplayName:  "Dev Creator",
			Email:        email,
			PasswordHash: string(hash),
			Role:         "creator",
		}
		if err := h.Store.CreateUser(user); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create dev user: " + err.Error()})
		}
		_ = h.Store.CreateWallet(user.ID)
	}
	token, err := middleware.GenerateToken(user.ID, user.Role)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to generate token"})
	}
	return c.JSON(models.AuthResponse{Token: token, User: *user})
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req models.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if req.Email == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "email and password are required"})
	}

	user, err := h.Store.GetUserByEmail(req.Email)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid credentials"})
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid credentials"})
	}

	token, err := middleware.GenerateToken(user.ID, user.Role)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to generate token"})
	}

	return c.JSON(models.AuthResponse{Token: token, User: *user})
}

func (h *AuthHandler) Me(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	user, err := h.Store.GetUserByID(userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user not found"})
	}
	return c.JSON(user)
}

// ForgotPassword sends a password reset email with a one-time token.
func (h *AuthHandler) ForgotPassword(c *fiber.Ctx) error {
	var req models.PasswordResetRequest
	if err := c.BodyParser(&req); err != nil || req.Email == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "email is required"})
	}

	// Always return success to prevent email enumeration
	user, err := h.Store.GetUserByEmail(req.Email)
	if err != nil {
		return c.JSON(fiber.Map{"message": "if that email exists, a reset link has been sent"})
	}

	// Generate a 32-byte random token
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to generate token"})
	}
	rawToken := hex.EncodeToString(tokenBytes)

	// Store SHA-256 hash of token (never store raw tokens)
	hash := sha256.Sum256([]byte(rawToken))
	tokenHash := hex.EncodeToString(hash[:])

	expiresAt := time.Now().Add(1 * time.Hour)
	if err := h.Store.CreatePasswordResetToken(user.ID, tokenHash, expiresAt); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create reset token"})
	}

	// Build reset URL
	baseURL := os.Getenv("FRONTEND_URL")
	if baseURL == "" {
		baseURL = "http://localhost:5173"
	}
	resetURL := baseURL + "/reset-password?token=" + rawToken

	go func() {
		body := email.PasswordResetEmail(resetURL)
		if err := email.Send(user.Email, "Reset Your Greggie Password", body); err != nil {
			// Log but don't fail the request
			_ = err
		}
	}()

	return c.JSON(fiber.Map{"message": "if that email exists, a reset link has been sent"})
}

// ResetPassword validates the token and sets a new password.
func (h *AuthHandler) ResetPassword(c *fiber.Ctx) error {
	var req models.PasswordResetConfirm
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if req.Token == "" || req.NewPassword == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "token and new_password are required"})
	}
	if len(req.NewPassword) < 8 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "password must be at least 8 characters"})
	}

	// Hash the incoming token and look it up
	hash := sha256.Sum256([]byte(req.Token))
	tokenHash := hex.EncodeToString(hash[:])

	userID, err := h.Store.GetPasswordResetToken(tokenHash)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid or expired token"})
	}

	// Hash the new password
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to hash password"})
	}

	if err := h.Store.UpdateUserPassword(userID, string(passwordHash)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update password"})
	}

	// Mark token as used
	_ = h.Store.UsePasswordResetToken(tokenHash)

	return c.JSON(fiber.Map{"message": "password reset successfully"})
}
