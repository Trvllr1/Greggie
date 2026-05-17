-- ================================================================
-- Greggie™ — Migration 024: Tier auto-promotion + partnership track
--
-- Changes:
--   1. New CSP rate card: 15 / 12 / 10 / 8 (was 20 / 15 / 12 / 10).
--      MSP unchanged (15 / 12 / 10 / 8 from migration 015).
--      Headline rates are now competitive with Mercari / eBay / TikTok;
--      buyer service fee + payment markup recoup margin on take side.
--   2. Adds partnership_program (BOOLEAN) — manual-only flag granted by
--      ops. A seller must (a) auto-qualify for the 'established' tier on
--      metrics AND (b) have partnership_program = TRUE for the nightly
--      job to promote them to 'partner'. This separates rate from perks.
--   3. Adds tier_evaluated_at, tier_demotion_pending_at for the nightly
--      tier promoter job's 14-day cure-window logic.
-- ================================================================
BEGIN;

-- ── 1. Rate card update ──
-- Mark existing CSP rules inactive and insert new ones so the unique
-- partial index on (program_type, tier) WHERE is_active stays satisfied.
UPDATE commission_rules
   SET is_active = FALSE
 WHERE program_type = 'csp'
   AND is_active = TRUE;

INSERT INTO commission_rules (program_type, tier, commission_pct, listing_fee_cents, is_active) VALUES
  ('csp', 'new',         15.00, 0, TRUE),
  ('csp', 'rising',      12.00, 0, TRUE),
  ('csp', 'established', 10.00, 0, TRUE),
  ('csp', 'partner',      8.00, 0, TRUE);

-- ── 2. Partnership flag + tier evaluation tracking ──
ALTER TABLE seller_programs
  ADD COLUMN IF NOT EXISTS partnership_program       BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tier_evaluated_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tier_demotion_pending_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_seller_programs_partnership
  ON seller_programs(partnership_program) WHERE partnership_program = TRUE;

CREATE INDEX IF NOT EXISTS idx_seller_programs_tier_eval
  ON seller_programs(tier_evaluated_at);

COMMIT;
