package trending

import (
	"database/sql"
	"fmt"
	"time"
)

// TrendingItem represents a media item with its trending score.
type TrendingItem struct {
	ID             string  `json:"id"`
	Title          string  `json:"title"`
	Type           string  `json:"type"`
	PosterURL      string  `json:"posterUrl"`
	Score          float64 `json:"score"`
	ViewCount      int     `json:"viewCount"`
	AvgRating      float64 `json:"avgRating"`
	CompletionRate float64 `json:"completionRate"`
	Rank           int     `json:"rank"`
}

// Weights for the trending score calculation.
const (
	weightViewCount      = 0.50
	weightAvgRating      = 0.30
	weightCompletionRate = 0.20
)

// CalculateTrending computes trending items based on watch activity within the
// given time window. Scoring weights: view_count (50%), avg_rating (30%),
// completion_rate (20%). Returns up to the top 50 items ordered by score.
func CalculateTrending(db *sql.DB, windowHours int) ([]TrendingItem, error) {
	if db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	cutoff := time.Now().UTC().Add(-time.Duration(windowHours) * time.Hour)

	query := `
		WITH watch_stats AS (
			SELECT
				wp.media_id,
				COUNT(DISTINCT wp.user_id) AS view_count,
				AVG(wp.progress_percent) AS avg_completion
			FROM watch_progress wp
			WHERE wp.updated_at >= $1
			GROUP BY wp.media_id
		),
		rating_stats AS (
			SELECT
				media_id,
				AVG(rating) AS avg_rating
			FROM media_ratings
			WHERE created_at >= $2
			GROUP BY media_id
		),
		scored AS (
			SELECT
				mi.id,
				mi.title,
				mi.type,
				mi.poster_url,
				COALESCE(ws.view_count, 0) AS view_count,
				COALESCE(rs.avg_rating, 0.0) AS avg_rating,
				COALESCE(ws.avg_completion, 0.0) AS completion_rate,
				(
					COALESCE(ws.view_count, 0)::float / GREATEST(
						(SELECT MAX(view_count) FROM (
							SELECT COUNT(DISTINCT user_id) AS view_count
							FROM watch_progress
							WHERE updated_at >= $3
							GROUP BY media_id
						) max_views), 1
					) * $4 +
					COALESCE(rs.avg_rating, 0.0) / 10.0 * $5 +
					COALESCE(ws.avg_completion, 0.0) / 100.0 * $6
				) AS score
			FROM media_items mi
			LEFT JOIN watch_stats ws ON ws.media_id = mi.id
			LEFT JOIN rating_stats rs ON rs.media_id = mi.id
			WHERE mi.status = 'ready'
				AND (ws.view_count IS NOT NULL OR rs.avg_rating IS NOT NULL)
		)
		SELECT id, title, type, poster_url, score, view_count, avg_rating, completion_rate
		FROM scored
		ORDER BY score DESC
		LIMIT 50
	`

	rows, err := db.Query(query, cutoff, cutoff, cutoff,
		weightViewCount, weightAvgRating, weightCompletionRate)
	if err != nil {
		return nil, fmt.Errorf("trending query failed: %w", err)
	}
	defer rows.Close()

	var items []TrendingItem
	rank := 1
	for rows.Next() {
		var item TrendingItem
		var posterURL sql.NullString

		if err := rows.Scan(
			&item.ID,
			&item.Title,
			&item.Type,
			&posterURL,
			&item.Score,
			&item.ViewCount,
			&item.AvgRating,
			&item.CompletionRate,
		); err != nil {
			return nil, fmt.Errorf("scanning trending row: %w", err)
		}

		if posterURL.Valid {
			item.PosterURL = posterURL.String
		}
		item.Rank = rank
		rank++

		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating trending rows: %w", err)
	}

	return items, nil
}
