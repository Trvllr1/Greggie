package handlers

import (
	"os"

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
