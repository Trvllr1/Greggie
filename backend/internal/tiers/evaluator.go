// Package tiers implements automatic seller-tier evaluation for CSP and MSP
// programs. Sellers are promoted when their metrics cross a published
// threshold and demoted (after a 14-day cure window) when they fall below it.
//
// Promotion is immediate. Demotion is delayed by DemoteCureWindow to give a
// seller time to recover before losing economics — common practice on eBay
// (Top Rated Seller) and StockX.
//
// The 'partner' tier is gated on a manual flag (seller_programs.partnership_program)
// AND the metrics for 'established'. This separates rate (auto) from perks
// (manual: account manager, billboard slots, co-marketing). A seller cannot
// reach 'partner' on metrics alone.
package tiers

import (
	"database/sql"
	"log/slog"
	"time"

	"greggie/backend/internal/store"
)

// DemoteCureWindow is how long a seller stays in tier_demotion_pending state
// before being demoted. Promotions are immediate; demotions are debounced.
const DemoteCureWindow = 14 * 24 * time.Hour

// Tier represents an ordered seller tier. Higher index = better economics.
type Tier int

const (
	TierNew Tier = iota
	TierRising
	TierEstablished
	TierPartner
)

func (t Tier) String() string {
	switch t {
	case TierRising:
		return "rising"
	case TierEstablished:
		return "established"
	case TierPartner:
		return "partner"
	default:
		return "new"
	}
}

// parseTier converts a string tier name to its ordinal. Unknown values map to
// TierNew so a corrupted row is treated conservatively.
func parseTier(s string) Tier {
	switch s {
	case "rising":
		return TierRising
	case "established":
		return TierEstablished
	case "partner":
		return TierPartner
	default:
		return TierNew
	}
}

// Thresholds is the metric bar for moving up to a given tier. Each field is a
// minimum that must be met; missing data is treated as 0 (i.e. fails the bar).
type Thresholds struct {
	DaysActive  int     // days since approved_at (or created_at if null)
	PaidOrders  int     // count of orders.status='paid' attributable to the seller
	GMVCents    int64   // sum of paid order gross
	StreamHours float64 // CSP only — broadcast hours (currently approximated, see metrics)
}

// cspLadder defines the metric bars per CSP tier. The 'partner' tier reuses
// the 'established' bar; the gate is the partnership_program flag, not metrics.
var cspLadder = map[Tier]Thresholds{
	TierRising:      {DaysActive: 30, PaidOrders: 20, GMVCents: 100_000},     // $1,000
	TierEstablished: {DaysActive: 90, PaidOrders: 100, GMVCents: 500_000},    // $5,000
	TierPartner:     {DaysActive: 180, PaidOrders: 250, GMVCents: 2_500_000}, // $25,000
}

// mspLadder mirrors cspLadder for the marketplace program — typically higher
// order volume since marketplace listings don't depend on live stream uptime.
var mspLadder = map[Tier]Thresholds{
	TierRising:      {DaysActive: 30, PaidOrders: 25, GMVCents: 150_000},     // $1,500
	TierEstablished: {DaysActive: 90, PaidOrders: 150, GMVCents: 750_000},    // $7,500
	TierPartner:     {DaysActive: 180, PaidOrders: 500, GMVCents: 5_000_000}, // $50,000
}

// Ladder returns the threshold table for a program type. Returns nil for
// unknown programs (caller treats as no transitions possible).
func Ladder(programType string) map[Tier]Thresholds {
	switch programType {
	case "csp":
		return cspLadder
	case "msp":
		return mspLadder
	}
	return nil
}

// SellerMetrics is the per-seller snapshot used for tier evaluation.
type SellerMetrics struct {
	DaysActive  int
	PaidOrders  int
	GMVCents    int64
	StreamHours float64
}

// meets reports whether these metrics clear the given threshold bar.
func (m SellerMetrics) meets(t Thresholds) bool {
	if m.DaysActive < t.DaysActive {
		return false
	}
	if m.PaidOrders < t.PaidOrders {
		return false
	}
	if m.GMVCents < t.GMVCents {
		return false
	}
	if t.StreamHours > 0 && m.StreamHours < t.StreamHours {
		return false
	}
	return true
}

// TargetTier returns the highest tier a seller's metrics qualify them for in
// the given program. Partner is only awarded when partnership_program is true.
func TargetTier(programType string, partnership bool, m SellerMetrics) Tier {
	ladder := Ladder(programType)
	if ladder == nil {
		return TierNew
	}
	target := TierNew
	// Walk the ladder in order. Partner is the top rung and requires the flag.
	if m.meets(ladder[TierRising]) {
		target = TierRising
	}
	if m.meets(ladder[TierEstablished]) {
		target = TierEstablished
	}
	if partnership && m.meets(ladder[TierPartner]) {
		target = TierPartner
	}
	return target
}

// Evaluator runs the nightly tier-promotion job. Holds a *store.Store handle
// and the SQL conn for the metric queries. Construct with NewEvaluator.
type Evaluator struct {
	st *store.Store
	db *sql.DB
}

// NewEvaluator wires up a tier evaluator. db must be the same *sql.DB the
// store uses; we take it directly so metric queries don't need round-trip
// helper methods on Store.
func NewEvaluator(st *store.Store, db *sql.DB) *Evaluator {
	return &Evaluator{st: st, db: db}
}

// EvaluateAll iterates every active seller_programs row and applies the
// promotion/demotion rules. Returns the count of rows whose tier changed.
//
// Promotion: immediate, sets tier_evaluated_at, clears tier_demotion_pending_at.
// Demotion: if metric tier < current, set tier_demotion_pending_at if not
//
//	already set; once pending >= DemoteCureWindow, demote. If metrics
//	recover before the window expires, the pending mark is cleared.
func (e *Evaluator) EvaluateAll() (promoted, demoted int, err error) {
	rows, err := e.db.Query(
		`SELECT id, user_id, program_type, tier, partnership_program,
		        COALESCE(approved_at, created_at) AS effective_start,
		        tier_demotion_pending_at
		   FROM seller_programs
		  WHERE status IN ('active', 'approved')`,
	)
	if err != nil {
		return 0, 0, err
	}
	defer rows.Close()

	now := time.Now().UTC()
	type spRow struct {
		id, userID, programType, currentTier string
		partnership                          bool
		effectiveStart                       time.Time
		demotePending                        sql.NullTime
	}
	var batch []spRow
	for rows.Next() {
		var r spRow
		if err := rows.Scan(&r.id, &r.userID, &r.programType, &r.currentTier,
			&r.partnership, &r.effectiveStart, &r.demotePending); err != nil {
			return promoted, demoted, err
		}
		batch = append(batch, r)
	}
	if err := rows.Err(); err != nil {
		return promoted, demoted, err
	}

	for _, r := range batch {
		metrics, mErr := e.collectMetrics(r.userID, r.programType, r.effectiveStart, now)
		if mErr != nil {
			slog.Warn("tier eval: collectMetrics failed", "program", r.id, "err", mErr)
			continue
		}
		target := TargetTier(r.programType, r.partnership, metrics)
		current := parseTier(r.currentTier)

		switch {
		case target > current:
			// Promotion — immediate.
			if err := e.applyTierChange(r.id, target.String(), now, true); err != nil {
				slog.Warn("tier eval: promote failed", "program", r.id, "err", err)
				continue
			}
			slog.Info("tier promoted", "program", r.id, "from", current.String(), "to", target.String(),
				"orders", metrics.PaidOrders, "gmv_cents", metrics.GMVCents, "days", metrics.DaysActive)
			promoted++

		case target < current:
			// Demotion — set or honor the cure window.
			if !r.demotePending.Valid {
				// First time below threshold — start the cure window.
				if err := e.markDemotionPending(r.id, now); err != nil {
					slog.Warn("tier eval: mark pending failed", "program", r.id, "err", err)
				}
				continue
			}
			if now.Sub(r.demotePending.Time) >= DemoteCureWindow {
				if err := e.applyTierChange(r.id, target.String(), now, false); err != nil {
					slog.Warn("tier eval: demote failed", "program", r.id, "err", err)
					continue
				}
				slog.Info("tier demoted", "program", r.id, "from", current.String(), "to", target.String(),
					"pending_since", r.demotePending.Time)
				demoted++
			}

		default:
			// At target — clear any pending demotion mark.
			if r.demotePending.Valid {
				if err := e.clearDemotionPending(r.id, now); err != nil {
					slog.Warn("tier eval: clear pending failed", "program", r.id, "err", err)
				}
			} else {
				_, _ = e.db.Exec(
					`UPDATE seller_programs SET tier_evaluated_at = $1 WHERE id = $2`, now, r.id)
			}
		}
	}
	return promoted, demoted, nil
}

// collectMetrics aggregates the per-seller metrics used for tier decisions.
// Days active is measured from the effective start (approved_at, falling
// back to created_at). Paid orders / GMV come from the canonical orders +
// order_payments tables — CSP attributes via channels.creator_id; MSP via
// shops.owner_user_id -> products.shop_id.
func (e *Evaluator) collectMetrics(userID, programType string, since, now time.Time) (SellerMetrics, error) {
	m := SellerMetrics{
		DaysActive: int(now.Sub(since).Hours() / 24),
	}
	if m.DaysActive < 0 {
		m.DaysActive = 0
	}

	switch programType {
	case "csp":
		// CSP gross = channel-attributed orders. Use order_payments to scope
		// the gross to this seller's allocation, falling back to channel
		// creator attribution when no payment row exists (single-seller orders).
		err := e.db.QueryRow(
			`SELECT COALESCE(COUNT(DISTINCT o.id), 0),
			        COALESCE(SUM(o.total_cents), 0)
			   FROM orders o
			   JOIN channels c ON c.id = o.channel_id
			  WHERE c.creator_id = $1
			    AND o.status IN ('paid', 'shipped', 'delivered', 'completed')`,
			userID,
		).Scan(&m.PaidOrders, &m.GMVCents)
		if err != nil {
			return m, err
		}

	case "msp":
		// MSP gross = product-attributed via the seller's shop.
		err := e.db.QueryRow(
			`SELECT COALESCE(COUNT(DISTINCT o.id), 0),
			        COALESCE(SUM(oi.price_cents * oi.quantity), 0)
			   FROM orders o
			   JOIN order_items oi ON oi.order_id = o.id
			   JOIN products p     ON p.id = oi.product_id
			   JOIN shops s        ON s.id = p.shop_id
		  WHERE s.owner_id = $1
			    AND o.status IN ('paid', 'shipped', 'delivered', 'completed')`,
			userID,
		).Scan(&m.PaidOrders, &m.GMVCents)
		if err != nil {
			return m, err
		}
	}

	return m, nil
}

// applyTierChange writes the new tier and clears the demotion-pending mark.
func (e *Evaluator) applyTierChange(id, newTier string, now time.Time, promoting bool) error {
	_, err := e.db.Exec(
		`UPDATE seller_programs
		    SET tier = $1,
		        tier_evaluated_at = $2,
		        tier_demotion_pending_at = NULL,
		        updated_at = $2
		  WHERE id = $3`,
		newTier, now, id,
	)
	_ = promoting // reserved for future audit logging
	return err
}

// markDemotionPending records the moment a seller's metrics dropped below
// their current tier. The actual demote fires after DemoteCureWindow.
func (e *Evaluator) markDemotionPending(id string, now time.Time) error {
	_, err := e.db.Exec(
		`UPDATE seller_programs
		    SET tier_demotion_pending_at = $1,
		        tier_evaluated_at = $1,
		        updated_at = $1
		  WHERE id = $2`,
		now, id,
	)
	return err
}

// clearDemotionPending wipes the pending mark when a seller's metrics
// recover above their current tier before the cure window expires.
func (e *Evaluator) clearDemotionPending(id string, now time.Time) error {
	_, err := e.db.Exec(
		`UPDATE seller_programs
		    SET tier_demotion_pending_at = NULL,
		        tier_evaluated_at = $1,
		        updated_at = $1
		  WHERE id = $2`,
		now, id,
	)
	return err
}
