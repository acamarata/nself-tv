'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Pencil,
  RefreshCw,
  Trash2,
  X,
  Film,
  Tv,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { LibraryFilter } from '@/types/admin';
import type { MediaType } from '@/types/content';

interface MockMediaItem {
  id: string;
  title: string;
  year: number;
  type: MediaType;
  genres: string[];
  quality: string;
  posterUrl: string | null;
  addedAt: string;
}

const MOCK_GENRES = [
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Horror',
  'Sci-Fi',
  'Thriller',
];

const SORT_OPTIONS = [
  { value: 'title-asc', label: 'Title A-Z' },
  { value: 'title-desc', label: 'Title Z-A' },
  { value: 'year-desc', label: 'Year Newest' },
  { value: 'year-asc', label: 'Year Oldest' },
  { value: 'added-desc', label: 'Recently Added' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'movie', label: 'Movies' },
  { value: 'tv_show', label: 'TV Shows' },
  { value: 'episode', label: 'Episodes' },
];

const MOCK_ITEMS: MockMediaItem[] = [
  { id: '1', title: 'The Grand Adventure', year: 2024, type: 'movie', genres: ['Action', 'Adventure'], quality: '4K', posterUrl: null, addedAt: '2024-12-01' },
  { id: '2', title: 'Night Watch', year: 2023, type: 'movie', genres: ['Thriller', 'Crime'], quality: '1080p', posterUrl: null, addedAt: '2024-11-15' },
  { id: '3', title: 'Cosmic Horizons', year: 2024, type: 'tv_show', genres: ['Sci-Fi', 'Drama'], quality: '4K', posterUrl: null, addedAt: '2024-12-10' },
  { id: '4', title: 'The Comedy Hour', year: 2022, type: 'tv_show', genres: ['Comedy'], quality: '1080p', posterUrl: null, addedAt: '2024-10-20' },
  { id: '5', title: 'Ocean Deep', year: 2024, type: 'movie', genres: ['Documentary', 'Adventure'], quality: '4K', posterUrl: null, addedAt: '2024-12-05' },
  { id: '6', title: 'Shadows of Tomorrow', year: 2023, type: 'movie', genres: ['Sci-Fi', 'Thriller'], quality: '1080p', posterUrl: null, addedAt: '2024-11-01' },
  { id: '7', title: 'Laugh Track', year: 2024, type: 'tv_show', genres: ['Comedy', 'Drama'], quality: '720p', posterUrl: null, addedAt: '2024-12-12' },
  { id: '8', title: 'The Last Stand', year: 2023, type: 'movie', genres: ['Action', 'Drama'], quality: '1080p', posterUrl: null, addedAt: '2024-09-15' },
  { id: '9', title: 'Wild Planet', year: 2024, type: 'movie', genres: ['Documentary'], quality: '4K', posterUrl: null, addedAt: '2024-12-08' },
  { id: '10', title: 'City Lights', year: 2022, type: 'movie', genres: ['Drama', 'Crime'], quality: '1080p', posterUrl: null, addedAt: '2024-08-20' },
  { id: '11', title: 'Animated Dreams', year: 2024, type: 'movie', genres: ['Animation', 'Adventure'], quality: '4K', posterUrl: null, addedAt: '2024-12-15' },
  { id: '12', title: 'Haunted Nights', year: 2023, type: 'movie', genres: ['Horror', 'Thriller'], quality: '1080p', posterUrl: null, addedAt: '2024-10-31' },
];

function typeBadgeColor(type: MediaType): string {
  switch (type) {
    case 'movie':
      return 'bg-blue-500/20 text-blue-400';
    case 'tv_show':
      return 'bg-purple-500/20 text-purple-400';
    case 'episode':
      return 'bg-green-500/20 text-green-400';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
}

function typeLabel(type: MediaType): string {
  switch (type) {
    case 'movie':
      return 'Movie';
    case 'tv_show':
      return 'TV Show';
    case 'episode':
      return 'Episode';
    default:
      return type;
  }
}

function qualityBadgeColor(quality: string): string {
  switch (quality) {
    case '4K':
      return 'bg-yellow-500/20 text-yellow-400';
    case '1080p':
      return 'bg-green-500/20 text-green-400';
    case '720p':
      return 'bg-orange-500/20 text-orange-400';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
}

export default function LibraryPage() {
  const [filters, setFilters] = useState<LibraryFilter>({
    type: '',
    genre: '',
    sort: 'added-desc',
    search: '',
  });
  const [deleteTarget, setDeleteTarget] = useState<MockMediaItem | null>(null);
  const [items, setItems] = useState<MockMediaItem[]>(MOCK_ITEMS);

  const filteredItems = useMemo(() => {
    let result = [...items];

    // Type filter
    if (filters.type) {
      result = result.filter((item) => item.type === filters.type);
    }

    // Genre filter
    if (filters.genre) {
      result = result.filter((item) => item.genres.includes(filters.genre!));
    }

    // Search filter
    if (filters.search) {
      const query = filters.search.toLowerCase();
      result = result.filter((item) =>
        item.title.toLowerCase().includes(query),
      );
    }

    // Sort
    switch (filters.sort) {
      case 'title-asc':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'title-desc':
        result.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case 'year-desc':
        result.sort((a, b) => b.year - a.year);
        break;
      case 'year-asc':
        result.sort((a, b) => a.year - b.year);
        break;
      case 'added-desc':
        result.sort(
          (a, b) =>
            new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime(),
        );
        break;
    }

    return result;
  }, [items, filters]);

  const handleDelete = useCallback((item: MockMediaItem) => {
    setDeleteTarget(item);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    setItems((prev) => prev.filter((item) => item.id !== deleteTarget.id));
    setDeleteTarget(null);
  }, [deleteTarget]);

  const cancelDelete = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold text-text-primary mb-6">
        Library Management
      </h2>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-end gap-3 mb-6">
        {/* Type Filter */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Type
          </label>
          <select
            value={filters.type ?? ''}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Genre Filter */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Genre
          </label>
          <select
            value={filters.genre ?? ''}
            onChange={(e) => setFilters({ ...filters, genre: e.target.value })}
            className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Genres</option>
            {MOCK_GENRES.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Sort
          </label>
          <select
            value={filters.sort ?? 'added-desc'}
            onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
            className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input
              type="text"
              value={filters.search ?? ''}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
              placeholder="Search by title..."
              className="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Results Count */}
      <p className="text-sm text-text-tertiary mb-4">
        {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
      </p>

      {/* Media Grid */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-surface border border-border rounded-xl overflow-hidden group"
            >
              {/* Poster Placeholder */}
              <div className="aspect-[2/3] bg-surface-hover flex items-center justify-center relative">
                {item.type === 'tv_show' ? (
                  <Tv className="w-10 h-10 text-text-tertiary" />
                ) : (
                  <Film className="w-10 h-10 text-text-tertiary" />
                )}

                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${typeBadgeColor(item.type)}`}
                  >
                    {typeLabel(item.type)}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${qualityBadgeColor(item.quality)}`}
                  >
                    {item.quality}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <h4 className="text-sm font-medium text-text-primary truncate">
                  {item.title}
                </h4>
                <p className="text-xs text-text-tertiary">{item.year}</p>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 mt-2">
                  <Link href="/admin/media/metadata">
                    <button
                      type="button"
                      className="p-1.5 rounded-lg text-text-tertiary hover:text-primary hover:bg-primary/10 transition-colors"
                      aria-label={`Edit ${item.title}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </Link>
                  <button
                    type="button"
                    className="p-1.5 rounded-lg text-text-tertiary hover:text-primary hover:bg-primary/10 transition-colors"
                    aria-label={`Re-scan ${item.title}`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    className="p-1.5 rounded-lg text-text-tertiary hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    aria-label={`Delete ${item.title}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20">
          <Film className="w-16 h-16 text-text-tertiary mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            No media found
          </h3>
          <p className="text-text-secondary text-sm">
            Try adjusting your filters or upload new media.
          </p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary">
                Delete Media
              </h3>
            </div>

            <p className="text-sm text-text-secondary mb-2">
              Are you sure you want to delete this media item?
            </p>
            <p className="text-sm font-medium text-text-primary mb-6">
              &ldquo;{deleteTarget.title}&rdquo;
            </p>

            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="secondary" onClick={cancelDelete}>
                Cancel
              </Button>
              <Button type="button" variant="danger" onClick={confirmDelete}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
