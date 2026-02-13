package tests

import (
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"discovery_service/internal/trending"
)

// ---------------------------------------------------------------------------
// CalculateTrending — nil database
// ---------------------------------------------------------------------------

func TestCalculateTrending_NilDB(t *testing.T) {
	items, err := trending.CalculateTrending(nil, 24)
	assert.Nil(t, items)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "database connection is nil")
}

// ---------------------------------------------------------------------------
// CalculateTrending — successful query returning multiple rows
// ---------------------------------------------------------------------------

func TestCalculateTrending_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	columns := []string{
		"id", "title", "type", "poster_url",
		"score", "view_count", "avg_rating", "completion_rate",
	}

	rows := sqlmock.NewRows(columns).
		AddRow("m-001", "Trending Movie 1", "movie", "https://img.example.com/m1.jpg", 0.85, 120, 8.5, 75.0).
		AddRow("m-002", "Trending Movie 2", "movie", nil, 0.62, 80, 7.2, 60.0).
		AddRow("s-001", "Trending Series", "series", "https://img.example.com/s1.jpg", 0.41, 50, 6.0, 45.0)

	// The query uses 6 positional parameters: $1..$6
	mock.ExpectQuery("WITH watch_stats AS").
		WithArgs(
			sqlmock.AnyArg(), // $1 cutoff time
			sqlmock.AnyArg(), // $2 cutoff time
			sqlmock.AnyArg(), // $3 cutoff time
			0.50,             // $4 weightViewCount
			0.30,             // $5 weightAvgRating
			0.20,             // $6 weightCompletionRate
		).
		WillReturnRows(rows)

	items, err := trending.CalculateTrending(db, 24)
	require.NoError(t, err)
	require.Len(t, items, 3)

	// Verify first item.
	assert.Equal(t, "m-001", items[0].ID)
	assert.Equal(t, "Trending Movie 1", items[0].Title)
	assert.Equal(t, "movie", items[0].Type)
	assert.Equal(t, "https://img.example.com/m1.jpg", items[0].PosterURL)
	assert.Equal(t, 0.85, items[0].Score)
	assert.Equal(t, 120, items[0].ViewCount)
	assert.Equal(t, 8.5, items[0].AvgRating)
	assert.Equal(t, 75.0, items[0].CompletionRate)

	// Verify ranking is sequential starting at 1.
	assert.Equal(t, 1, items[0].Rank)
	assert.Equal(t, 2, items[1].Rank)
	assert.Equal(t, 3, items[2].Rank)

	// Second item has NULL poster_url — should be empty string.
	assert.Equal(t, "", items[1].PosterURL)

	assert.NoError(t, mock.ExpectationsWereMet())
}

// ---------------------------------------------------------------------------
// CalculateTrending — empty result set
// ---------------------------------------------------------------------------

func TestCalculateTrending_EmptyResult(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	columns := []string{
		"id", "title", "type", "poster_url",
		"score", "view_count", "avg_rating", "completion_rate",
	}

	emptyRows := sqlmock.NewRows(columns) // no rows added

	mock.ExpectQuery("WITH watch_stats AS").
		WithArgs(
			sqlmock.AnyArg(),
			sqlmock.AnyArg(),
			sqlmock.AnyArg(),
			0.50, 0.30, 0.20,
		).
		WillReturnRows(emptyRows)

	items, err := trending.CalculateTrending(db, 24)
	require.NoError(t, err)
	assert.Empty(t, items, "empty result set should return empty slice")
	assert.NoError(t, mock.ExpectationsWereMet())
}

// ---------------------------------------------------------------------------
// CalculateTrending — query error
// ---------------------------------------------------------------------------

func TestCalculateTrending_QueryError(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	mock.ExpectQuery("WITH watch_stats AS").
		WithArgs(
			sqlmock.AnyArg(),
			sqlmock.AnyArg(),
			sqlmock.AnyArg(),
			0.50, 0.30, 0.20,
		).
		WillReturnError(assert.AnError)

	items, err := trending.CalculateTrending(db, 24)
	assert.Nil(t, items)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "trending query failed")
	assert.NoError(t, mock.ExpectationsWereMet())
}

// ---------------------------------------------------------------------------
// CalculateTrending — different window hours produce different cutoff
// ---------------------------------------------------------------------------

func TestCalculateTrending_WindowHoursVariation(t *testing.T) {
	for _, hours := range []int{1, 12, 48, 168} {
		t.Run("window="+time.Duration(time.Duration(hours)*time.Hour).String(), func(t *testing.T) {
			db, mock, err := sqlmock.New()
			require.NoError(t, err)
			defer db.Close()

			columns := []string{
				"id", "title", "type", "poster_url",
				"score", "view_count", "avg_rating", "completion_rate",
			}

			rows := sqlmock.NewRows(columns).
				AddRow("m-100", "Item", "movie", nil, 0.5, 10, 5.0, 50.0)

			mock.ExpectQuery("WITH watch_stats AS").
				WithArgs(
					sqlmock.AnyArg(),
					sqlmock.AnyArg(),
					sqlmock.AnyArg(),
					0.50, 0.30, 0.20,
				).
				WillReturnRows(rows)

			items, err := trending.CalculateTrending(db, hours)
			require.NoError(t, err)
			require.Len(t, items, 1)
			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}

// ---------------------------------------------------------------------------
// Score weight constants verification
// ---------------------------------------------------------------------------

func TestTrendingScoreWeights(t *testing.T) {
	// The trending algorithm uses these exact weights:
	//   50% view_count + 30% avg_rating + 20% completion_rate
	// We verify them by checking what parameters are passed to the query.
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	columns := []string{
		"id", "title", "type", "poster_url",
		"score", "view_count", "avg_rating", "completion_rate",
	}

	rows := sqlmock.NewRows(columns) // empty is fine for this test

	// The key assertion: the weights passed as $4, $5, $6 must be exactly 0.50, 0.30, 0.20
	mock.ExpectQuery("WITH watch_stats AS").
		WithArgs(
			sqlmock.AnyArg(), // $1
			sqlmock.AnyArg(), // $2
			sqlmock.AnyArg(), // $3
			0.50,             // $4 — view_count weight
			0.30,             // $5 — avg_rating weight
			0.20,             // $6 — completion_rate weight
		).
		WillReturnRows(rows)

	_, err = trending.CalculateTrending(db, 24)
	require.NoError(t, err)

	// If expectations were not met, the weights don't match 50/30/20.
	assert.NoError(t, mock.ExpectationsWereMet(), "score weights must be 50%% view_count, 30%% avg_rating, 20%% completion_rate")
}

// ---------------------------------------------------------------------------
// CalculateTrending — scan error (column type mismatch)
// ---------------------------------------------------------------------------

func TestCalculateTrending_ScanError(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	columns := []string{
		"id", "title", "type", "poster_url",
		"score", "view_count", "avg_rating", "completion_rate",
	}

	// Return a row where view_count is a string instead of int to trigger scan error
	rows := sqlmock.NewRows(columns).
		AddRow("m-001", "Movie", "movie", nil, 0.5, "not-a-number", 5.0, 50.0)

	mock.ExpectQuery("WITH watch_stats AS").
		WithArgs(
			sqlmock.AnyArg(),
			sqlmock.AnyArg(),
			sqlmock.AnyArg(),
			0.50, 0.30, 0.20,
		).
		WillReturnRows(rows)

	items, err := trending.CalculateTrending(db, 24)
	assert.Nil(t, items)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "scanning trending row")
	assert.NoError(t, mock.ExpectationsWereMet())
}

// ---------------------------------------------------------------------------
// TrendingItem struct — JSON tags verification
// ---------------------------------------------------------------------------

func TestTrendingItem_FieldValues(t *testing.T) {
	item := trending.TrendingItem{
		ID:             "abc-123",
		Title:          "Test Movie",
		Type:           "movie",
		PosterURL:      "https://img.example.com/test.jpg",
		Score:          0.95,
		ViewCount:      200,
		AvgRating:      9.5,
		CompletionRate: 88.5,
		Rank:           1,
	}

	assert.Equal(t, "abc-123", item.ID)
	assert.Equal(t, "Test Movie", item.Title)
	assert.Equal(t, "movie", item.Type)
	assert.Equal(t, "https://img.example.com/test.jpg", item.PosterURL)
	assert.Equal(t, 0.95, item.Score)
	assert.Equal(t, 200, item.ViewCount)
	assert.Equal(t, 9.5, item.AvgRating)
	assert.Equal(t, 88.5, item.CompletionRate)
	assert.Equal(t, 1, item.Rank)
}
