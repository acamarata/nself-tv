'use client';

import { useQuery } from '@apollo/client';
import { useProfiles } from '@/hooks/useProfiles';
import { ContentRow } from '@/components/content/ContentRow';
import { Spinner } from '@/components/ui/Spinner';
import { isContentAllowed } from '@/utils/ratings';
import {
  GET_CONTINUE_WATCHING,
  GET_TRENDING,
  GET_RECENTLY_ADDED,
  GET_RECOMMENDATIONS,
  GET_GENRE_CONTENT,
} from '@/lib/graphql/queries';
import type { MediaItem } from '@/types/content';

const GENRE_ROWS = ['Action', 'Comedy', 'Drama'];

function ContentRowSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-6 w-48 bg-surface-hover rounded animate-pulse" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-44 h-64 bg-surface-hover rounded-lg animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const { currentProfile } = useProfiles();

  const { data: continueData, loading: continueLoading } = useQuery(
    GET_CONTINUE_WATCHING,
    { variables: { profileId: currentProfile?.id } },
  );
  const { data: trendingData, loading: trendingLoading } = useQuery(GET_TRENDING);
  const { data: recentData, loading: recentLoading } = useQuery(GET_RECENTLY_ADDED);
  const { data: recommendData, loading: recommendLoading } = useQuery(
    GET_RECOMMENDATIONS,
    { variables: { profileId: currentProfile?.id } },
  );

  const genreQueries = GENRE_ROWS.map((genre) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data, loading } = useQuery(GET_GENRE_CONTENT, {
      variables: { genre },
    });
    return { genre, data, loading };
  });

  const filterAllowed = (items: MediaItem[] | undefined): MediaItem[] => {
    if (!items) return [];
    if (!currentProfile?.parentalControls) return items;
    return items.filter((item) =>
      isContentAllowed(
        item.contentRating,
        currentProfile.parentalControls.maxTvRating,
        currentProfile.parentalControls.maxMovieRating,
      ),
    );
  };

  const continueWatching = filterAllowed(continueData?.continueWatching);
  const trending = filterAllowed(trendingData?.trending);
  const recentlyAdded = filterAllowed(recentData?.recentlyAdded);
  const recommendations = filterAllowed(recommendData?.recommendations);

  const isLoading =
    continueLoading && trendingLoading && recentLoading && recommendLoading;

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-10">
        {Array.from({ length: 4 }).map((_, i) => (
          <ContentRowSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-10 pb-24 lg:pb-8">
      <h1 className="sr-only">Home</h1>

      {continueWatching.length > 0 && (
        <ContentRow title="Continue Watching" items={continueWatching} />
      )}

      {trendingLoading ? (
        <ContentRowSkeleton />
      ) : (
        trending.length > 0 && (
          <ContentRow title="Trending Now" items={trending} />
        )
      )}

      {recentLoading ? (
        <ContentRowSkeleton />
      ) : (
        recentlyAdded.length > 0 && (
          <ContentRow title="Recently Added" items={recentlyAdded} />
        )
      )}

      {recommendLoading ? (
        <ContentRowSkeleton />
      ) : (
        recommendations.length > 0 && (
          <ContentRow title="Recommended for You" items={recommendations} />
        )
      )}

      {genreQueries.map(({ genre, data, loading }) => {
        const items = filterAllowed(data?.genreContent);
        if (loading) return <ContentRowSkeleton key={genre} />;
        if (!items.length) return null;
        return <ContentRow key={genre} title={genre} items={items} />;
      })}
    </div>
  );
}
