'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client';
import { useWatchlist } from '@/hooks/useWatchlist';
import { ContentDetail } from '@/components/content/ContentDetail';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { formatRuntime } from '@/utils/ratings';
import { mapToMediaItem } from '@/types/content';
import {
  GET_MEDIA_ITEM,
  GET_TV_SHOW_SEASONS,
  GET_SEASON_EPISODES,
} from '@/lib/graphql/queries';

export default function ContentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contentId = params.contentId as string;
  const { isInWatchlist, toggle: toggleWatchlist } = useWatchlist();

  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState(1);

  const { data: itemData, loading: itemLoading } = useQuery(GET_MEDIA_ITEM, {
    variables: { id: contentId },
    skip: !contentId,
  });

  const rawItem = itemData?.media_items_by_pk;
  const item = rawItem ? mapToMediaItem(rawItem) : undefined;
  const isTVShow = item?.type === 'tv_show';

  const { data: seasonsData, loading: seasonsLoading } = useQuery(
    GET_TV_SHOW_SEASONS,
    {
      variables: { showId: contentId },
      skip: !isTVShow,
    },
  );

  // GET_TV_SHOW_SEASONS returns media_items with distinct season_number
  const seasonNumbers: number[] = (seasonsData?.media_items ?? []).map(
    (s: { season_number: number }) => s.season_number,
  );

  const { data: episodesData, loading: episodesLoading } = useQuery(
    GET_SEASON_EPISODES,
    {
      variables: { showId: contentId, season: selectedSeasonNumber },
      skip: !isTVShow || seasonNumbers.length === 0,
    },
  );

  interface EpisodeRow {
    id: string;
    episodeNumber: number;
    title: string;
    overview: string | null;
    thumbnailUrl: string | null;
    runtimeMinutes: number | null;
    communityRating: number | null;
    addedAt: string;
  }

  // Episodes are media_items with parent_id = showId
  const episodes: EpisodeRow[] = (episodesData?.media_items ?? []).map(
    (raw: Record<string, unknown>): EpisodeRow => ({
      id: raw.id as string,
      episodeNumber: raw.episode_number as number,
      title: (raw.title as string) ?? '',
      overview: (raw.overview as string) ?? null,
      thumbnailUrl: (raw.thumbnail_url as string) ?? null,
      runtimeMinutes: (raw.runtime_minutes as number) ?? null,
      communityRating: (raw.community_rating as number) ?? null,
      addedAt: (raw.added_at as string) ?? '',
    }),
  );

  if (itemLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex flex-col items-center justify-center py-20">
          <h2 className="text-lg font-semibold text-text-primary mb-2">
            Content not found
          </h2>
          <p className="text-text-secondary text-sm mb-6">
            The content you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Button variant="secondary" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const inWatchlist = isInWatchlist(item.id);

  return (
    <div className="p-6 lg:p-8 pb-24 lg:pb-8">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-text-secondary hover:text-text-primary mb-6 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Content Detail */}
      <ContentDetail item={item} />

      {/* Action Buttons */}
      <div className="flex items-center gap-3 mt-6">
        <Button
          variant="primary"
          size="lg"
          onClick={() => router.push(`/${contentId}/play`)}
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          Play
        </Button>

        <Button
          variant="secondary"
          size="lg"
          onClick={() => toggleWatchlist(item.id)}
        >
          {inWatchlist ? (
            <>
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              In Watchlist
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Add to Watchlist
            </>
          )}
        </Button>
      </div>

      {/* TV Show: Seasons & Episodes */}
      {isTVShow && (
        <div className="mt-10">
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-lg font-semibold text-text-primary">Episodes</h2>

            {/* Season Selector */}
            {seasonsLoading ? (
              <Spinner size="sm" />
            ) : (
              <select
                value={selectedSeasonNumber}
                onChange={(e) => setSelectedSeasonNumber(Number(e.target.value))}
                aria-label="Select season"
                className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {seasonNumbers.map((num) => (
                  <option key={num} value={num}>
                    Season {num}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Episode List */}
          {episodesLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex gap-4 bg-surface border border-border rounded-xl p-4 animate-pulse"
                >
                  <div className="w-40 h-24 bg-surface-hover rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 bg-surface-hover rounded" />
                    <div className="h-3 w-full bg-surface-hover rounded" />
                    <div className="h-3 w-2/3 bg-surface-hover rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : episodes.length > 0 ? (
            <div className="space-y-3">
              {episodes.map((episode) => (
                <button
                  key={episode.id}
                  onClick={() => router.push(`/${contentId}/play?season=${selectedSeasonNumber}&episode=${episode.episodeNumber}`)}
                  className="flex gap-4 w-full bg-surface border border-border rounded-xl p-4 hover:bg-surface-hover transition-colors text-left"
                >
                  {/* Episode Thumbnail */}
                  <div className="w-40 h-24 bg-surface-hover rounded-lg flex-shrink-0 overflow-hidden relative">
                    {episode.thumbnailUrl ? (
                      <Image
                        src={episode.thumbnailUrl}
                        alt={episode.title}
                        fill
                        className="object-cover"
                        sizes="160px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-text-tertiary" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Episode Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-text-tertiary">
                        E{episode.episodeNumber}
                      </span>
                      <h3 className="text-sm font-semibold text-text-primary truncate">
                        {episode.title}
                      </h3>
                    </div>
                    {episode.overview && (
                      <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                        {episode.overview}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-text-tertiary">
                      {episode.runtimeMinutes && (
                        <span>{formatRuntime(episode.runtimeMinutes)}</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-text-secondary text-sm py-4">
              No episodes available for this season.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
