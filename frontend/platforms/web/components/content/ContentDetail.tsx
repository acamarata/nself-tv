'use client';

import Image from 'next/image';
import { Play, Bookmark, Film, User } from 'lucide-react';
import { useState } from 'react';
import type { MediaItem, CastMember } from '@/types/content';
import { formatRuntime } from '@/utils/ratings';
import { Button } from '@/components/ui/Button';

interface ContentDetailProps {
  item: MediaItem;
  cast?: CastMember[];
}

function ContentDetail({ item, cast }: ContentDetailProps) {
  const [backdropError, setBackdropError] = useState(false);
  const [posterError, setPosterError] = useState(false);

  return (
    <div className="relative">
      {/* Hero backdrop */}
      <div className="relative h-[50vh] md:h-[60vh] w-full">
        {item.backdropUrl && !backdropError ? (
          <Image
            src={item.backdropUrl}
            alt=""
            fill
            className="object-cover"
            priority
            sizes="100vw"
            onError={() => setBackdropError(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-surface" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />
      </div>

      {/* Content overlay */}
      <div className="relative -mt-48 md:-mt-64 px-4 md:px-8 pb-8 z-10">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 max-w-7xl mx-auto">
          {/* Poster */}
          <div className="relative w-48 md:w-64 aspect-[2/3] flex-shrink-0 rounded-lg overflow-hidden shadow-2xl self-center md:self-start">
            {item.posterUrl && !posterError ? (
              <Image
                src={item.posterUrl}
                alt={item.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 192px, 256px"
                priority
                onError={() => setPosterError(true)}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-surface-hover">
                <Film className="h-16 w-16 text-text-muted" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-4xl font-bold text-text-primary">
              {item.title}
            </h1>

            {item.originalTitle && item.originalTitle !== item.title && (
              <p className="text-lg text-text-muted mt-1 italic">
                {item.originalTitle}
              </p>
            )}

            {/* Metadata row */}
            <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-text-secondary">
              {item.year && <span>{item.year}</span>}
              {item.contentRating && (
                <span className="border border-border px-1.5 py-0.5 rounded text-xs font-medium">
                  {item.contentRating}
                </span>
              )}
              {item.runtime != null && (
                <span>{formatRuntime(item.runtime)}</span>
              )}
              {item.voteAverage != null && item.voteAverage > 0 && (
                <span className="flex items-center gap-1">
                  <span className="text-yellow-500">&#9733;</span>
                  <span>
                    {item.voteAverage.toFixed(1)}
                    {item.voteCount != null && (
                      <span className="text-text-muted">
                        {' '}
                        ({item.voteCount.toLocaleString()})
                      </span>
                    )}
                  </span>
                </span>
              )}
              {item.status && (
                <span className="capitalize">{item.status}</span>
              )}
            </div>

            {/* Genres */}
            {item.genres && item.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {item.genres.map((genre) => (
                  <span
                    key={genre}
                    className="bg-surface text-text-secondary text-xs px-2.5 py-1 rounded-full border border-border"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 mt-6">
              <Button size="lg">
                <Play className="h-5 w-5 mr-2 fill-current" />
                Play
              </Button>
              <Button variant="secondary" size="lg">
                <Bookmark className="h-5 w-5 mr-2" />
                Watchlist
              </Button>
            </div>

            {/* Overview */}
            {item.overview && (
              <div className="mt-6">
                <h2 className="text-lg font-semibold text-text-primary mb-2">
                  Overview
                </h2>
                <p className="text-text-secondary leading-relaxed max-w-3xl">
                  {item.overview}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Cast section */}
        {cast && cast.length > 0 && (
          <div className="mt-10 max-w-7xl mx-auto">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Cast
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {cast.map((member) => (
                <CastCard key={member.id} member={member} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CastCard({ member }: { member: CastMember }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex-shrink-0 w-28 text-center">
      <div className="relative w-20 h-20 mx-auto rounded-full overflow-hidden bg-surface-hover">
        {member.profileUrl && !imgError ? (
          <Image
            src={member.profileUrl}
            alt={member.name}
            fill
            className="object-cover"
            sizes="80px"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <User className="h-8 w-8 text-text-muted" />
          </div>
        )}
      </div>
      <p className="text-sm font-medium text-text-primary mt-2 truncate">
        {member.name}
      </p>
      {member.character && (
        <p className="text-xs text-text-muted truncate">{member.character}</p>
      )}
    </div>
  );
}

export { ContentDetail };
export type { ContentDetailProps };
