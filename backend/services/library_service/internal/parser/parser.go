package parser

import (
	"regexp"
	"strconv"
	"strings"
)

// MediaType identifies whether parsed media is a movie or TV show.
type MediaType string

const (
	MediaTypeMovie   MediaType = "movie"
	MediaTypeTV      MediaType = "tv"
	MediaTypeUnknown MediaType = "unknown"
)

// ParsedMedia holds the structured data extracted from a media filename.
type ParsedMedia struct {
	Title   string    `json:"title"`
	Year    int       `json:"year,omitempty"`
	Season  int       `json:"season,omitempty"`
	Episode int       `json:"episode,omitempty"`
	Quality string    `json:"quality,omitempty"`
	Source  string    `json:"source,omitempty"`
	Codec   string    `json:"codec,omitempty"`
	Type    MediaType `json:"type"`
}

// Regex patterns compiled once at package init.
var (
	// TV patterns: S01E01, s01e01, S1E1, etc.
	tvPatternSE = regexp.MustCompile(`(?i)[.\s_-]*[Ss](\d{1,2})[.\s_-]*[Ee](\d{1,2})`)

	// TV alternate: 1x01, 01x01
	tvPatternX = regexp.MustCompile(`(?i)[.\s_-]*(\d{1,2})[xX](\d{2})`)

	// Parenthesized year pattern: (1999) -- highest priority for year extraction.
	parenYearPattern = regexp.MustCompile(`\((\d{4})\)`)

	// Non-parenthesized year pattern: .1999. or _1999_ or space-delimited.
	bareYearPattern = regexp.MustCompile(`(?:^|[\s._-])(\d{4})(?:[\s._)-]|$)`)

	// Quality patterns
	qualityPattern = regexp.MustCompile(`(?i)(2160p|1080p|720p|480p|360p|4[Kk]|UHD)`)

	// Source patterns
	sourcePattern = regexp.MustCompile(`(?i)(BluRay|Blu-Ray|BDRip|BRRip|WEB-DL|WEBRip|WEBDL|WEB|HDRip|HDTV|DVDRip|DVDScr|DVDR|CAM|TS|TC|HDCAM|AMZN|NF|DSNP|HMAX|ATVP)`)

	// Codec patterns
	codecPattern = regexp.MustCompile(`(?i)(x264|x265|h\.?264|h\.?265|HEVC|AVC|XviD|DivX|VP9|AV1|AAC|DTS|DD5\.?1|FLAC|Atmos|TrueHD)`)

	// Separators to clean up in title extraction
	separatorPattern = regexp.MustCompile(`[._]`)

	// Multi-space collapse
	multiSpace = regexp.MustCompile(`\s{2,}`)
)

// ParseFilename extracts structured metadata from a media filename.
// It handles common naming conventions for both movies and TV shows.
func ParseFilename(filename string) *ParsedMedia {
	parsed := &ParsedMedia{
		Type: MediaTypeUnknown,
	}

	// Remove file extension.
	name := removeExtension(filename)

	// Check for TV show pattern first (S01E01 or 1x01).
	if loc := tvPatternSE.FindStringSubmatchIndex(name); loc != nil {
		parsed.Type = MediaTypeTV
		parsed.Season, _ = strconv.Atoi(name[loc[2]:loc[3]])
		parsed.Episode, _ = strconv.Atoi(name[loc[4]:loc[5]])
		// Title is everything before the season/episode marker.
		parsed.Title = cleanTitle(name[:loc[0]])
	} else if loc := tvPatternX.FindStringSubmatchIndex(name); loc != nil {
		parsed.Type = MediaTypeTV
		parsed.Season, _ = strconv.Atoi(name[loc[2]:loc[3]])
		parsed.Episode, _ = strconv.Atoi(name[loc[4]:loc[5]])
		parsed.Title = cleanTitle(name[:loc[0]])
	} else {
		parsed.Type = MediaTypeMovie
	}

	// Extract year.
	parsed.Year = extractYear(name)

	// If this is a movie, extract the title (everything before the year or quality tag).
	if parsed.Type == MediaTypeMovie {
		parsed.Title = extractMovieTitle(name, parsed.Year)
	}

	// Extract quality.
	if match := qualityPattern.FindString(name); match != "" {
		parsed.Quality = strings.ToLower(match)
		// Normalize 4k/uhd
		if parsed.Quality == "4k" || parsed.Quality == "uhd" {
			parsed.Quality = "2160p"
		}
	}

	// Extract source.
	if match := sourcePattern.FindString(name); match != "" {
		parsed.Source = match
	}

	// Extract codec.
	if match := codecPattern.FindString(name); match != "" {
		parsed.Codec = match
	}

	// Final cleanup: ensure title is not empty.
	if parsed.Title == "" {
		parsed.Title = cleanTitle(name)
	}

	return parsed
}

// removeExtension strips the file extension from a filename.
func removeExtension(filename string) string {
	extensions := []string{".mp4", ".mkv", ".avi", ".mov", ".m4v", ".webm", ".ts", ".flv", ".srt", ".sub", ".idx"}
	lower := strings.ToLower(filename)
	for _, ext := range extensions {
		if strings.HasSuffix(lower, ext) {
			return filename[:len(filename)-len(ext)]
		}
	}
	return filename
}

// cleanTitle normalizes a raw title string: replaces separators with spaces,
// strips parentheses, collapses whitespace, and trims.
func cleanTitle(raw string) string {
	// Replace dots, underscores with spaces.
	title := separatorPattern.ReplaceAllString(raw, " ")
	// Remove parentheses.
	title = strings.ReplaceAll(title, "(", "")
	title = strings.ReplaceAll(title, ")", "")
	// Remove leading/trailing hyphens and dashes with surrounding spaces.
	title = strings.TrimRight(title, " -")
	title = strings.TrimLeft(title, " -")
	// Collapse multiple spaces.
	title = multiSpace.ReplaceAllString(title, " ")
	return strings.TrimSpace(title)
}

// extractYear finds the most appropriate 4-digit year (1900-2099) in the name.
// Parenthesized years like (2017) take priority over bare years like .2049.
func extractYear(name string) int {
	// First, try parenthesized years -- these are the most explicit form.
	if matches := parenYearPattern.FindAllStringSubmatch(name, -1); len(matches) > 0 {
		// Use the last parenthesized year found (e.g., "Blade Runner 2049 (2017)").
		for i := len(matches) - 1; i >= 0; i-- {
			year, err := strconv.Atoi(matches[i][1])
			if err == nil && year >= 1900 && year <= 2099 {
				return year
			}
		}
	}

	// Fall back to bare year patterns.
	if matches := bareYearPattern.FindAllStringSubmatch(name, -1); len(matches) > 0 {
		// For bare years, use the first one found (typically right after the title).
		for _, match := range matches {
			year, err := strconv.Atoi(match[1])
			if err == nil && year >= 1900 && year <= 2099 {
				return year
			}
		}
	}

	return 0
}

// extractMovieTitle gets the movie title from the filename.
// For movies, the title is everything before the year or first quality/source/codec tag.
func extractMovieTitle(name string, year int) string {
	if year > 0 {
		yearStr := strconv.Itoa(year)

		// First, check for parenthesized year and cut before the opening paren.
		parenForm := "(" + yearStr + ")"
		if idx := strings.Index(name, parenForm); idx > 0 {
			return cleanTitle(name[:idx])
		}

		// Otherwise, cut before the bare year string.
		idx := strings.Index(name, yearStr)
		if idx > 0 {
			return cleanTitle(name[:idx])
		}
	}

	// No year found; try to find the first quality/source/codec marker and use everything before it.
	markers := []*regexp.Regexp{qualityPattern, sourcePattern, codecPattern}
	earliest := len(name)
	for _, m := range markers {
		if loc := m.FindStringIndex(name); loc != nil && loc[0] < earliest {
			earliest = loc[0]
		}
	}
	if earliest < len(name) {
		return cleanTitle(name[:earliest])
	}

	return cleanTitle(name)
}
