package tests

import (
	"testing"

	"library_service/internal/matcher"
)

func TestLevenshteinDistance_Identical(t *testing.T) {
	dist := matcher.LevenshteinDistance("kitten", "kitten")
	if dist != 0 {
		t.Errorf("Distance between identical strings = %d, want 0", dist)
	}
}

func TestLevenshteinDistance_Empty(t *testing.T) {
	dist := matcher.LevenshteinDistance("", "hello")
	if dist != 5 {
		t.Errorf("Distance('', 'hello') = %d, want 5", dist)
	}

	dist = matcher.LevenshteinDistance("hello", "")
	if dist != 5 {
		t.Errorf("Distance('hello', '') = %d, want 5", dist)
	}
}

func TestLevenshteinDistance_BothEmpty(t *testing.T) {
	dist := matcher.LevenshteinDistance("", "")
	if dist != 0 {
		t.Errorf("Distance('', '') = %d, want 0", dist)
	}
}

func TestLevenshteinDistance_KnownValues(t *testing.T) {
	tests := []struct {
		a, b string
		want int
	}{
		{"kitten", "sitting", 3},
		{"saturday", "sunday", 3},
		{"abc", "def", 3},
		{"abc", "abc", 0},
		{"abc", "abcd", 1},
		{"a", "b", 1},
	}

	for _, tt := range tests {
		t.Run(tt.a+"_"+tt.b, func(t *testing.T) {
			dist := matcher.LevenshteinDistance(tt.a, tt.b)
			if dist != tt.want {
				t.Errorf("Distance(%q, %q) = %d, want %d", tt.a, tt.b, dist, tt.want)
			}
		})
	}
}

func TestLevenshteinDistance_CaseInsensitive(t *testing.T) {
	dist := matcher.LevenshteinDistance("Hello", "hello")
	if dist != 0 {
		t.Errorf("Distance should be case-insensitive, got %d, want 0", dist)
	}
}

func TestLevenshteinSimilarity_Identical(t *testing.T) {
	sim := matcher.LevenshteinSimilarity("The Matrix", "The Matrix")
	if sim != 1.0 {
		t.Errorf("Similarity of identical strings = %f, want 1.0", sim)
	}
}

func TestLevenshteinSimilarity_CompletelyDifferent(t *testing.T) {
	sim := matcher.LevenshteinSimilarity("abc", "xyz")
	if sim != 0.0 {
		t.Errorf("Similarity of completely different strings = %f, want 0.0", sim)
	}
}

func TestLevenshteinSimilarity_BothEmpty(t *testing.T) {
	sim := matcher.LevenshteinSimilarity("", "")
	if sim != 1.0 {
		t.Errorf("Similarity of two empty strings = %f, want 1.0", sim)
	}
}

func TestLevenshteinSimilarity_PartialMatch(t *testing.T) {
	sim := matcher.LevenshteinSimilarity("The Matrix", "The Matrixx")
	if sim < 0.8 || sim > 1.0 {
		t.Errorf("Similarity('The Matrix', 'The Matrixx') = %f, expected > 0.8", sim)
	}
}

func TestFindBestMatch_ExactMatch(t *testing.T) {
	candidates := []matcher.MatchCandidate{
		{ID: "1", Title: "The Matrix", Year: 1999, Type: "movie"},
		{ID: "2", Title: "The Matrix Reloaded", Year: 2003, Type: "movie"},
		{ID: "3", Title: "The Matrix Revolutions", Year: 2003, Type: "movie"},
	}

	result := matcher.FindBestMatch("The Matrix", 1999, candidates)
	if result == nil {
		t.Fatal("Expected a match, got nil")
	}
	if result.ID != "1" {
		t.Errorf("Best match ID = %q, want %q", result.ID, "1")
	}
	if result.Score < 0.9 {
		t.Errorf("Score = %f, expected >= 0.9 for exact match", result.Score)
	}
}

func TestFindBestMatch_FuzzyMatch(t *testing.T) {
	candidates := []matcher.MatchCandidate{
		{ID: "1", Title: "Inception", Year: 2010, Type: "movie"},
		{ID: "2", Title: "Interstellar", Year: 2014, Type: "movie"},
	}

	result := matcher.FindBestMatch("Inceptio", 2010, candidates)
	if result == nil {
		t.Fatal("Expected a fuzzy match, got nil")
	}
	if result.ID != "1" {
		t.Errorf("Best match ID = %q, want %q", result.ID, "1")
	}
}

func TestFindBestMatch_NoMatchBelowThreshold(t *testing.T) {
	candidates := []matcher.MatchCandidate{
		{ID: "1", Title: "Completely Different Movie", Year: 2020, Type: "movie"},
	}

	result := matcher.FindBestMatch("The Matrix", 1999, candidates)
	if result != nil {
		t.Errorf("Expected no match below threshold, got ID=%q with score %f", result.ID, result.Score)
	}
}

func TestFindBestMatch_EmptyCandidates(t *testing.T) {
	result := matcher.FindBestMatch("The Matrix", 1999, []matcher.MatchCandidate{})
	if result != nil {
		t.Error("Expected nil for empty candidates")
	}
}

func TestFindBestMatch_YearBoost(t *testing.T) {
	candidates := []matcher.MatchCandidate{
		{ID: "1", Title: "The Batman", Year: 2022, Type: "movie"},
		{ID: "2", Title: "The Batman", Year: 1989, Type: "movie"},
	}

	result := matcher.FindBestMatch("The Batman", 2022, candidates)
	if result == nil {
		t.Fatal("Expected a match, got nil")
	}
	if result.ID != "1" {
		t.Errorf("Expected ID=1 (2022 version) due to year boost, got ID=%q", result.ID)
	}
}

func TestFindBestMatch_CaseInsensitive(t *testing.T) {
	candidates := []matcher.MatchCandidate{
		{ID: "1", Title: "the matrix", Year: 1999, Type: "movie"},
	}

	result := matcher.FindBestMatch("THE MATRIX", 1999, candidates)
	if result == nil {
		t.Fatal("Expected a case-insensitive match, got nil")
	}
	if result.ID != "1" {
		t.Errorf("Best match ID = %q, want %q", result.ID, "1")
	}
}

func TestFindBestMatchWithThreshold(t *testing.T) {
	candidates := []matcher.MatchCandidate{
		{ID: "1", Title: "The Matriculation", Year: 1999, Type: "movie"},
	}

	// With very high threshold, should not match because
	// "the matrix" vs "the matriculation" similarity is well below 0.95.
	result := matcher.FindBestMatchWithThreshold("The Matrix", 1999, candidates, 0.95)
	if result != nil {
		t.Errorf("Expected no match with 0.95 threshold, got ID=%q score=%f", result.ID, result.Score)
	}

	// With lower threshold, should match.
	result = matcher.FindBestMatchWithThreshold("The Matrix", 1999, candidates, 0.5)
	if result == nil {
		t.Fatal("Expected a match with 0.5 threshold, got nil")
	}
}
