/**
 * Hook for TV shows GraphQL queries and mutations.
 * Shows use media_items with type='tv_show', episodes with type='episode' + parent_id.
 */

import { useQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';

// ============================================================
// QUERIES
// ============================================================

const GET_SHOWS = gql`
  query GetShows($limit: Int = 50) {
    media_items(
      where: {
        type: {_eq: "tv_show"}
        status: {_eq: "ready"}
      }
      order_by: {added_at: desc}
      limit: $limit
    ) {
      id
      title
      original_title
      overview
      year
      content_rating
      genres
      tmdb_id
      tvdb_id
      community_rating
      vote_count
      poster_url
      backdrop_url
      view_count
      added_at
      credits
    }
  }
`;

const GET_SHOW_DETAIL = gql`
  query GetTVShowDetail($id: uuid!) {
    media_items_by_pk(id: $id) {
      id
      title
      original_title
      overview
      tagline
      year
      content_rating
      genres
      tags
      tmdb_id
      tvdb_id
      imdb_id
      community_rating
      vote_count
      poster_url
      backdrop_url
      credits
      added_at
      status
    }
  }
`;

const GET_SHOW_EPISODES = gql`
  query GetShowEpisodes($show_id: uuid!, $season: Int) {
    media_items(
      where: {
        type: {_eq: "episode"}
        parent_id: {_eq: $show_id}
        season_number: {_eq: $season}
      }
      order_by: [
        {season_number: asc}
        {episode_number: asc}
      ]
    ) {
      id
      title
      overview
      season_number
      episode_number
      runtime_minutes
      poster_url
      thumbnail_url
      hls_master_url
      status
      community_rating
      added_at
    }
  }
`;

const GET_SHOW_SEASONS = gql`
  query GetShowSeasons($show_id: uuid!) {
    media_items(
      where: {
        type: {_eq: "episode"}
        parent_id: {_eq: $show_id}
      }
      distinct_on: [season_number]
      order_by: [{season_number: asc}, {id: asc}]
    ) {
      season_number
    }
    media_items_aggregate(
      where: {
        type: {_eq: "episode"}
        parent_id: {_eq: $show_id}
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

const SEARCH_SHOWS = gql`
  query SearchShows($query: String!) {
    media_items(
      where: {
        type: {_eq: "tv_show"}
        _or: [
          {title: {_ilike: $query}}
          {original_title: {_ilike: $query}}
          {overview: {_ilike: $query}}
        ]
      }
      order_by: {community_rating: desc_nulls_last}
      limit: 30
    ) {
      id
      title
      year
      poster_url
      overview
      genres
      community_rating
      content_rating
      status
    }
  }
`;

const GET_RECENT_SHOWS = gql`
  query GetRecentShows($limit: Int = 20) {
    media_items(
      where: {type: {_eq: "tv_show"}, status: {_eq: "ready"}}
      order_by: {added_at: desc}
      limit: $limit
    ) {
      id
      title
      year
      poster_url
      backdrop_url
      community_rating
      genres
      added_at
    }
  }
`;

const GET_PENDING_SHOWS = gql`
  query GetPendingShows($limit: Int = 20) {
    media_items(
      where: {type: {_eq: "tv_show"}, status: {_neq: "ready"}}
      order_by: {added_at: desc}
      limit: $limit
    ) {
      id
      title
      year
      poster_url
      status
      added_at
    }
  }
`;

const GET_SHOWS_BY_GENRE = gql`
  query GetShowsByGenre($genre: String!, $limit: Int = 50) {
    media_items(
      where: {
        type: {_eq: "tv_show"}
        status: {_eq: "ready"}
        genres: {_contains: [$genre]}
      }
      order_by: {community_rating: desc_nulls_last}
      limit: $limit
    ) {
      id
      title
      original_title
      overview
      year
      content_rating
      genres
      tmdb_id
      tvdb_id
      community_rating
      vote_count
      poster_url
      backdrop_url
      view_count
      added_at
      credits
    }
  }
`;

// ============================================================
// MUTATIONS
// ============================================================

const ADD_SHOW = gql`
  mutation AddShow(
    $family_id: uuid!
    $title: String!
    $overview: String
    $year: Int
    $genres: _text
    $tmdb_id: Int
    $tvdb_id: Int
    $imdb_id: String
    $poster_url: String
    $backdrop_url: String
    $content_rating: String
    $community_rating: numeric
    $credits: jsonb
  ) {
    insert_media_items_one(
      object: {
        family_id: $family_id
        type: "tv_show"
        title: $title
        overview: $overview
        year: $year
        genres: $genres
        tmdb_id: $tmdb_id
        tvdb_id: $tvdb_id
        imdb_id: $imdb_id
        poster_url: $poster_url
        backdrop_url: $backdrop_url
        content_rating: $content_rating
        community_rating: $community_rating
        credits: $credits
        status: "pending"
        acquisition_source: "subscription"
      }
    ) {
      id
      title
    }
  }
`;

const ADD_EPISODE = gql`
  mutation AddEpisode(
    $family_id: uuid!
    $parent_id: uuid!
    $title: String!
    $overview: String
    $season_number: Int!
    $episode_number: Int!
    $runtime_minutes: Int
    $poster_url: String
    $thumbnail_url: String
  ) {
    insert_media_items_one(
      object: {
        family_id: $family_id
        type: "episode"
        parent_id: $parent_id
        title: $title
        overview: $overview
        season_number: $season_number
        episode_number: $episode_number
        runtime_minutes: $runtime_minutes
        poster_url: $poster_url
        thumbnail_url: $thumbnail_url
        status: "pending"
      }
    ) {
      id
      title
      season_number
      episode_number
    }
  }
`;

const DELETE_SHOW = gql`
  mutation DeleteShow($id: uuid!) {
    delete_media_items_by_pk(id: $id) {
      id
    }
  }
`;

// ============================================================
// HOOKS
// ============================================================

export function useShows(genre?: string, limit = 50) {
  return useQuery(genre ? GET_SHOWS_BY_GENRE : GET_SHOWS, {
    variables: genre ? { genre, limit } : { limit },
  });
}

export function useShowDetail(id: string) {
  return useQuery(GET_SHOW_DETAIL, {
    variables: { id },
    skip: !id,
  });
}

export function useShowEpisodes(showId: string, season?: number) {
  return useQuery(GET_SHOW_EPISODES, {
    variables: { show_id: showId, season },
    skip: !showId,
  });
}

export function useShowSeasons(showId: string) {
  return useQuery(GET_SHOW_SEASONS, {
    variables: { show_id: showId },
    skip: !showId,
  });
}

export function useSearchShows(query: string) {
  return useQuery(SEARCH_SHOWS, {
    variables: { query: `%${query}%` },
    skip: !query || query.length < 2,
  });
}

export function useRecentShows(limit = 20) {
  return useQuery(GET_RECENT_SHOWS, {
    variables: { limit },
  });
}

export function usePendingShows(limit = 20) {
  return useQuery(GET_PENDING_SHOWS, {
    variables: { limit },
    pollInterval: 10000,
  });
}

export function useAddShow() {
  return useMutation(ADD_SHOW, {
    refetchQueries: ['GetShows', 'GetRecentShows'],
  });
}

export function useAddEpisode() {
  return useMutation(ADD_EPISODE, {
    refetchQueries: ['GetShowEpisodes'],
  });
}

export function useDeleteShow() {
  return useMutation(DELETE_SHOW, {
    refetchQueries: ['GetShows'],
  });
}
