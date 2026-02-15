/**
 * Hook for fetching home screen content
 */

import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';

const GET_CONTINUE_WATCHING = gql`
  query GetContinueWatching {
    watch_progress(
      where: { completed: { _eq: false }, percentage: { _gte: 5, _lt: 90 } }
      order_by: { last_watched_at: desc }
      limit: 10
    ) {
      id
      position_seconds
      duration_seconds
      percentage
      media_item {
        id
        title
        poster_url
        backdrop_url
        type
      }
    }
  }
`;

const GET_RECOMMENDED = gql`
  query GetRecommended {
    content_recommendations(
      where: { expires_at: { _gt: "now()" } }
      order_by: { score: desc }
      limit: 10
    ) {
      id
      score
      reason
      media_item {
        id
        title
        poster_url
        backdrop_url
        type
        genres
      }
    }
  }
`;

const GET_TRENDING = gql`
  query GetTrending {
    trending_content(
      where: { expires_at: { _gt: "now()" } }
      order_by: { trending_score: desc }
      limit: 10
    ) {
      id
      trending_score
      view_count
      play_count
      media_item {
        id
        title
        poster_url
        backdrop_url
        type
      }
    }
  }
`;

export function useContinueWatching() {
  return useQuery(GET_CONTINUE_WATCHING);
}

export function useRecommended() {
  return useQuery(GET_RECOMMENDED);
}

export function useTrending() {
  return useQuery(GET_TRENDING);
}
