package matcher

import (
	"strings"
	"unicode"
)

// MatchCandidate represents a potential metadata match from an external source.
type MatchCandidate struct {
	ID       string  `json:"id"`
	Title    string  `json:"title"`
	Year     int     `json:"year"`
	Type     string  `json:"type"`
	PosterURL string `json:"poster_url,omitempty"`
	Overview string  `json:"overview,omitempty"`
	Score    float64 `json:"score,omitempty"`
}

// DefaultThreshold is the minimum similarity score (0.0-1.0) required for a
// candidate to be considered a match.
const DefaultThreshold = 0.7

// LevenshteinDistance computes the classic Levenshtein edit distance between
// two strings. Both strings are lowercased before comparison.
func LevenshteinDistance(a, b string) int {
	a = strings.ToLower(a)
	b = strings.ToLower(b)

	la := len([]rune(a))
	lb := len([]rune(b))

	if la == 0 {
		return lb
	}
	if lb == 0 {
		return la
	}

	runeA := []rune(a)
	runeB := []rune(b)

	// Create the distance matrix. We only need two rows at a time.
	prev := make([]int, lb+1)
	curr := make([]int, lb+1)

	for j := 0; j <= lb; j++ {
		prev[j] = j
	}

	for i := 1; i <= la; i++ {
		curr[0] = i
		for j := 1; j <= lb; j++ {
			cost := 1
			if runeA[i-1] == runeB[j-1] {
				cost = 0
			}
			curr[j] = min3(
				prev[j]+1,     // deletion
				curr[j-1]+1,   // insertion
				prev[j-1]+cost, // substitution
			)
		}
		prev, curr = curr, prev
	}

	return prev[lb]
}

// LevenshteinSimilarity returns a normalized similarity score between 0.0 and
// 1.0, where 1.0 means the strings are identical.
func LevenshteinSimilarity(a, b string) float64 {
	if a == "" && b == "" {
		return 1.0
	}
	distance := LevenshteinDistance(a, b)
	maxLen := max2(len([]rune(strings.ToLower(a))), len([]rune(strings.ToLower(b))))
	if maxLen == 0 {
		return 1.0
	}
	return 1.0 - float64(distance)/float64(maxLen)
}

// FindBestMatch returns the candidate with the highest combined score that
// meets the threshold, or nil if no candidate qualifies. The scoring considers
// both title similarity and year match.
func FindBestMatch(title string, year int, candidates []MatchCandidate) *MatchCandidate {
	return FindBestMatchWithThreshold(title, year, candidates, DefaultThreshold)
}

// FindBestMatchWithThreshold is like FindBestMatch but accepts a custom threshold.
func FindBestMatchWithThreshold(title string, year int, candidates []MatchCandidate, threshold float64) *MatchCandidate {
	if len(candidates) == 0 {
		return nil
	}

	normalizedTitle := normalizeForMatching(title)

	var bestCandidate *MatchCandidate
	var bestScore float64

	for i := range candidates {
		c := &candidates[i]
		normalizedCandidate := normalizeForMatching(c.Title)

		titleScore := LevenshteinSimilarity(normalizedTitle, normalizedCandidate)

		// Year bonus: exact year match boosts score.
		yearBonus := 0.0
		if year > 0 && c.Year > 0 {
			if year == c.Year {
				yearBonus = 0.1
			} else {
				// Slight penalty for year mismatch when both have years.
				yearDiff := year - c.Year
				if yearDiff < 0 {
					yearDiff = -yearDiff
				}
				if yearDiff <= 1 {
					yearBonus = 0.05
				}
			}
		}

		combinedScore := titleScore + yearBonus
		// Cap at 1.0.
		if combinedScore > 1.0 {
			combinedScore = 1.0
		}

		if combinedScore >= threshold && combinedScore > bestScore {
			bestScore = combinedScore
			c.Score = combinedScore
			bestCandidate = c
		}
	}

	return bestCandidate
}

// normalizeForMatching strips non-alphanumeric characters (except spaces) and
// lowercases the string for more forgiving comparisons.
func normalizeForMatching(s string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(s) {
		if unicode.IsLetter(r) || unicode.IsDigit(r) || r == ' ' {
			b.WriteRune(r)
		}
	}
	// Collapse multiple spaces.
	result := b.String()
	for strings.Contains(result, "  ") {
		result = strings.ReplaceAll(result, "  ", " ")
	}
	return strings.TrimSpace(result)
}

// min3 returns the smallest of three integers.
func min3(a, b, c int) int {
	if a < b {
		if a < c {
			return a
		}
		return c
	}
	if b < c {
		return b
	}
	return c
}

// max2 returns the larger of two integers.
func max2(a, b int) int {
	if a > b {
		return a
	}
	return b
}
