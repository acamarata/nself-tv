/**
 * Hook for movies GraphQL queries and mutations.
 * Movies use the media_items table with type='movie'.
 */

import { useQuery, useMutation, useLazyQuery } from '@apollo/client';
import { gql } from '@apollo/client';

// ============================================================
// QUERIES
// ============================================================

const GET_MOVIES = gql`
  query GetMovies($limit: Int = 50, $offset: Int = 0) {
    media_items(
      where: {
        type: {_eq: "movie"}
        status: {_eq: "ready"}
      }
      order_by: {added_at: desc}
      limit: $limit
      offset: $offset
    ) {
      id
      title
      original_title
      slug
      overview
      tagline
      year
      release_date
      runtime_minutes
      content_rating
      genres
      tags
      tmdb_id
      imdb_id
      community_rating
      vote_count
      poster_url
      backdrop_url
      thumbnail_url
      hls_master_url
      view_count
      added_at
      credits
    }
    media_items_aggregate(
      where: {type: {_eq: "movie"}, status: {_eq: "ready"}}
    ) {
      aggregate {
        count
      }
    }
  }
`;

const GET_MOVIE_DETAIL = gql`
  query GetMovieDetail($id: uuid!) {
    media_items_by_pk(id: $id) {
      id
      title
      original_title
      slug
      overview
      tagline
      year
      release_date
      runtime_minutes
      content_rating
      genres
      tags
      tmdb_id
      imdb_id
      community_rating
      vote_count
      poster_url
      backdrop_url
      thumbnail_url
      hls_master_url
      trickplay_url
      source_path
      status
      view_count
      added_at
      credits
      acquisition_source
      variants {
        id
        rendition
        quality_tier
        width
        height
        bitrate_kbps
        video_codec
        audio_codec
        hls_playlist_url
      }
      subtitles {
        id
        language
        label
        format
        url
        is_default
        is_forced
      }
      audio_tracks {
        id
        language
        label
        codec
        channels
        bitrate_kbps
        is_default
      }
    }
  }
`;

const SEARCH_MOVIES = gql`
  query SearchMovies($query: String!) {
    media_items(
      where: {
        type: {_eq: "movie"}
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
      runtime_minutes
      content_rating
      status
    }
  }
`;

const GET_RECENT_MOVIES = gql`
  query GetRecentMovies($limit: Int = 20) {
    media_items(
      where: {type: {_eq: "movie"}, status: {_eq: "ready"}}
      order_by: {added_at: desc}
      limit: $limit
    ) {
      id
      title
      year
      poster_url
      backdrop_url
      community_rating
      runtime_minutes
      genres
      added_at
    }
  }
`;

const GET_PENDING_MOVIES = gql`
  query GetPendingMovies($limit: Int = 20) {
    media_items(
      where: {type: {_eq: "movie"}, status: {_neq: "ready"}}
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

const GET_MOVIES_BY_GENRE = gql`
  query GetMoviesByGenre($genre: String!, $limit: Int = 20) {
    media_items(
      where: {
        type: {_eq: "movie"}
        status: {_eq: "ready"}
        genres: {_contains: [$genre]}
      }
      order_by: {community_rating: desc_nulls_last}
      limit: $limit
    ) {
      id
      title
      year
      poster_url
      community_rating
      genres
    }
  }
`;

// ============================================================
// MUTATIONS
// ============================================================

const ADD_MOVIE = gql`
  mutation AddMovie(
    $family_id: uuid!
    $title: String!
    $overview: String
    $year: Int
    $runtime_minutes: Int
    $genres: _text
    $tmdb_id: Int
    $imdb_id: String
    $poster_url: String
    $backdrop_url: String
    $content_rating: String
    $community_rating: numeric
    $credits: jsonb
    $tagline: String
    $release_date: date
  ) {
    insert_media_items_one(
      object: {
        family_id: $family_id
        type: "movie"
        title: $title
        overview: $overview
        year: $year
        runtime_minutes: $runtime_minutes
        genres: $genres
        tmdb_id: $tmdb_id
        imdb_id: $imdb_id
        poster_url: $poster_url
        backdrop_url: $backdrop_url
        content_rating: $content_rating
        community_rating: $community_rating
        credits: $credits
        tagline: $tagline
        release_date: $release_date
        status: "pending"
        acquisition_source: "manual"
      }
    ) {
      id
      title
    }
  }
`;

const UPDATE_MOVIE_STATUS = gql`
  mutation UpdateMovieStatus($id: uuid!, $status: String!) {
    update_media_items_by_pk(
      pk_columns: {id: $id}
      _set: {status: $status}
    ) {
      id
      status
    }
  }
`;

const DELETE_MOVIE = gql`
  mutation DeleteMovie($id: uuid!) {
    delete_media_items_by_pk(id: $id) {
      id
    }
  }
`;

// ============================================================
// HOOKS
// ============================================================

export function useMovies(genre?: string, limit = 50, offset = 0) {
  return useQuery(genre ? GET_MOVIES_BY_GENRE : GET_MOVIES, {
    variables: genre ? { genre, limit } : { limit, offset },
  });
}

export function useMovieDetail(id: string) {
  return useQuery(GET_MOVIE_DETAIL, {
    variables: { id },
    skip: !id,
  });
}

export function useSearchMovies(query: string) {
  return useQuery(SEARCH_MOVIES, {
    variables: { query: `%${query}%` },
    skip: !query || query.length < 2,
  });
}

export function useSearchMoviesLazy() {
  return useLazyQuery(SEARCH_MOVIES);
}

export function useRecentMovies(limit = 20) {
  return useQuery(GET_RECENT_MOVIES, {
    variables: { limit },
  });
}

export function usePendingMovies(limit = 20) {
  return useQuery(GET_PENDING_MOVIES, {
    variables: { limit },
    pollInterval: 10000,
  });
}

export function useMoviesByGenre(genre: string, limit = 20) {
  return useQuery(GET_MOVIES_BY_GENRE, {
    variables: { genre, limit },
    skip: !genre,
  });
}

export function useAddMovie() {
  return useMutation(ADD_MOVIE, {
    refetchQueries: ['GetMovies', 'GetRecentMovies'],
  });
}

export function useUpdateMovieStatus() {
  return useMutation(UPDATE_MOVIE_STATUS);
}

export function useDeleteMovie() {
  return useMutation(DELETE_MOVIE, {
    refetchQueries: ['GetMovies'],
  });
}
