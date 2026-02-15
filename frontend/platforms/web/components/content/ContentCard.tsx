'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Play, Film, Bookmark, BookmarkCheck } from 'lucide-react';
import { useState } from 'react';
import type { MediaItem } from '@/types/content';

interface ContentCardProps {
  item: MediaItem;
  progress?: number;
  showWatchlistButton?: boolean;
}

function ContentCard({
  item,
  progress,
  showWatchlistButton = false,
}: ContentCardProps) {
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleWatchlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsInWatchlist((prev) => !prev);
  };

  return (
    <Link href={`/${item.id}`} className="group block flex-shrink-0">
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-surface">
        {item.posterUrl && !imgError ? (
          <Image
            src={item.posterUrl}
            alt={item.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-hover">
            <Film className="h-12 w-12 text-text-muted" />
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
              <Play className="h-8 w-8 text-white fill-white" />
            </div>
          </div>
        </div>

        {/* Watchlist button */}
        {showWatchlistButton && (
          <button
            onClick={handleWatchlistToggle}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-black/80"
            aria-label={
              isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'
            }
          >
            {isInWatchlist ? (
              <BookmarkCheck className="h-4 w-4" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </button>
        )}

        {/* Rating badge */}
        {item.communityRating != null && item.communityRating > 0 && (
          <div className="absolute top-2 left-2 bg-black/70 text-white text-xs font-semibold px-1.5 py-0.5 rounded">
            {item.communityRating.toFixed(1)}
          </div>
        )}

        {/* Progress bar */}
        {progress != null && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        )}
      </div>

      <div className="mt-2 space-y-0.5">
        <h3 className="text-sm font-medium text-text-primary truncate group-hover:text-primary transition-colors">
          {item.title}
        </h3>
        {item.year && (
          <p className="text-xs text-text-muted">{item.year}</p>
        )}
      </div>
    </Link>
  );
}

export { ContentCard };
export type { ContentCardProps };
