-- Migration 017: Password reset tokens + upload tracking
-- Supports M11 (email/password reset) and M12 (S3 uploads)

-- ── Password Reset Tokens ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_password_reset_tokens_hash ON password_reset_tokens(token_hash) WHERE used = false;
CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens(user_id);

-- ── Upload Tracking ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS uploads (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type  TEXT NOT NULL CHECK (entity_type IN ('product', 'channel', 'user', 'shop')),
    entity_id    TEXT NOT NULL DEFAULT '',
    filename     TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size_bytes   BIGINT DEFAULT 0,
    storage_key  TEXT NOT NULL,
    url          TEXT NOT NULL DEFAULT '',
    status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_uploads_user ON uploads(user_id);
CREATE INDEX idx_uploads_entity ON uploads(entity_type, entity_id);
