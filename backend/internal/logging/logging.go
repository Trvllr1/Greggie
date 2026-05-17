// Package logging configures the process-wide structured logger (log/slog).
//
// Behavior:
//   - LOG_FORMAT=json     → JSON handler (default in prod).
//   - LOG_FORMAT=text     → text handler (default in dev).
//   - LOG_LEVEL=debug|info|warn|error (default: info).
//   - ENVIRONMENT=dev|test → text + debug by default.
//
// After Init, all packages should use slog.Info/Warn/Error/Debug on the default
// logger. The "component" attribute identifies the subsystem (e.g. "auction",
// "webhook", "ws", "mediamtx-auth") so existing log greps keep working.
package logging

import (
	"log/slog"
	"os"
	"strings"
)

// Init configures slog.Default. Safe to call exactly once at startup.
func Init() {
	env := strings.ToLower(os.Getenv("ENVIRONMENT"))
	dev := env == "dev" || env == "test" || env == ""

	level := parseLevel(os.Getenv("LOG_LEVEL"), dev)
	format := strings.ToLower(os.Getenv("LOG_FORMAT"))
	if format == "" {
		if dev {
			format = "text"
		} else {
			format = "json"
		}
	}

	opts := &slog.HandlerOptions{Level: level}

	var handler slog.Handler
	if format == "text" {
		handler = slog.NewTextHandler(os.Stdout, opts)
	} else {
		handler = slog.NewJSONHandler(os.Stdout, opts)
	}

	slog.SetDefault(slog.New(handler))
}

func parseLevel(s string, dev bool) slog.Level {
	switch strings.ToLower(s) {
	case "debug":
		return slog.LevelDebug
	case "info":
		return slog.LevelInfo
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	}
	if dev {
		return slog.LevelDebug
	}
	return slog.LevelInfo
}
