-- Migration 012: Add stream_key to channels for RTMP authentication
-- Each channel gets a unique stream key that creators use in OBS

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE channels ADD COLUMN IF NOT EXISTS stream_key TEXT UNIQUE;

-- Generate stream keys for existing channels (random 24-char hex strings)
UPDATE channels SET stream_key = encode(gen_random_bytes(12), 'hex') WHERE stream_key IS NULL;

-- Make stream_key NOT NULL with a default generator for new channels
ALTER TABLE channels ALTER COLUMN stream_key SET DEFAULT encode(gen_random_bytes(12), 'hex');
ALTER TABLE channels ALTER COLUMN stream_key SET NOT NULL;
