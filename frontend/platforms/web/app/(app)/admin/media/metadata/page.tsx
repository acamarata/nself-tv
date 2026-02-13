'use client';

import { useState, useCallback } from 'react';
import { Search, Check, Upload as UploadIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { MetadataSearchResult } from '@/types/admin';

const MOCK_SEARCH_RESULTS: MetadataSearchResult[] = [
  {
    providerId: 'tmdb',
    providerName: 'The Movie Database',
    externalId: 'tmdb-12345',
    title: 'The Grand Adventure',
    year: 2024,
    overview:
      'An epic journey through uncharted territories, following a group of explorers as they discover ancient secrets and face impossible odds.',
    posterUrl: null,
    backdropUrl: null,
    genres: ['Adventure', 'Action', 'Drama'],
    contentRating: 'PG-13',
  },
  {
    providerId: 'tmdb',
    providerName: 'The Movie Database',
    externalId: 'tmdb-67890',
    title: 'The Grand Adventure: Extended Cut',
    year: 2024,
    overview:
      'The extended director\'s cut featuring 45 minutes of additional footage and an alternate ending that changes everything.',
    posterUrl: null,
    backdropUrl: null,
    genres: ['Adventure', 'Action'],
    contentRating: 'PG-13',
  },
  {
    providerId: 'tvdb',
    providerName: 'TheTVDB',
    externalId: 'tvdb-11111',
    title: 'Grand Adventures',
    year: 2023,
    overview:
      'A documentary series exploring the most daring expeditions in human history, from polar explorations to deep-sea discoveries.',
    posterUrl: null,
    backdropUrl: null,
    genres: ['Documentary', 'Adventure'],
    contentRating: 'TV-PG',
  },
];

const SUBTITLE_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'it', label: 'Italian' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ar', label: 'Arabic' },
];

export default function MetadataPage() {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MetadataSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [appliedResult, setAppliedResult] = useState<string | null>(null);

  // Manual metadata state
  const [title, setTitle] = useState('');
  const [originalTitle, setOriginalTitle] = useState('');
  const [year, setYear] = useState('');
  const [overview, setOverview] = useState('');
  const [contentRating, setContentRating] = useState('');
  const [genres, setGenres] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Subtitle state
  const [subtitleLanguage, setSubtitleLanguage] = useState('en');
  const [isUploadingSubtitle, setIsUploadingSubtitle] = useState(false);
  const [subtitleSuccess, setSubtitleSuccess] = useState(false);

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setAppliedResult(null);

    // Mock search with delay
    setTimeout(() => {
      setSearchResults(MOCK_SEARCH_RESULTS);
      setIsSearching(false);
    }, 800);
  }, [searchQuery]);

  const handleApplyResult = useCallback((result: MetadataSearchResult) => {
    setTitle(result.title);
    setOriginalTitle(result.title);
    setYear(result.year?.toString() ?? '');
    setOverview(result.overview ?? '');
    setContentRating(result.contentRating ?? '');
    setGenres(result.genres.join(', '));
    setAppliedResult(result.externalId);
  }, []);

  const handleSave = useCallback(() => {
    setIsSaving(true);
    setSaveSuccess(false);

    // Mock save with delay
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 1000);
  }, []);

  const handleSubtitleUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;

      setIsUploadingSubtitle(true);
      setSubtitleSuccess(false);

      // Mock upload with delay
      setTimeout(() => {
        setIsUploadingSubtitle(false);
        setSubtitleSuccess(true);
        setTimeout(() => setSubtitleSuccess(false), 3000);
      }, 1000);

      // Reset input
      e.target.value = '';
    },
    [],
  );

  return (
    <div>
      <h2 className="text-xl font-semibold text-text-primary mb-6">
        Metadata Management
      </h2>

      {/* Search Section */}
      <div className="bg-surface border border-border rounded-xl p-6 mb-6">
        <h3 className="text-lg font-medium text-text-primary mb-3">
          Search External Providers
        </h3>
        <p className="text-sm text-text-secondary mb-4">
          Search TMDb, TheTVDB, and other providers for metadata to apply to
          your media.
        </p>

        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a movie or TV show..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
            />
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={handleSearch}
            isLoading={isSearching}
            disabled={!searchQuery.trim()}
          >
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-3">
            {searchResults.map((result) => (
              <div
                key={result.externalId}
                className={`border rounded-lg p-4 transition-colors ${
                  appliedResult === result.externalId
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-surface-hover'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-text-primary">
                        {result.title}
                      </h4>
                      {result.year && (
                        <span className="text-xs text-text-tertiary">
                          ({result.year})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-tertiary mb-2">
                      {result.providerName} - {result.externalId}
                    </p>
                    {result.overview && (
                      <p className="text-sm text-text-secondary line-clamp-2">
                        {result.overview}
                      </p>
                    )}
                    {result.genres.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {result.genres.map((genre) => (
                          <span
                            key={genre}
                            className="px-2 py-0.5 bg-surface-hover rounded text-xs text-text-secondary"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant={
                      appliedResult === result.externalId
                        ? 'primary'
                        : 'secondary'
                    }
                    size="sm"
                    onClick={() => handleApplyResult(result)}
                  >
                    {appliedResult === result.externalId ? (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Applied
                      </>
                    ) : (
                      'Apply'
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Metadata Edit */}
      <div className="bg-surface border border-border rounded-xl p-6 mb-6">
        <h3 className="text-lg font-medium text-text-primary mb-4">
          Edit Metadata
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Movie or show title"
          />
          <Input
            label="Original Title"
            value={originalTitle}
            onChange={(e) => setOriginalTitle(e.target.value)}
            placeholder="Original language title"
          />
          <Input
            label="Year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="2024"
            type="number"
          />
          <Input
            label="Content Rating"
            value={contentRating}
            onChange={(e) => setContentRating(e.target.value)}
            placeholder="PG-13, R, TV-MA..."
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Overview
          </label>
          <textarea
            value={overview}
            onChange={(e) => setOverview(e.target.value)}
            placeholder="Brief description of the media..."
            rows={4}
            className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none transition-colors"
          />
        </div>

        <div className="mb-6">
          <Input
            label="Genres (comma-separated)"
            value={genres}
            onChange={(e) => setGenres(e.target.value)}
            placeholder="Action, Adventure, Drama"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            isLoading={isSaving}
          >
            Save Metadata
          </Button>
          {saveSuccess && (
            <span className="text-sm text-green-500 flex items-center gap-1">
              <Check className="w-4 h-4" />
              Saved successfully
            </span>
          )}
        </div>
      </div>

      {/* Subtitle Upload */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="text-lg font-medium text-text-primary mb-3">
          Subtitle Upload
        </h3>
        <p className="text-sm text-text-secondary mb-4">
          Upload subtitle files in SRT or VTT format.
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Language
            </label>
            <select
              value={subtitleLanguage}
              onChange={(e) => setSubtitleLanguage(e.target.value)}
              className="px-3 py-3 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {SUBTITLE_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Subtitle File
            </label>
            <input
              type="file"
              accept=".srt,.vtt"
              onChange={handleSubtitleUpload}
              disabled={isUploadingSubtitle}
              className="text-sm text-text-primary file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary-hover file:cursor-pointer file:transition-colors"
            />
          </div>

          {isUploadingSubtitle && (
            <span className="text-sm text-text-secondary flex items-center gap-1">
              <UploadIcon className="w-4 h-4 animate-pulse" />
              Uploading...
            </span>
          )}

          {subtitleSuccess && (
            <span className="text-sm text-green-500 flex items-center gap-1">
              <Check className="w-4 h-4" />
              Subtitle uploaded
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
