package store

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/lib/pq"

	"greggie/backend/internal/models"
)

// ── Errors ───────────────────────────────────────────────────────────

// ErrNoOpenWindow is returned when a seller tries to apply but no
// partnership window is currently open.
var ErrNoOpenWindow = errors.New("partnerships: no open application window")

// ErrWindowFull is returned when a window's slot_cap is exhausted.
var ErrWindowFull = errors.New("partnerships: window is fully subscribed")

// ErrAlreadyApplied is returned when a seller already has a non-withdrawn
// application in the current window.
var ErrAlreadyApplied = errors.New("partnerships: an application is already in flight for this window")

// ErrNotEligible is returned when a seller submits an application but their
// cached partnership_eligible flag is FALSE.
var ErrNotEligible = errors.New("partnerships: program is not currently eligible")

// ErrAlreadyPartner is returned when an active partner tries to apply.
var ErrAlreadyPartner = errors.New("partnerships: program is already a partner")

// ── Windows ──────────────────────────────────────────────────────────

// CreatePartnershipWindow inserts a new window in 'scheduled' status.
func (s *Store) CreatePartnershipWindow(req models.PartnershipWindowRequest) (*models.PartnershipWindow, error) {
	if req.SlotCap <= 0 {
		req.SlotCap = 5
	}
	w := &models.PartnershipWindow{}
	err := s.PG.QueryRow(
		`INSERT INTO partnership_windows (label, opens_at, closes_at, slot_cap, notes)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, label, opens_at, closes_at, slot_cap, slots_used, status,
		           COALESCE(notes,''), created_at, updated_at`,
		req.Label, req.OpensAt, req.ClosesAt, req.SlotCap, req.Notes,
	).Scan(&w.ID, &w.Label, &w.OpensAt, &w.ClosesAt, &w.SlotCap, &w.SlotsUsed, &w.Status,
		&w.Notes, &w.CreatedAt, &w.UpdatedAt)
	if err != nil {
		return nil, err
	}
	w.SlotsLeft = w.SlotCap - w.SlotsUsed
	return w, nil
}

// SetPartnershipWindowStatus transitions a window between scheduled, open, closed.
func (s *Store) SetPartnershipWindowStatus(windowID, status string) error {
	if status != "scheduled" && status != "open" && status != "closed" {
		return fmt.Errorf("invalid window status: %s", status)
	}
	_, err := s.PG.Exec(
		`UPDATE partnership_windows SET status = $1, updated_at = NOW() WHERE id = $2::uuid`,
		status, windowID,
	)
	return err
}

// GetOpenPartnershipWindow returns the currently-open window or nil if none.
// "Open" means status='open' AND opens_at <= NOW() <= closes_at.
func (s *Store) GetOpenPartnershipWindow() (*models.PartnershipWindow, error) {
	w := &models.PartnershipWindow{}
	err := s.PG.QueryRow(
		`SELECT id, label, opens_at, closes_at, slot_cap, slots_used, status,
		        COALESCE(notes,''), created_at, updated_at
		   FROM partnership_windows
		  WHERE status = 'open' AND opens_at <= NOW() AND closes_at >= NOW()
		  ORDER BY opens_at DESC LIMIT 1`,
	).Scan(&w.ID, &w.Label, &w.OpensAt, &w.ClosesAt, &w.SlotCap, &w.SlotsUsed, &w.Status,
		&w.Notes, &w.CreatedAt, &w.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	w.SlotsLeft = w.SlotCap - w.SlotsUsed
	return w, nil
}

// GetNextScheduledPartnershipWindow returns the soonest future window
// (status='scheduled' OR status='open' with opens_at in the future).
// Used by the dashboard to show "next intake opens on …".
func (s *Store) GetNextScheduledPartnershipWindow() (*models.PartnershipWindow, error) {
	w := &models.PartnershipWindow{}
	err := s.PG.QueryRow(
		`SELECT id, label, opens_at, closes_at, slot_cap, slots_used, status,
		        COALESCE(notes,''), created_at, updated_at
		   FROM partnership_windows
		  WHERE status IN ('scheduled','open') AND opens_at > NOW()
		  ORDER BY opens_at ASC LIMIT 1`,
	).Scan(&w.ID, &w.Label, &w.OpensAt, &w.ClosesAt, &w.SlotCap, &w.SlotsUsed, &w.Status,
		&w.Notes, &w.CreatedAt, &w.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	w.SlotsLeft = w.SlotCap - w.SlotsUsed
	return w, nil
}

// ListPartnershipWindows returns all windows for the admin console.
func (s *Store) ListPartnershipWindows(limit int) ([]models.PartnershipWindow, error) {
	if limit <= 0 || limit > 100 {
		limit = 25
	}
	rows, err := s.PG.Query(
		`SELECT id, label, opens_at, closes_at, slot_cap, slots_used, status,
		        COALESCE(notes,''), created_at, updated_at
		   FROM partnership_windows
		  ORDER BY opens_at DESC
		  LIMIT $1`, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.PartnershipWindow
	for rows.Next() {
		var w models.PartnershipWindow
		if err := rows.Scan(&w.ID, &w.Label, &w.OpensAt, &w.ClosesAt, &w.SlotCap, &w.SlotsUsed,
			&w.Status, &w.Notes, &w.CreatedAt, &w.UpdatedAt); err != nil {
			return nil, err
		}
		w.SlotsLeft = w.SlotCap - w.SlotsUsed
		out = append(out, w)
	}
	return out, nil
}

// ── Applications ─────────────────────────────────────────────────────

// SubmitPartnershipApplication writes a new application after verifying
// the seller is eligible, not already a partner, and that an open window
// with capacity exists. The window's slots_used is NOT incremented here —
// approval is what consumes a slot (see DecidePartnershipApplication).
func (s *Store) SubmitPartnershipApplication(
	userID, programType, pitch string, references []string,
) (*models.PartnershipApplication, error) {

	tx, err := s.PG.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// Look up the program and its eligibility flag.
	var programID, tier string
	var isPartner, eligible bool
	err = tx.QueryRow(
		`SELECT id, tier, partnership_program, partnership_eligible
		   FROM seller_programs
		  WHERE user_id = $1 AND program_type = $2
		  FOR UPDATE`,
		userID, programType,
	).Scan(&programID, &tier, &isPartner, &eligible)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("no %s program found for user", programType)
	}
	if err != nil {
		return nil, err
	}
	if isPartner {
		return nil, ErrAlreadyPartner
	}
	if !eligible {
		return nil, ErrNotEligible
	}

	// Find the currently-open window with capacity.
	var windowID string
	var slotCap, slotsUsed int
	err = tx.QueryRow(
		`SELECT id, slot_cap, slots_used
		   FROM partnership_windows
		  WHERE status = 'open' AND opens_at <= NOW() AND closes_at >= NOW()
		  ORDER BY opens_at DESC LIMIT 1
		  FOR UPDATE`,
	).Scan(&windowID, &slotCap, &slotsUsed)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNoOpenWindow
	}
	if err != nil {
		return nil, err
	}
	if slotsUsed >= slotCap {
		return nil, ErrWindowFull
	}

	// Encode references to a JSONB column.
	var refsJSON []byte
	if len(references) > 0 {
		refsJSON, _ = json.Marshal(references)
	}

	app := &models.PartnershipApplication{}
	err = tx.QueryRow(
		`INSERT INTO partnership_applications
		   (program_id, user_id, window_id, pitch, references_json, status)
		 VALUES ($1, $2, $3, $4, $5, 'submitted')
		 RETURNING id, program_id, user_id, window_id, pitch, status,
		           COALESCE(decision_reason,''), reviewed_by, reviewed_at, created_at, updated_at`,
		programID, userID, windowID, pitch, refsJSON,
	).Scan(&app.ID, &app.ProgramID, &app.UserID, &app.WindowID, &app.Pitch, &app.Status,
		&app.DecisionReason, &app.ReviewedBy, &app.ReviewedAt, &app.CreatedAt, &app.UpdatedAt)
	if err != nil {
		// Friendly error for the unique constraint
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			return nil, ErrAlreadyApplied
		}
		return nil, err
	}
	app.References = references

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return app, nil
}

// WithdrawPartnershipApplication lets a seller pull their own application
// while it's still pending review.
func (s *Store) WithdrawPartnershipApplication(applicationID, userID string) error {
	res, err := s.PG.Exec(
		`UPDATE partnership_applications
		    SET status = 'withdrawn', updated_at = NOW()
		  WHERE id = $1::uuid
		    AND user_id = $2::uuid
		    AND status IN ('submitted','under_review')`,
		applicationID, userID,
	)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return errors.New("application not found, not yours, or already decided")
	}
	return nil
}

// ListMyPartnershipApplications returns a user's application history.
func (s *Store) ListMyPartnershipApplications(userID string) ([]models.PartnershipApplication, error) {
	rows, err := s.PG.Query(
		`SELECT a.id, a.program_id, a.user_id, a.window_id, w.label,
		        a.pitch, a.references_json, a.status, COALESCE(a.decision_reason,''),
		        a.reviewed_by, a.reviewed_at, a.created_at, a.updated_at
		   FROM partnership_applications a
		   JOIN partnership_windows w ON w.id = a.window_id
		  WHERE a.user_id = $1::uuid
		  ORDER BY a.created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.PartnershipApplication
	for rows.Next() {
		var app models.PartnershipApplication
		var refsJSON sql.NullString
		if err := rows.Scan(&app.ID, &app.ProgramID, &app.UserID, &app.WindowID, &app.WindowLabel,
			&app.Pitch, &refsJSON, &app.Status, &app.DecisionReason,
			&app.ReviewedBy, &app.ReviewedAt, &app.CreatedAt, &app.UpdatedAt); err != nil {
			return nil, err
		}
		if refsJSON.Valid && refsJSON.String != "" {
			_ = json.Unmarshal([]byte(refsJSON.String), &app.References)
		}
		out = append(out, app)
	}
	return out, nil
}

// AdminListPartnershipApplications returns the review queue. statusFilter
// of "" returns all; common values are 'submitted', 'under_review'.
func (s *Store) AdminListPartnershipApplications(statusFilter string, limit, offset int) ([]models.PartnershipApplication, int, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}

	where := ""
	var args []interface{}
	argIdx := 1
	if statusFilter != "" {
		// Allow comma-separated list, e.g. "submitted,under_review"
		statuses := strings.Split(statusFilter, ",")
		where = fmt.Sprintf(" WHERE a.status = ANY($%d::text[])", argIdx)
		args = append(args, pq.Array(statuses))
		argIdx++
	}

	var total int
	if err := s.PG.QueryRow(
		`SELECT COUNT(*) FROM partnership_applications a`+where, args...,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	args = append(args, limit, offset)
	rows, err := s.PG.Query(
		`SELECT a.id, a.program_id, a.user_id, a.window_id, w.label,
		        a.pitch, a.references_json, a.status, COALESCE(a.decision_reason,''),
		        a.reviewed_by, a.reviewed_at, a.created_at, a.updated_at,
		        COALESCE(u.display_name,''), COALESCE(u.username,''),
		        sp.program_type, sp.tier
		   FROM partnership_applications a
		   JOIN partnership_windows w ON w.id = a.window_id
		   JOIN users u                ON u.id = a.user_id
		   JOIN seller_programs sp     ON sp.id = a.program_id`+where+
			fmt.Sprintf(" ORDER BY a.created_at DESC LIMIT $%d OFFSET $%d", argIdx, argIdx+1),
		args...,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var out []models.PartnershipApplication
	for rows.Next() {
		var app models.PartnershipApplication
		var refsJSON sql.NullString
		if err := rows.Scan(&app.ID, &app.ProgramID, &app.UserID, &app.WindowID, &app.WindowLabel,
			&app.Pitch, &refsJSON, &app.Status, &app.DecisionReason,
			&app.ReviewedBy, &app.ReviewedAt, &app.CreatedAt, &app.UpdatedAt,
			&app.SellerName, &app.SellerHandle, &app.ProgramType, &app.CurrentTier); err != nil {
			return nil, 0, err
		}
		if refsJSON.Valid && refsJSON.String != "" {
			_ = json.Unmarshal([]byte(refsJSON.String), &app.References)
		}
		out = append(out, app)
	}
	return out, total, nil
}

// DecidePartnershipApplication is the admin approve/reject mutation.
// On approve: flips partnership_program=TRUE on the seller_programs row,
// stamps partnership_term_ends_at = NOW + term_days, optionally assigns
// an account manager, and increments the window's slots_used.
func (s *Store) DecidePartnershipApplication(
	applicationID, reviewerID string,
	decision, reason, accountManagerID string,
	termDays int,
) error {
	if decision != "approved" && decision != "rejected" {
		return fmt.Errorf("invalid decision: %s", decision)
	}
	if decision == "rejected" && strings.TrimSpace(reason) == "" {
		return errors.New("reason is required when rejecting")
	}

	tx, err := s.PG.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var programID, windowID, currentStatus string
	err = tx.QueryRow(
		`SELECT program_id, window_id, status
		   FROM partnership_applications
		  WHERE id = $1::uuid
		  FOR UPDATE`, applicationID,
	).Scan(&programID, &windowID, &currentStatus)
	if errors.Is(err, sql.ErrNoRows) {
		return errors.New("application not found")
	}
	if err != nil {
		return err
	}
	if currentStatus != "submitted" && currentStatus != "under_review" {
		return fmt.Errorf("application already %s", currentStatus)
	}

	if _, err := tx.Exec(
		`UPDATE partnership_applications
		    SET status = $1, decision_reason = $2, reviewed_by = $3::uuid,
		        reviewed_at = NOW(), updated_at = NOW()
		  WHERE id = $4::uuid`,
		decision, reason, reviewerID, applicationID,
	); err != nil {
		return err
	}

	if decision == "approved" {
		// Capacity check + consume slot.
		var slotCap, slotsUsed int
		if err := tx.QueryRow(
			`SELECT slot_cap, slots_used FROM partnership_windows
			  WHERE id = $1::uuid FOR UPDATE`, windowID,
		).Scan(&slotCap, &slotsUsed); err != nil {
			return err
		}
		if slotsUsed >= slotCap {
			return ErrWindowFull
		}
		if _, err := tx.Exec(
			`UPDATE partnership_windows
			    SET slots_used = slots_used + 1, updated_at = NOW()
			  WHERE id = $1::uuid`, windowID,
		); err != nil {
			return err
		}

		// Flip the program.
		termEnds := time.Now().UTC().Add(time.Duration(termDays) * 24 * time.Hour)
		var amArg interface{}
		if accountManagerID != "" {
			amArg = accountManagerID
		}
		if _, err := tx.Exec(
			`UPDATE seller_programs
			    SET partnership_program = TRUE,
			        partnership_term_ends_at = $1,
			        partnership_account_manager_id = $2,
			        updated_at = NOW()
			  WHERE id = $3::uuid`,
			termEnds, amArg, programID,
		); err != nil {
			return err
		}
	}

	return tx.Commit()
}

// ── Eligibility cache reads ──────────────────────────────────────────

// GetPartnershipEligibilitySnapshot reads the cached checklist (last
// nightly evaluator run) for a program. Returns (nil,nil) if no snapshot
// has been written yet.
func (s *Store) GetPartnershipEligibilitySnapshot(programID string) ([]models.PartnershipChecklistItem, *time.Time, error) {
	var raw sql.NullString
	var since sql.NullTime
	err := s.PG.QueryRow(
		`SELECT partnership_metrics_snapshot::text, partnership_eligible_since
		   FROM seller_programs WHERE id = $1::uuid`, programID,
	).Scan(&raw, &since)
	if err != nil {
		return nil, nil, err
	}
	if !raw.Valid || raw.String == "" {
		var sincePtr *time.Time
		if since.Valid {
			sincePtr = &since.Time
		}
		return nil, sincePtr, nil
	}
	var items []models.PartnershipChecklistItem
	if err := json.Unmarshal([]byte(raw.String), &items); err != nil {
		return nil, nil, err
	}
	var sincePtr *time.Time
	if since.Valid {
		sincePtr = &since.Time
	}
	return items, sincePtr, nil
}

// ── Public partner directory ─────────────────────────────────────────

// ListPartnerDirectory returns the public wall-of-fame: every seller with
// partnership_program=TRUE and an unexpired term. Ordered newest-partner-first
// by default so the directory feels alive.
func (s *Store) ListPartnerDirectory(limit int) ([]models.PartnerDirectoryEntry, error) {
	if limit <= 0 || limit > 200 {
		limit = 100
	}
	rows, err := s.PG.Query(
		`SELECT sp.user_id, COALESCE(u.display_name,''), COALESCE(u.username,''),
		        COALESCE(u.avatar_url,''), sp.program_type,
		        COALESCE(sp.partnership_term_ends_at - INTERVAL '365 days', sp.updated_at) AS partner_since
		   FROM seller_programs sp
		   JOIN users u ON u.id = sp.user_id
		  WHERE sp.partnership_program = TRUE
		    AND (sp.partnership_term_ends_at IS NULL OR sp.partnership_term_ends_at > NOW())
		  ORDER BY partner_since DESC
		  LIMIT $1`, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.PartnerDirectoryEntry
	for rows.Next() {
		var e models.PartnerDirectoryEntry
		if err := rows.Scan(&e.UserID, &e.DisplayName, &e.Handle, &e.AvatarURL,
			&e.ProgramType, &e.PartnerSince); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, nil
}
