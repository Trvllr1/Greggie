package email

import (
	"fmt"
	"log"
	"net/smtp"
	"os"
	"strings"
)

var (
	smtpHost     string
	smtpPort     string
	smtpUser     string
	smtpPassword string
	fromAddress  string
	enabled      bool
)

// Init configures the email service from environment variables.
func Init() {
	smtpHost = os.Getenv("SMTP_HOST")
	smtpPort = os.Getenv("SMTP_PORT")
	smtpUser = os.Getenv("SMTP_USER")
	smtpPassword = os.Getenv("SMTP_PASSWORD")
	fromAddress = os.Getenv("EMAIL_FROM")

	if smtpHost == "" || smtpPort == "" {
		env := os.Getenv("ENVIRONMENT")
		if env != "dev" && env != "test" {
			log.Println("email: SMTP not configured — emails disabled (set SMTP_HOST, SMTP_PORT)")
		}
		return
	}
	if fromAddress == "" {
		fromAddress = "no-reply@greggie.app"
	}
	enabled = true
	log.Printf("email: configured via %s:%s", smtpHost, smtpPort)
}

// Enabled returns true if email sending is configured.
func Enabled() bool {
	return enabled
}

// Send sends an email. In dev mode (disabled), it logs instead of sending.
func Send(to, subject, htmlBody string) error {
	if !enabled {
		log.Printf("email [dev-log]: to=%s subject=%s body_len=%d", to, subject, len(htmlBody))
		return nil
	}

	msg := buildMessage(to, subject, htmlBody)

	var auth smtp.Auth
	if smtpUser != "" {
		auth = smtp.PlainAuth("", smtpUser, smtpPassword, smtpHost)
	}

	addr := smtpHost + ":" + smtpPort
	if err := smtp.SendMail(addr, auth, fromAddress, []string{to}, []byte(msg)); err != nil {
		return fmt.Errorf("send email to %s: %w", to, err)
	}
	return nil
}

func buildMessage(to, subject, htmlBody string) string {
	var sb strings.Builder
	sb.WriteString("From: Greggie <" + fromAddress + ">\r\n")
	sb.WriteString("To: " + to + "\r\n")
	sb.WriteString("Subject: " + subject + "\r\n")
	sb.WriteString("MIME-Version: 1.0\r\n")
	sb.WriteString("Content-Type: text/html; charset=\"UTF-8\"\r\n")
	sb.WriteString("\r\n")
	sb.WriteString(htmlBody)
	return sb.String()
}

// ── Template helpers ──────────────────────────────────────────

func OrderConfirmationEmail(orderID string, totalCents int64, itemCount int) string {
	dollars := fmt.Sprintf("$%.2f", float64(totalCents)/100.0)
	return fmt.Sprintf(`<!DOCTYPE html>
<html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
<h2 style="color:#6D28D9">Order Confirmed! 🎉</h2>
<p>Your order <strong>%s</strong> has been confirmed.</p>
<table style="width:100%%;border-collapse:collapse;margin:16px 0">
  <tr><td style="padding:8px;border-bottom:1px solid #eee">Items</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right"><strong>%d</strong></td></tr>
  <tr><td style="padding:8px;border-bottom:1px solid #eee">Total</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right"><strong>%s</strong></td></tr>
</table>
<p>We'll send you tracking info once your order ships.</p>
<p style="color:#888;font-size:12px">— The Greggie Team</p>
</body></html>`, orderID, itemCount, dollars)
}

func PasswordResetEmail(resetURL string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
<h2 style="color:#6D28D9">Reset Your Password</h2>
<p>We received a request to reset your password. Click the button below to set a new one:</p>
<p style="text-align:center;margin:24px 0">
  <a href="%s" style="background:#6D28D9;color:white;padding:12px 32px;text-decoration:none;border-radius:8px;font-weight:bold">Reset Password</a>
</p>
<p style="color:#888;font-size:12px">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
<p style="color:#888;font-size:12px">— The Greggie Team</p>
</body></html>`, resetURL)
}

func ShipmentNotificationEmail(orderID, carrier, trackingNumber string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
<h2 style="color:#6D28D9">Your Order Has Shipped! 📦</h2>
<p>Order <strong>%s</strong> is on its way.</p>
<table style="width:100%%;border-collapse:collapse;margin:16px 0">
  <tr><td style="padding:8px;border-bottom:1px solid #eee">Carrier</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right"><strong>%s</strong></td></tr>
  <tr><td style="padding:8px;border-bottom:1px solid #eee">Tracking</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right"><strong>%s</strong></td></tr>
</table>
<p style="color:#888;font-size:12px">— The Greggie Team</p>
</body></html>`, orderID, carrier, trackingNumber)
}
