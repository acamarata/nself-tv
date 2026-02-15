'use client';

import { useState } from 'react';
import { useFavorites, useFavoriteGenres } from '@/hooks/useFavorites';
import { useProfiles } from '@/hooks/useProfiles';
import { ContentCard } from '@/components/content/ContentCard';
import { FavoriteButton } from '@/components/content/FavoriteButton';

export default function FavoritesPage() {
  const { data: profiles } = useProfiles();
  const activeProfile = profiles?.find((p) => p.isActive);

  const { data: favorites, isLoading } = useFavorites(activeProfile?.id);
  const { data: topGenres } = useFavoriteGenres(activeProfile?.id, 5);

  const [filterType, setFilterType] = useState<'all' | 'movie' | 'show'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'rating'>('recent');

  // Filter favorites
  const filteredFavorites = favorites?.filter((fav) => {
    if (filterType === 'all') return true;
    return fav.content.mediaType === filterType;
  });

  // Sort favorites
  const sortedFavorites = filteredFavorites?.sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
      case 'title':
        return a.content.title.localeCompare(b.content.title);
      case 'rating':
        return b.content.rating - a.content.rating;
      default:
        return 0;
    }
  });

  return (
    <div className="favorites-page">
      <div className="header">
        <div>
          <h1>❤️ My Favorites</h1>
          <p className="subtitle">
            {favorites?.length || 0} favorite{favorites?.length !== 1 ? 's' : ''}
          </p>
        </div>

        {topGenres && topGenres.length > 0 && (
          <div className="top-genres">
            <span className="label">Top genres:</span>
            {topGenres.map((genre) => (
              <span key={genre.genre} className="genre-tag">
                {genre.genre} ({genre.count})
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="filter-group">
          <label>Type:</label>
          <div className="button-group">
            <button
              onClick={() => setFilterType('all')}
              className={filterType === 'all' ? 'active' : ''}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('movie')}
              className={filterType === 'movie' ? 'active' : ''}
            >
              Movies
            </button>
            <button
              onClick={() => setFilterType('show')}
              className={filterType === 'show' ? 'active' : ''}
            >
              Shows
            </button>
          </div>
        </div>

        <div className="filter-group">
          <label>Sort by:</label>
          <div className="button-group">
            <button
              onClick={() => setSortBy('recent')}
              className={sortBy === 'recent' ? 'active' : ''}
            >
              Recently Added
            </button>
            <button
              onClick={() => setSortBy('title')}
              className={sortBy === 'title' ? 'active' : ''}
            >
              Title
            </button>
            <button
              onClick={() => setSortBy('rating')}
              className={sortBy === 'rating' ? 'active' : ''}
            >
              Rating
            </button>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      {isLoading ? (
        <div className="loading">
          <div className="spinner" />
          <p>Loading favorites...</p>
        </div>
      ) : sortedFavorites && sortedFavorites.length > 0 ? (
        <div className="content-grid">
          {sortedFavorites.map((favorite) => (
            <div key={favorite.id} className="favorite-item">
              <ContentCard
                id={favorite.content.id}
                title={favorite.content.title}
                year={favorite.content.year}
                rating={favorite.content.rating}
                posterUrl={favorite.content.posterUrl}
                mediaType={favorite.content.mediaType}
                overview={favorite.content.overview}
                genres={favorite.content.genres}
              />

              {/* Overlay with favorite button */}
              <div className="overlay">
                <FavoriteButton
                  contentId={favorite.contentId}
                  profileId={activeProfile?.id}
                  variant="button"
                  showLabel
                />
              </div>

              {/* Notes indicator */}
              {favorite.notes && (
                <div className="notes-indicator" title={favorite.notes}>
                  📝
                </div>
              )}

              {/* Watch progress indicator */}
              {favorite.watchProgress !== undefined && favorite.watchProgress > 0 && (
                <div className="progress-indicator">
                  <div
                    className="progress-bar"
                    style={{ width: `${(favorite.watchProgress / 100) * 100}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">💔</div>
          <h2>No favorites yet</h2>
          <p>
            Click the heart icon on any content to add it to your favorites
          </p>
        </div>
      )}

      <style jsx>{`
        .favorites-page {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        h1 {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }

        .subtitle {
          color: #888;
          font-size: 1rem;
        }

        .top-genres {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .top-genres .label {
          color: #888;
          font-size: 0.9rem;
        }

        .genre-tag {
          background: rgba(255, 255, 255, 0.1);
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.85rem;
          color: #fff;
        }

        .filters {
          display: flex;
          gap: 2rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .filter-group label {
          color: #888;
          font-size: 0.9rem;
        }

        .button-group {
          display: flex;
          gap: 0.5rem;
        }

        .button-group button {
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: #fff;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .button-group button:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .button-group button.active {
          background: #4a9eff;
          border-color: #4a9eff;
        }

        .loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 1rem;
          gap: 1rem;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(255, 255, 255, 0.1);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .content-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1.5rem;
        }

        .favorite-item {
          position: relative;
        }

        .overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s;
          border-radius: 8px;
        }

        .favorite-item:hover .overlay {
          opacity: 1;
        }

        .notes-indicator {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          background: rgba(0, 0, 0, 0.8);
          padding: 0.5rem;
          border-radius: 50%;
          font-size: 1.2rem;
          cursor: help;
        }

        .progress-indicator {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 0 0 8px 8px;
          overflow: hidden;
        }

        .progress-bar {
          height: 100%;
          background: #4a9eff;
          transition: width 0.3s;
        }

        .empty-state {
          text-align: center;
          padding: 4rem 1rem;
        }

        .empty-icon {
          font-size: 5rem;
          margin-bottom: 1rem;
        }

        .empty-state h2 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }

        .empty-state p {
          color: #888;
        }

        @media (max-width: 768px) {
          h1 {
            font-size: 2rem;
          }

          .header {
            flex-direction: column;
          }

          .filters {
            flex-direction: column;
            gap: 1rem;
          }

          .filter-group {
            flex-direction: column;
            align-items: flex-start;
          }

          .content-grid {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          }
        }
      `}</style>
    </div>
  );
}
