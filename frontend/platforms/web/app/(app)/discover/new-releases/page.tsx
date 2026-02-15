'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ContentCard } from '@/components/content/ContentCard';
import { ContentGrid } from '@/components/content/ContentGrid';

interface NewRelease {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  overview: string;
  media_type: 'movie' | 'tv';
  popularity: number;
  in_library: boolean;
}

export default function NewReleasesPage() {
  const [filter, setFilter] = useState<'all' | 'movies' | 'tv'>('all');
  const [sortBy, setSortBy] = useState<'popularity' | 'rating' | 'release_date'>('popularity');

  const { data: releases, isLoading, error } = useQuery({
    queryKey: ['new-releases', filter, sortBy],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/discover/new-releases?filter=${filter}&sort=${sortBy}`
      );
      if (!response.ok) throw new Error('Failed to fetch new releases');
      return response.json() as Promise<NewRelease[]>;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  const handleAddToLibrary = async (releaseId: number, mediaType: 'movie' | 'tv') => {
    try {
      const response = await fetch('/api/v1/acquisition/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdb_id: releaseId,
          media_type: mediaType,
          quality: 'best',
        }),
      });

      if (!response.ok) throw new Error('Failed to add to library');

      // Refresh the list to update in_library status
      queryClient.invalidateQueries({ queryKey: ['new-releases'] });
    } catch (error) {
      console.error('Error adding to library:', error);
      alert('Failed to add to library. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="new-releases-page loading">
        <h1>New Releases</h1>
        <p>Loading recent releases...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="new-releases-page error">
        <h1>New Releases</h1>
        <p>Failed to load new releases. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="new-releases-page">
      <header className="page-header">
        <h1>New Releases</h1>
        <p className="subtitle">
          Discover movies and TV shows released in the last 3 months
        </p>
      </header>

      <div className="filters">
        <div className="filter-group">
          <label>Type:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="filter-select"
          >
            <option value="all">All</option>
            <option value="movies">Movies</option>
            <option value="tv">TV Shows</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="filter-select"
          >
            <option value="popularity">Popularity</option>
            <option value="rating">Rating</option>
            <option value="release_date">Release Date</option>
          </select>
        </div>
      </div>

      {releases && releases.length > 0 ? (
        <ContentGrid>
          {releases.map((release) => (
            <div key={`${release.media_type}-${release.id}`} className="release-card">
              <ContentCard
                title={release.title}
                posterUrl={
                  release.poster_path
                    ? `https://image.tmdb.org/t/p/w500${release.poster_path}`
                    : '/placeholder-poster.png'
                }
                year={new Date(release.release_date).getFullYear()}
                rating={release.vote_average / 2} // Convert 0-10 to 0-5
                mediaType={release.media_type}
                onClick={() => {
                  /* Navigate to detail page */
                }}
              />

              {!release.in_library && (
                <button
                  className="add-to-library-btn"
                  onClick={() => handleAddToLibrary(release.id, release.media_type)}
                  aria-label={`Add ${release.title} to library`}
                >
                  + Add to Library
                </button>
              )}

              {release.in_library && (
                <span className="in-library-badge" aria-label="Already in library">
                  ✓ In Library
                </span>
              )}
            </div>
          ))}
        </ContentGrid>
      ) : (
        <div className="empty-state">
          <p>No new releases found matching your filters.</p>
        </div>
      )}
    </div>
  );
}
