BEGIN;

-- ── Billboard placements ──────────────────────────────────
CREATE TABLE billboards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billboard_type  TEXT NOT NULL CHECK (billboard_type IN ('sponsored', 'promoted', 'trending', 'campaign')),
  target_type     TEXT NOT NULL CHECK (target_type IN ('channel', 'product', 'campaign')),
  target_id       UUID,
  sponsor_id      UUID REFERENCES users(id),
  title           TEXT NOT NULL,
  subtitle        TEXT DEFAULT '',
  description     TEXT DEFAULT '',
  image_url       TEXT NOT NULL,
  cta_label       TEXT DEFAULT 'Shop Now',
  badge_text      TEXT DEFAULT '',
  badge_color     TEXT DEFAULT 'indigo',
  priority        INT NOT NULL DEFAULT 0,
  starts_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at         TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','expired','rejected')),
  impressions     BIGINT DEFAULT 0,
  clicks          BIGINT DEFAULT 0,
  budget_cents    BIGINT DEFAULT 0,
  spent_cents     BIGINT DEFAULT 0,
  cpm_cents       BIGINT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_billboards_active  ON billboards(status, starts_at, ends_at);
CREATE INDEX idx_billboards_type    ON billboards(billboard_type);
CREATE INDEX idx_billboards_sponsor ON billboards(sponsor_id) WHERE sponsor_id IS NOT NULL;

CREATE TRIGGER trg_billboards_updated BEFORE UPDATE ON billboards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Granular impression / click log ───────────────────────
CREATE TABLE billboard_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billboard_id UUID NOT NULL REFERENCES billboards(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id),
  event_type   TEXT NOT NULL CHECK (event_type IN ('impression', 'click')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_billboard_events_billboard ON billboard_events(billboard_id, event_type);

COMMIT;
