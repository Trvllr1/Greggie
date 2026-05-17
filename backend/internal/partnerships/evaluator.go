// Package partnerships implements the Greggie Partnership Program: the
// curated, capacity-constrained track layered on top of the auto-computed
// seller tier ladder.
//
// Two responsibilities live in this package:
//
//  1. Nightly eligibility evaluation — for every active seller_programs row,
//     compute the partnership checklist (tier, tenure, GMV, order count,
//     fulfillment SLA hit rate, rating, activity rhythm) and cache the
//     pass/fail flag on the row. The dashboard reads this directly.
//
//  2. Auto-revocation — partner sellers whose auto-tier has been below
//     'established' for 30+ days lose their partnership_program flag and
//     drop back to the established commission rate. (Their term_ends_at
//     is preserved; ops can manually reinstate within the grace window.)
//
// Application submission / review and quarterly cohort windows live in
// the handlers + store layers and use this package's checklist + thresholds
// as the gating logic.
package partnerships

import (
	"database/sql"
	"encoding/json"
	"log/slog"
	"time"

	"greggie/backend/internal/models"
	"greggie/backend/internal/store"
)

// ── Thresholds ───────────────────────────────────────────────────────
//
// These constants are the published partnership floor. They are deliberately
// duplicated here (rather than read from a config table) so the criteria
// are auditable in git history. Bumping a threshold is a code change with
// review, not a silent SQL update.

const (
	// Tenure
	MinDaysOnPlatform = 180

	// Trailing-90d volume
	MinTrailing90dGMVCSPCents int64 = 25_00_000 // $25,000
	MinTrailing90dGMVMSPCents int64 = 50_00_000 // $50,000

	MinTrailing90dOrdersCSP = 500
	MinTrailing90dOrdersMSP = 1000

	// Fulfillment SLA (MSP only — CSP fulfillment varies)
	ShipSLADays      = 3
	MinShipSLAPct    = 98.0
	MinReviewSamples = 10 // need at least 10 reviews before rating gate fires

	// Quality
	MinAvgRating = 4.7

	// Activity rhythm
	MinNewListingsPerMonth = 20 // MSP
	// CSP activity rhythm (streams/week) requires stream-history data we
	// don't currently track. We mark the item as Skipped (auto-pass) until
	// that signal lands.

	// Eligibility streak — metrics must be green for 30 consecutive days
	EligibilityStreakDays = 30

	// Partnership term + auto-revocation window
	PartnershipTermDays       = 365
	BelowEstablishedGraceDays = 30
)

// Evaluator computes partnership eligibility for every active seller program
// and writes the cached result back to seller_programs.
type Evaluator struct {
	st *store.Store
	db *sql.DB
}

// NewEvaluator wires up the evaluator. db must be the same *sql.DB the
// store uses (we hold it directly so per-seller metric queries don't need
// a round trip through Store).
func NewEvaluator(st *store.Store, db *sql.DB) *Evaluator {
	return &Evaluator{st: st, db: db}
}

// metricsRow is the internal aggregate used to build a checklist.
type metricsRow struct {
	DaysOnPlatform    int
	Tier              string
	Trailing90dGMV    int64
	Trailing90dOrders int
	ShipSLAPct        float64
	ShipSLASamples    int
	AvgRating         float64
	RatingSamples     int
	NewListings30d    int
}

// EvaluateAll walks every approved/active seller program and refreshes
// the eligibility checklist. Returns counts for logging.
//
// Side effects per row:
//   - partnership_eligible / partnership_eligible_since updated
//   - partnership_metrics_snapshot stamped with the JSON checklist
//   - if currently a partner AND auto-tier < established AND that state
//     is older than BelowEstablishedGraceDays, partnership_program is
//     auto-revoked (with a slog entry).
func (e *Evaluator) EvaluateAll() (eligible, newlyEligible, revoked int, err error) {
	rows, err := e.db.Query(
		`SELECT sp.id, sp.user_id, sp.program_type, sp.tier,
		        sp.partnership_program, sp.partnership_eligible,
		        sp.partnership_eligible_since, sp.partnership_term_ends_at,
		        sp.partnership_paused_until,
		        sp.tier_demotion_pending_at,
		        COALESCE(sp.approved_at, sp.created_at) AS effective_start
		   FROM seller_programs sp
		  WHERE sp.status IN ('active','approved')`,
	)
	if err != nil {
		return 0, 0, 0, err
	}
	defer rows.Close()

	type row struct {
		id, userID, programType, tier string
		isPartner, wasEligible        bool
		eligibleSince                 sql.NullTime
		termEndsAt                    sql.NullTime
		pausedUntil                   sql.NullTime
		tierDemotionPendingAt         sql.NullTime
		effectiveStart                time.Time
	}
	var batch []row
	for rows.Next() {
		var r row
		if err := rows.Scan(&r.id, &r.userID, &r.programType, &r.tier,
			&r.isPartner, &r.wasEligible, &r.eligibleSince, &r.termEndsAt,
			&r.pausedUntil, &r.tierDemotionPendingAt, &r.effectiveStart); err != nil {
			return eligible, newlyEligible, revoked, err
		}
		batch = append(batch, r)
	}
	if err := rows.Err(); err != nil {
		return eligible, newlyEligible, revoked, err
	}

	now := time.Now().UTC()
	for _, r := range batch {
		metrics, mErr := e.collectMetrics(r.userID, r.programType, r.effectiveStart, now)
		if mErr != nil {
			slog.Warn("partnership eval: collectMetrics failed", "program", r.id, "err", mErr)
			continue
		}
		metrics.Tier = r.tier
		checklist := BuildChecklist(r.programType, metrics)

		// All non-skipped items must pass. Skipped items (no data) auto-pass.
		allPass := true
		for _, item := range checklist {
			if !item.Skipped && !item.Passing {
				allPass = false
				break
			}
		}

		// Encode the snapshot once for both update paths.
		snapshot, _ := json.Marshal(checklist)

		// Eligibility transition
		if allPass {
			if !r.wasEligible {
				if _, exErr := e.db.Exec(
					`UPDATE seller_programs
					    SET partnership_eligible = TRUE,
					        partnership_eligible_since = $1,
					        partnership_metrics_snapshot = $2,
					        updated_at = $1
					  WHERE id = $3`,
					now, snapshot, r.id); exErr != nil {
					slog.Warn("partnership eval: set eligible failed", "program", r.id, "err", exErr)
					continue
				}
				slog.Info("partnership: newly eligible", "program", r.id, "user", r.userID, "type", r.programType)
				newlyEligible++
			} else {
				_, _ = e.db.Exec(
					`UPDATE seller_programs
					    SET partnership_metrics_snapshot = $1, updated_at = $2
					  WHERE id = $3`,
					snapshot, now, r.id)
			}
			eligible++
		} else if r.wasEligible {
			if _, exErr := e.db.Exec(
				`UPDATE seller_programs
				    SET partnership_eligible = FALSE,
				        partnership_eligible_since = NULL,
				        partnership_metrics_snapshot = $1,
				        updated_at = $2
				  WHERE id = $3`,
				snapshot, now, r.id); exErr != nil {
				slog.Warn("partnership eval: clear eligible failed", "program", r.id, "err", exErr)
			}
		} else {
			_, _ = e.db.Exec(
				`UPDATE seller_programs
				    SET partnership_metrics_snapshot = $1, updated_at = $2
				  WHERE id = $3`,
				snapshot, now, r.id)
		}

		// Auto-revocation: existing partner whose tier dropped below
		// 'established' AND the demotion has been pending for 30+ days.
		// We only revoke if they're not on an explicit pause.
		if r.isPartner && r.tier != "partner" && r.tier != "established" {
			pausedActive := r.pausedUntil.Valid && r.pausedUntil.Time.After(now)
			if !pausedActive && r.tierDemotionPendingAt.Valid &&
				now.Sub(r.tierDemotionPendingAt.Time) >= BelowEstablishedGraceDays*24*time.Hour {
				if _, exErr := e.db.Exec(
					`UPDATE seller_programs
					    SET partnership_program = FALSE,
					        updated_at = $1
					  WHERE id = $2`,
					now, r.id); exErr != nil {
					slog.Warn("partnership eval: auto-revoke failed", "program", r.id, "err", exErr)
					continue
				}
				slog.Warn("partnership: auto-revoked",
					"program", r.id, "user", r.userID, "tier", r.tier,
					"pending_since", r.tierDemotionPendingAt.Time)
				revoked++
			}
		}
	}
	return eligible, newlyEligible, revoked, nil
}

// BuildChecklist materializes the published criteria into the dashboard's
// PartnershipChecklistItem list. Exported so the eligibility API endpoint
// can re-use it for an on-demand view without scheduling a full sweep.
func BuildChecklist(programType string, m metricsRow) []models.PartnershipChecklistItem {
	items := []models.PartnershipChecklistItem{
		{
			Key:      "days_on_platform",
			Label:    "Tenure on Greggie",
			Target:   float64(MinDaysOnPlatform),
			Current:  float64(m.DaysOnPlatform),
			Unit:     "days",
			Passing:  m.DaysOnPlatform >= MinDaysOnPlatform,
			HelpText: "Minimum six months of activity. We want to see how you operate over a full season.",
		},
		{
			Key:      "tier_established",
			Label:    "Established tier (or above)",
			Target:   1,
			Current:  boolToFloat(m.Tier == "established" || m.Tier == "partner"),
			Unit:     "bool",
			Passing:  m.Tier == "established" || m.Tier == "partner",
			HelpText: "Your auto-computed tier must be 'established' before you can apply.",
		},
	}

	if programType == "csp" {
		items = append(items,
			models.PartnershipChecklistItem{
				Key:      "trailing_90d_gmv",
				Label:    "Trailing-90d GMV",
				Target:   float64(MinTrailing90dGMVCSPCents),
				Current:  float64(m.Trailing90dGMV),
				Unit:     "usd_cents",
				Passing:  m.Trailing90dGMV >= MinTrailing90dGMVCSPCents,
				HelpText: "Gross merchandise value across paid orders in the last 90 days.",
			},
			models.PartnershipChecklistItem{
				Key:      "trailing_90d_orders",
				Label:    "Trailing-90d paid orders",
				Target:   float64(MinTrailing90dOrdersCSP),
				Current:  float64(m.Trailing90dOrders),
				Unit:     "orders",
				Passing:  m.Trailing90dOrders >= MinTrailing90dOrdersCSP,
				HelpText: "Order volume signals depth, not just blockbuster drops.",
			},
		)
	} else {
		items = append(items,
			models.PartnershipChecklistItem{
				Key:      "trailing_90d_gmv",
				Label:    "Trailing-90d GMV",
				Target:   float64(MinTrailing90dGMVMSPCents),
				Current:  float64(m.Trailing90dGMV),
				Unit:     "usd_cents",
				Passing:  m.Trailing90dGMV >= MinTrailing90dGMVMSPCents,
				HelpText: "Gross merchandise value across paid orders in the last 90 days.",
			},
			models.PartnershipChecklistItem{
				Key:      "trailing_90d_orders",
				Label:    "Trailing-90d paid orders",
				Target:   float64(MinTrailing90dOrdersMSP),
				Current:  float64(m.Trailing90dOrders),
				Unit:     "orders",
				Passing:  m.Trailing90dOrders >= MinTrailing90dOrdersMSP,
				HelpText: "Order volume signals depth, not just blockbuster drops.",
			},
			models.PartnershipChecklistItem{
				Key:      "ship_sla",
				Label:    "Ship-within-3-days rate",
				Target:   MinShipSLAPct,
				Current:  m.ShipSLAPct,
				Unit:     "pct",
				Passing:  m.ShipSLASamples == 0 || m.ShipSLAPct >= MinShipSLAPct,
				Skipped:  m.ShipSLASamples == 0,
				HelpText: "Percentage of paid orders shipped within 3 days of payment.",
			},
			models.PartnershipChecklistItem{
				Key:      "new_listings_30d",
				Label:    "New listings (30d)",
				Target:   float64(MinNewListingsPerMonth),
				Current:  float64(m.NewListings30d),
				Unit:     "listings",
				Passing:  m.NewListings30d >= MinNewListingsPerMonth,
				HelpText: "Active sellers refresh inventory. We want stores that ship, not stockpiles.",
			},
		)
	}

	// Rating applies to both program types but auto-passes until we have
	// enough samples (avoids new sellers getting locked out by one bad review).
	items = append(items, models.PartnershipChecklistItem{
		Key:      "avg_rating",
		Label:    "Average buyer rating",
		Target:   MinAvgRating,
		Current:  m.AvgRating,
		Unit:     "rating",
		Passing:  m.RatingSamples < MinReviewSamples || m.AvgRating >= MinAvgRating,
		Skipped:  m.RatingSamples < MinReviewSamples,
		HelpText: "Average across product reviews. Requires at least 10 reviews to evaluate.",
	})

	return items
}

func boolToFloat(b bool) float64 {
	if b {
		return 1
	}
	return 0
}

// collectMetrics aggregates the seller's snapshot for eligibility. Missing
// data tables (reviews, fulfillment, listings) are treated as 0 samples —
// the checklist marks those items as Skipped (auto-pass) so partial
// instrumentation never blocks an otherwise-qualifying seller.
func (e *Evaluator) collectMetrics(userID, programType string, effectiveStart, now time.Time) (metricsRow, error) {
	m := metricsRow{
		DaysOnPlatform: int(now.Sub(effectiveStart).Hours() / 24),
	}
	if m.DaysOnPlatform < 0 {
		m.DaysOnPlatform = 0
	}
	since := now.Add(-90 * 24 * time.Hour)

	switch programType {
	case "csp":
		if err := e.db.QueryRow(
			`SELECT COALESCE(COUNT(DISTINCT o.id),0),
			        COALESCE(SUM(o.total_cents),0)
			   FROM orders o
			   JOIN channels c ON c.id = o.channel_id
			  WHERE c.creator_id = $1
			    AND o.created_at >= $2
			    AND o.status IN ('paid','shipped','delivered','completed')`,
			userID, since,
		).Scan(&m.Trailing90dOrders, &m.Trailing90dGMV); err != nil {
			return m, err
		}

	case "msp":
		if err := e.db.QueryRow(
			`SELECT COALESCE(COUNT(DISTINCT o.id),0),
			        COALESCE(SUM(oi.price_cents * oi.quantity),0)
			   FROM orders o
			   JOIN order_items oi ON oi.order_id = o.id
			   JOIN products p     ON p.id = oi.product_id
			   JOIN shops s        ON s.id = p.shop_id
			  WHERE s.owner_id = $1
			    AND o.created_at >= $2
			    AND o.status IN ('paid','shipped','delivered','completed')`,
			userID, since,
		).Scan(&m.Trailing90dOrders, &m.Trailing90dGMV); err != nil {
			return m, err
		}

		// Ship SLA: percentage of paid+ orders for this seller shipped
		// within ShipSLADays of order creation.
		var shipped, total int
		_ = e.db.QueryRow(
			`SELECT COALESCE(SUM(CASE WHEN fr.shipped_at IS NOT NULL
			                          AND fr.shipped_at <= o.created_at + ($3 || ' days')::interval
			                          THEN 1 ELSE 0 END),0),
			        COUNT(*)
			   FROM fulfillment_records fr
			   JOIN orders o ON o.id = fr.order_id
			  WHERE fr.seller_id = $1
			    AND o.created_at >= $2
			    AND o.status IN ('paid','shipped','delivered','completed')`,
			userID, since, ShipSLADays,
		).Scan(&shipped, &total)
		m.ShipSLASamples = total
		if total > 0 {
			m.ShipSLAPct = float64(shipped) * 100.0 / float64(total)
		}

		// New listings in last 30 days
		_ = e.db.QueryRow(
			`SELECT COUNT(*)
			   FROM products p
			   JOIN shops s ON s.id = p.shop_id
			  WHERE s.owner_id = $1
			    AND p.created_at >= $2`,
			userID, now.Add(-30*24*time.Hour),
		).Scan(&m.NewListings30d)
	}

	// Rating: product_reviews → products → shops.owner_id for MSP, or
	// product_reviews → products → channels via channel_products for CSP.
	// We compute both program types via shops first (MSP path); CSP-only
	// sellers without a shop simply have 0 samples and auto-pass.
	_ = e.db.QueryRow(
		`SELECT COALESCE(AVG(pr.rating),0)::float, COUNT(*)
		   FROM product_reviews pr
		   JOIN products p ON p.id = pr.product_id
		   JOIN shops s    ON s.id = p.shop_id
		  WHERE s.owner_id = $1`,
		userID,
	).Scan(&m.AvgRating, &m.RatingSamples)

	return m, nil
}

// ChecklistForProgram is a thin convenience the handler can call for an
// on-demand checklist (e.g. when the seller opens their dashboard).
func (e *Evaluator) ChecklistForProgram(programID string) ([]models.PartnershipChecklistItem, error) {
	var userID, programType, tier string
	var effectiveStart time.Time
	err := e.db.QueryRow(
		`SELECT user_id, program_type, tier, COALESCE(approved_at, created_at)
		   FROM seller_programs WHERE id = $1`, programID,
	).Scan(&userID, &programType, &tier, &effectiveStart)
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	m, err := e.collectMetrics(userID, programType, effectiveStart, now)
	if err != nil {
		return nil, err
	}
	m.Tier = tier
	return BuildChecklist(programType, m), nil
}

// AllPass reports whether every non-skipped item in the checklist passes.
func AllPass(items []models.PartnershipChecklistItem) bool {
	for _, it := range items {
		if !it.Skipped && !it.Passing {
			return false
		}
	}
	return true
}
