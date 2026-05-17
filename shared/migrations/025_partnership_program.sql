-- ================================================================
-- Greggie™ — Migration 025: Partnership program (eligibility + windows + applications)
--
-- Partnership is the manual-curation track layered on top of the
-- auto-computed tier ladder. This migration adds:
--
--   1. Eligibility cache columns on seller_programs (refreshed nightly).
--      Sellers see their checklist on the dashboard even before applying.
--   2. partnership_windows — quarterly cohort intake windows with a slot
--      cap. Scarcity protects the badge.
--   3. partnership_applications — submissions tied to a window. One open
--      application per program per window. Approval flips partnership_program
--      on the seller_programs row and bumps the window's slots_used.
--
-- Lifecycle: established-tier seller -> nightly evaluator marks eligible
-- -> seller applies during open window -> ops reviews -> approve grants
-- a 12-month partnership term + named account manager.
-- ================================================================
BEGIN;

-- ── 1. Eligibility cache + lifecycle on seller_programs ──
ALTER TABLE seller_programs
  ADD COLUMN IF NOT EXISTS partnership_eligible           BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS partnership_eligible_since     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS partnership_term_ends_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS partnership_paused_until       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS partnership_account_manager_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS partnership_metrics_snapshot   JSONB;

CREATE INDEX IF NOT EXISTS idx_seller_programs_partnership_eligible
  ON seller_programs(partnership_eligible) WHERE partnership_eligible = TRUE;

CREATE INDEX IF NOT EXISTS idx_seller_programs_partnership_term
  ON seller_programs(partnership_term_ends_at) WHERE partnership_program = TRUE;

-- ── 2. Quarterly application windows ──
CREATE TABLE IF NOT EXISTS partnership_windows (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label       TEXT        NOT NULL,                  -- e.g. "2026 Q3"
  opens_at    TIMESTAMPTZ NOT NULL,
  closes_at   TIMESTAMPTZ NOT NULL,
  slot_cap    INTEGER     NOT NULL DEFAULT 5,
  slots_used  INTEGER     NOT NULL DEFAULT 0,
  status      TEXT        NOT NULL DEFAULT 'scheduled',
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT partnership_windows_dates_chk      CHECK (closes_at > opens_at),
  CONSTRAINT partnership_windows_slot_cap_chk   CHECK (slot_cap >= 0),
  CONSTRAINT partnership_windows_slots_used_chk CHECK (slots_used >= 0 AND slots_used <= slot_cap),
  CONSTRAINT partnership_windows_status_chk     CHECK (status IN ('scheduled','open','closed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_partnership_windows_label
  ON partnership_windows(label);

CREATE INDEX IF NOT EXISTS idx_partnership_windows_open
  ON partnership_windows(opens_at, closes_at) WHERE status = 'open';

-- ── 3. Applications ──
CREATE TABLE IF NOT EXISTS partnership_applications (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id      UUID        NOT NULL REFERENCES seller_programs(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES users(id)           ON DELETE CASCADE,
  window_id       UUID        NOT NULL REFERENCES partnership_windows(id),
  pitch           TEXT        NOT NULL,
  references_json JSONB,
  status          TEXT        NOT NULL DEFAULT 'submitted',
  decision_reason TEXT,
  reviewed_by     UUID        REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT partnership_applications_status_chk CHECK (status IN ('submitted','under_review','approved','rejected','withdrawn')),
  CONSTRAINT partnership_applications_pitch_len_chk CHECK (char_length(pitch) BETWEEN 100 AND 2500)
);

-- One live application per program per window. Withdrawn/rejected don't
-- block a future re-application (in the next window) but do block dupes
-- inside the same window.
CREATE UNIQUE INDEX IF NOT EXISTS idx_partnership_applications_unique_active
  ON partnership_applications(program_id, window_id)
  WHERE status NOT IN ('withdrawn');

CREATE INDEX IF NOT EXISTS idx_partnership_applications_review_queue
  ON partnership_applications(status, created_at)
  WHERE status IN ('submitted','under_review');

CREATE INDEX IF NOT EXISTS idx_partnership_applications_user
  ON partnership_applications(user_id, created_at DESC);

COMMIT;
