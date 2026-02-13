'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Film } from 'lucide-react';
import { useState } from 'react';
import type { MediaItem } from '@/types/content';
import { formatRuntime } from '@/utils/ratings';
import { ContentCard } from './ContentCard';
import { SkeletonCard } from './SkeletonCard';

interface ContentGridProps {
  items: MediaItem[];
  viewMode: 'grid' | 'list';
  isLoading?: boolean;
}

function ListItem({ item }: { item: MediaItem }) {
  const [imgError, setImgError] = useState(false);

  return (
    <Link
      href={`/${item.id}`}
      className="flex gap-4 p-3 rounded-lg hover:bg-surface-hover transition-colors group"
    >
      {/* Poster thumbnail */}
      <div className="relative w-16 h-24 flex-shrink-0 rounded-md overflow-hidden bg-surface">
        {item.posterUrl && !imgError ? (
          <Image
            src={item.posterUrl}
            alt={item.title}
            fill
            className="object-cover"
            sizes="64px"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-hover">
            <Film className="h-6 w-6 text-text-muted" />
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h3 className="text-sm font-medium text-text-primary truncate group-hover:text-primary transition-colors">
          {item.title}
        </h3>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-text-muted">
          {item.year && <span>{item.year}</span>}
          {item.runtime != null && (
            <>
              <span aria-hidden="true">&middot;</span>
              <span>{formatRuntime(item.runtime)}</span>
            </>
          )}
          {item.voteAverage != null && item.voteAverage > 0 && (
            <>
              <span aria-hidden="true">&middot;</span>
              <span>{item.voteAverage.toFixed(1)}</span>
            </>
          )}
        </div>
        {item.genres && item.genres.length > 0 && (
          <p className="text-xs text-text-muted mt-1 truncate">
            {item.genres.join(', ')}
          </p>
        )}
        {item.overview && (
          <p className="text-xs text-text-muted mt-1 line-clamp-2">
            {item.overview}
          </p>
        )}
      </div>
    </Link>
  );
}

function ContentGrid({ items, viewMode, isLoading = false }: ContentGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 px-4 md:px-8">
        {Array.from({ length: 12 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-muted">
        <Film className="h-16 w-16 mb-4" />
        <p className="text-lg">No content found</p>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="flex flex-col gap-1 px-4 md:px-8">
        {items.map((item) => (
          <ListItem key={item.id} item={item} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 px-4 md:px-8">
      {items.map((item) => (
        <ContentCard key={item.id} item={item} showWatchlistButton />
      ))}
    </div>
  );
}

export { ContentGrid };
export type { ContentGridProps };
