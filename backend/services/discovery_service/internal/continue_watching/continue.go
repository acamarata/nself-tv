package continue_watching

import (
	"database/sql"
	"fmt"
	"time"
)

// ProgressItem represents a media item the user has started but not finished.
type ProgressItem struct {
	ID              string    `json:"id"`
	MediaID         string    `json:"mediaId"`
	Title           string    `json:"title"`
	Type            string    `json:"type"`
	PosterURL       string    `json:"posterUrl"`
	ProgressPercent float64   `json:"progressPercent"`
	ProgressSeconds int       `json:"progressSeconds"`
	TotalSeconds    int       `json:"totalSeconds"`
	LastWatchedAt   time.Time `json:"lastWatchedAt"`
}

// GetContinueWatching returns in-progress media for a given user and profile,
// ordered by most recently watched. Only incomplete items are returned.
func GetContinueWatching(db *sql.DB, userID, profileID string, limit int) ([]ProgressItem, error) {
	if db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}
	if userID == "" {
		return nil, fmt.Errorf("userID is required")
	}
	if limit <= 0 {
		limit = 20
	}

	query := `
		SELECT
			wp.id,
			wp.media_id,
			mi.title,
			mi.type,
			mi.poster_url,
			wp.progress_percent,
			wp.progress_seconds,
			COALESCE(mi.duration, 0) AS total_seconds,
			wp.updated_at AS last_watched_at
		FROM watch_progress wp
		INNER JOIN media_items mi ON mi.id = wp.media_id
		WHERE wp.user_id = $1
			AND ($2 = '' OR wp.profile_id = $2)
			AND wp.completed = false
			AND wp.progress_percent > 0
			AND wp.progress_percent < 100
			AND mi.status = 'ready'
		ORDER BY wp.updated_at DESC
		LIMIT $3
	`

	rows, err := db.Query(query, userID, profileID, limit)
	if err != nil {
		return nil, fmt.Errorf("continue watching query failed: %w", err)
	}
	defer rows.Close()

	var items []ProgressItem
	for rows.Next() {
		var item ProgressItem
		var posterURL sql.NullString

		if err := rows.Scan(
			&item.ID,
			&item.MediaID,
			&item.Title,
			&item.Type,
			&posterURL,
			&item.ProgressPercent,
			&item.ProgressSeconds,
			&item.TotalSeconds,
			&item.LastWatchedAt,
		); err != nil {
			return nil, fmt.Errorf("scanning continue watching row: %w", err)
		}

		if posterURL.Valid {
			item.PosterURL = posterURL.String
		}

		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating continue watching rows: %w", err)
	}

	return items, nil
}
