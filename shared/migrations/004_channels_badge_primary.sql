-- ================================================================
-- Greggie™ — Live Commerce OS
-- Migration 004: Add badge + is_primary columns to channels
-- ================================================================

BEGIN;

ALTER TABLE channels ADD COLUMN IF NOT EXISTS badge TEXT DEFAULT '';
ALTER TABLE channels ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_channels_primary ON channels(is_primary) WHERE is_primary = TRUE;

COMMIT;
