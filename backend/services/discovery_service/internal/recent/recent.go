package recent

import (
	"database/sql"
	"fmt"
	"time"
)

// MediaItem represents a recently added media item.
type MediaItem struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Type        string    `json:"type"`
	PosterURL   string    `json:"posterUrl"`
	Overview    string    `json:"overview"`
	AddedAt     time.Time `json:"addedAt"`
	ReleaseYear int       `json:"releaseYear,omitempty"`
	Duration    int       `json:"duration,omitempty"`
}

// GetRecentlyAdded returns media items ordered by when they were added,
// most recent first. Only items with status 'ready' are included.
func GetRecentlyAdded(db *sql.DB, limit int) ([]MediaItem, error) {
	if db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}
	if limit <= 0 {
		limit = 50
	}

	query := `
		SELECT
			mi.id,
			mi.title,
			mi.type,
			mi.poster_url,
			mi.overview,
			mi.added_at,
			mi.release_year,
			mi.duration
		FROM media_items mi
		WHERE mi.status = 'ready'
		ORDER BY mi.added_at DESC
		LIMIT $1
	`

	rows, err := db.Query(query, limit)
	if err != nil {
		return nil, fmt.Errorf("recent query failed: %w", err)
	}
	defer rows.Close()

	var items []MediaItem
	for rows.Next() {
		var item MediaItem
		var posterURL, overview sql.NullString
		var releaseYear, duration sql.NullInt32

		if err := rows.Scan(
			&item.ID,
			&item.Title,
			&item.Type,
			&posterURL,
			&overview,
			&item.AddedAt,
			&releaseYear,
			&duration,
		); err != nil {
			return nil, fmt.Errorf("scanning recent row: %w", err)
		}

		if posterURL.Valid {
			item.PosterURL = posterURL.String
		}
		if overview.Valid {
			item.Overview = overview.String
		}
		if releaseYear.Valid {
			item.ReleaseYear = int(releaseYear.Int32)
		}
		if duration.Valid {
			item.Duration = int(duration.Int32)
		}

		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating recent rows: %w", err)
	}

	return items, nil
}
