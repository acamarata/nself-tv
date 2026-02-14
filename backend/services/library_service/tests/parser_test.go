package tests

import (
	"testing"

	"library_service/internal/parser"
)

func TestParseFilename_Movies(t *testing.T) {
	tests := []struct {
		name     string
		filename string
		wantType parser.MediaType
		wantTitle string
		wantYear int
		wantQual string
	}{
		{
			name:      "Movie with parenthesized year",
			filename:  "The Matrix (1999).mkv",
			wantType:  parser.MediaTypeMovie,
			wantTitle: "The Matrix",
			wantYear:  1999,
		},
		{
			name:      "Movie with dots and quality",
			filename:  "The.Matrix.1999.1080p.BluRay.x264.mkv",
			wantType:  parser.MediaTypeMovie,
			wantTitle: "The Matrix",
			wantYear:  1999,
			wantQual:  "1080p",
		},
		{
			name:      "Movie with underscores",
			filename:  "The_Matrix_1999_720p.mp4",
			wantType:  parser.MediaTypeMovie,
			wantTitle: "The Matrix",
			wantYear:  1999,
			wantQual:  "720p",
		},
		{
			name:      "Movie with spaces and 4K",
			filename:  "Inception 2010 2160p WEB-DL.mkv",
			wantType:  parser.MediaTypeMovie,
			wantTitle: "Inception",
			wantYear:  2010,
			wantQual:  "2160p",
		},
		{
			name:      "Movie with complex name",
			filename:  "The.Lord.of.the.Rings.The.Fellowship.of.the.Ring.2001.1080p.BluRay.mkv",
			wantType:  parser.MediaTypeMovie,
			wantTitle: "The Lord of the Rings The Fellowship of the Ring",
			wantYear:  2001,
			wantQual:  "1080p",
		},
		{
			name:      "Movie with parenthesized year and quality",
			filename:  "Blade Runner 2049 (2017) 1080p.mkv",
			wantType:  parser.MediaTypeMovie,
			wantTitle: "Blade Runner 2049",
			wantYear:  2017,
			wantQual:  "1080p",
		},
		{
			name:      "Movie simple format",
			filename:  "Interstellar.2014.mkv",
			wantType:  parser.MediaTypeMovie,
			wantTitle: "Interstellar",
			wantYear:  2014,
		},
		{
			name:      "Movie with codec info",
			filename:  "Dune.2021.2160p.WEB-DL.x265.HEVC.mkv",
			wantType:  parser.MediaTypeMovie,
			wantTitle: "Dune",
			wantYear:  2021,
			wantQual:  "2160p",
		},
		{
			name:      "Movie with 480p quality",
			filename:  "The.Godfather.1972.480p.DVDRip.mkv",
			wantType:  parser.MediaTypeMovie,
			wantTitle: "The Godfather",
			wantYear:  1972,
			wantQual:  "480p",
		},
		{
			name:      "Movie AVI format",
			filename:  "Pulp Fiction (1994).avi",
			wantType:  parser.MediaTypeMovie,
			wantTitle: "Pulp Fiction",
			wantYear:  1994,
		},
		{
			name:      "Movie M4V format",
			filename:  "Fight.Club.1999.m4v",
			wantType:  parser.MediaTypeMovie,
			wantTitle: "Fight Club",
			wantYear:  1999,
		},
		{
			name:      "Movie with AMZN source",
			filename:  "The.Batman.2022.1080p.AMZN.WEBRip.x264.mkv",
			wantType:  parser.MediaTypeMovie,
			wantTitle: "The Batman",
			wantYear:  2022,
			wantQual:  "1080p",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parser.ParseFilename(tt.filename)

			if result.Type != tt.wantType {
				t.Errorf("Type = %q, want %q", result.Type, tt.wantType)
			}
			if result.Title != tt.wantTitle {
				t.Errorf("Title = %q, want %q", result.Title, tt.wantTitle)
			}
			if result.Year != tt.wantYear {
				t.Errorf("Year = %d, want %d", result.Year, tt.wantYear)
			}
			if tt.wantQual != "" && result.Quality != tt.wantQual {
				t.Errorf("Quality = %q, want %q", result.Quality, tt.wantQual)
			}
		})
	}
}

func TestParseFilename_TVShows(t *testing.T) {
	tests := []struct {
		name        string
		filename    string
		wantType    parser.MediaType
		wantTitle   string
		wantSeason  int
		wantEpisode int
		wantQual    string
	}{
		{
			name:        "TV with S01E01 format",
			filename:    "Breaking Bad S01E01.mkv",
			wantType:    parser.MediaTypeTV,
			wantTitle:   "Breaking Bad",
			wantSeason:  1,
			wantEpisode: 1,
		},
		{
			name:        "TV with dots and quality",
			filename:    "Breaking.Bad.S01E01.720p.WEB-DL.mkv",
			wantType:    parser.MediaTypeTV,
			wantTitle:   "Breaking Bad",
			wantSeason:  1,
			wantEpisode: 1,
			wantQual:    "720p",
		},
		{
			name:        "TV with dash separator",
			filename:    "Breaking Bad - S01E01.mkv",
			wantType:    parser.MediaTypeTV,
			wantTitle:   "Breaking Bad",
			wantSeason:  1,
			wantEpisode: 1,
		},
		{
			name:        "TV with lowercase s01e01",
			filename:    "the.office.s02e05.720p.mkv",
			wantType:    parser.MediaTypeTV,
			wantTitle:   "the office",
			wantSeason:  2,
			wantEpisode: 5,
			wantQual:    "720p",
		},
		{
			name:        "TV high season and episode",
			filename:    "Game.of.Thrones.S08E06.1080p.mkv",
			wantType:    parser.MediaTypeTV,
			wantTitle:   "Game of Thrones",
			wantSeason:  8,
			wantEpisode: 6,
			wantQual:    "1080p",
		},
		{
			name:        "TV with 1x01 format",
			filename:    "Seinfeld 3x22.mkv",
			wantType:    parser.MediaTypeTV,
			wantTitle:   "Seinfeld",
			wantSeason:  3,
			wantEpisode: 22,
		},
		{
			name:        "TV with underscores",
			filename:    "The_Mandalorian_S02E08_1080p.mkv",
			wantType:    parser.MediaTypeTV,
			wantTitle:   "The Mandalorian",
			wantSeason:  2,
			wantEpisode: 8,
			wantQual:    "1080p",
		},
		{
			name:        "TV with dots and full metadata",
			filename:    "Stranger.Things.S04E09.2160p.NF.WEB-DL.x265.mkv",
			wantType:    parser.MediaTypeTV,
			wantTitle:   "Stranger Things",
			wantSeason:  4,
			wantEpisode: 9,
			wantQual:    "2160p",
		},
		{
			name:        "TV single digit season",
			filename:    "Friends S1E24.mp4",
			wantType:    parser.MediaTypeTV,
			wantTitle:   "Friends",
			wantSeason:  1,
			wantEpisode: 24,
		},
		{
			name:        "TV with year in name",
			filename:    "House.of.the.Dragon.S01E01.2022.1080p.mkv",
			wantType:    parser.MediaTypeTV,
			wantTitle:   "House of the Dragon",
			wantSeason:  1,
			wantEpisode: 1,
			wantQual:    "1080p",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parser.ParseFilename(tt.filename)

			if result.Type != tt.wantType {
				t.Errorf("Type = %q, want %q", result.Type, tt.wantType)
			}
			if result.Title != tt.wantTitle {
				t.Errorf("Title = %q, want %q", result.Title, tt.wantTitle)
			}
			if result.Season != tt.wantSeason {
				t.Errorf("Season = %d, want %d", result.Season, tt.wantSeason)
			}
			if result.Episode != tt.wantEpisode {
				t.Errorf("Episode = %d, want %d", result.Episode, tt.wantEpisode)
			}
			if tt.wantQual != "" && result.Quality != tt.wantQual {
				t.Errorf("Quality = %q, want %q", result.Quality, tt.wantQual)
			}
		})
	}
}

func TestParseFilename_SourceExtraction(t *testing.T) {
	result := parser.ParseFilename("Movie.2020.1080p.BluRay.x264.mkv")
	if result.Source != "BluRay" {
		t.Errorf("Source = %q, want %q", result.Source, "BluRay")
	}
	if result.Codec != "x264" {
		t.Errorf("Codec = %q, want %q", result.Codec, "x264")
	}
}

func TestParseFilename_NoYear(t *testing.T) {
	result := parser.ParseFilename("Some Random Movie.mkv")
	if result.Year != 0 {
		t.Errorf("Year = %d, want 0 for filename without year", result.Year)
	}
	if result.Title == "" {
		t.Error("Title should not be empty")
	}
}

func TestParseFilename_WebmFormat(t *testing.T) {
	result := parser.ParseFilename("Animation.2023.720p.webm")
	if result.Type != parser.MediaTypeMovie {
		t.Errorf("Type = %q, want %q", result.Type, parser.MediaTypeMovie)
	}
	if result.Year != 2023 {
		t.Errorf("Year = %d, want 2023", result.Year)
	}
}
