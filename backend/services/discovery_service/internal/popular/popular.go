package popular

import (
	"database/sql"
	"fmt"
)

// PopularItem represents a media item ranked by overall popularity.
type PopularItem struct {
	ID              string  `json:"id"`
	Title           string  `json:"title"`
	Type            string  `json:"type"`
	PosterURL       string  `json:"posterUrl"`
	ViewCount       int     `json:"viewCount"`
	CommunityRating float64 `json:"communityRating"`
	Rank            int     `json:"rank"`
}

// GetPopular returns media items ordered by view_count and community_rating.
// Only items with status 'ready' are included.
func GetPopular(db *sql.DB, limit int) ([]PopularItem, error) {
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
			COALESCE(mi.view_count, 0) AS view_count,
			COALESCE(mi.community_rating, 0.0) AS community_rating
		FROM media_items mi
		WHERE mi.status = 'ready'
		ORDER BY COALESCE(mi.view_count, 0) DESC,
				 COALESCE(mi.community_rating, 0.0) DESC
		LIMIT $1
	`

	rows, err := db.Query(query, limit)
	if err != nil {
		return nil, fmt.Errorf("popular query failed: %w", err)
	}
	defer rows.Close()

	var items []PopularItem
	rank := 1
	for rows.Next() {
		var item PopularItem
		var posterURL sql.NullString

		if err := rows.Scan(
			&item.ID,
			&item.Title,
			&item.Type,
			&posterURL,
			&item.ViewCount,
			&item.CommunityRating,
		); err != nil {
			return nil, fmt.Errorf("scanning popular row: %w", err)
		}

		if posterURL.Valid {
			item.PosterURL = posterURL.String
		}
		item.Rank = rank
		rank++

		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating popular rows: %w", err)
	}

	return items, nil
}
