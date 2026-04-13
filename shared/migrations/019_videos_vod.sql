-- ================================================================
-- Greggie™ — Live Commerce OS
-- Migration 019: Videos (VOD uploads) + Creator Profile columns
-- ================================================================

BEGIN;

-- ── Add VOD status to channels ──
ALTER TABLE channels DROP CONSTRAINT IF EXISTS channels_status_check;
ALTER TABLE channels ADD CONSTRAINT channels_status_check
  CHECK (status IN ('LIVE', 'RELAY', 'OFFLINE', 'SCHEDULED', 'VOD'));

-- ── Videos table: uploaded content items within a channel ──
CREATE TABLE videos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id      UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    creator_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    description     TEXT DEFAULT '',
    video_url       TEXT NOT NULL,
    thumbnail_url   TEXT DEFAULT '',
    duration_sec    INT DEFAULT 0,
    file_size_bytes BIGINT DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'processing'
                    CHECK (status IN ('processing', 'ready', 'failed')),
    view_count      INT DEFAULT 0,
    like_count      INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_videos_channel ON videos(channel_id);
CREATE INDEX idx_videos_creator ON videos(creator_id);
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_videos_created ON videos(created_at DESC);

CREATE TRIGGER trg_videos_updated BEFORE UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Creator profile columns ──
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS follower_count INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS video_count INT DEFAULT 0;

COMMIT;
