import type { MediaType, MediaItem } from './content';

export type SortField = 'title' | 'year' | 'rating' | 'added' | 'popularity';
export type SortDirection = 'asc' | 'desc';
export type ViewMode = 'grid' | 'list';

export interface SortOption {
  field: SortField;
  direction: SortDirection;
  label: string;
}

export interface CatalogFilters {
  type?: MediaType;
  genres?: string[];
  year?: number;
  yearFrom?: number;
  yearTo?: number;
  minRating?: number;
  contentRating?: string;
}

export interface CatalogState {
  items: MediaItem[];
  totalCount: number;
  filters: CatalogFilters;
  sort: SortOption;
  viewMode: ViewMode;
  page: number;
  pageSize: number;
  isLoading: boolean;
  hasMore: boolean;
}

export interface SearchResult {
  items: MediaItem[];
  totalCount: number;
  query: string;
  activeType?: MediaType;
  typeCounts: Record<MediaType, number>;
}

export const SORT_OPTIONS: SortOption[] = [
  { field: 'title', direction: 'asc', label: 'Title A-Z' },
  { field: 'title', direction: 'desc', label: 'Title Z-A' },
  { field: 'year', direction: 'desc', label: 'Newest First' },
  { field: 'year', direction: 'asc', label: 'Oldest First' },
  { field: 'rating', direction: 'desc', label: 'Highest Rated' },
  { field: 'added', direction: 'desc', label: 'Recently Added' },
  { field: 'popularity', direction: 'desc', label: 'Most Popular' },
];

export const GENRES = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary',
  'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery',
  'Romance', 'Science Fiction', 'Thriller', 'War', 'Western',
] as const;
