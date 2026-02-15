import { gql } from '@apollo/client';

// --- Users ---
export const GET_USER_FAMILY = gql`
  query GetUserFamily($userId: uuid!) {
    users_by_pk(id: $userId) {
      id
      family_id
    }
  }
`;

// --- Profiles ---
// Schema: profiles(id, user_id, family_id, name, avatar_url, is_default,
//   content_rating_limit, pin_hash, language, subtitle_language, audio_language,
//   autoplay_next, preferences, created_at, updated_at)
export const GET_FAMILY_PROFILES = gql`
  query GetFamilyProfiles($userId: uuid!) {
    profiles(where: { user_id: { _eq: $userId } }, order_by: { created_at: asc }) {
      id
      user_id
      family_id
      name
      avatar_url
      is_default
      content_rating_limit
      language
      subtitle_language
      audio_language
      autoplay_next
      preferences
      created_at
    }
  }
`;

export const CREATE_PROFILE = gql`
  mutation CreateProfile($input: profiles_insert_input!) {
    insert_profiles_one(object: $input) {
      id
      user_id
      family_id
      name
      avatar_url
      is_default
      content_rating_limit
      language
      subtitle_language
      audio_language
      autoplay_next
      preferences
      created_at
    }
  }
`;

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($id: uuid!, $input: profiles_set_input!) {
    update_profiles_by_pk(pk_columns: { id: $id }, _set: $input) {
      id
      user_id
      family_id
      name
      avatar_url
      is_default
      content_rating_limit
      language
      subtitle_language
      audio_language
      autoplay_next
      preferences
      created_at
    }
  }
`;

export const DELETE_PROFILE = gql`
  mutation DeleteProfile($id: uuid!) {
    delete_profiles_by_pk(id: $id) {
      id
    }
  }
`;

// --- Content ---
// Schema: watch_progress(user_id, family_id, media_item_id, position_seconds,
//   duration_seconds, percentage[computed], completed, last_watched_at)
export const GET_CONTINUE_WATCHING = gql`
  query GetContinueWatching($userId: uuid!, $limit: Int = 20) {
    watch_progress(
      where: { user_id: { _eq: $userId }, percentage: { _lt: 95, _gt: 5 } }
      order_by: { last_watched_at: desc }
      limit: $limit
    ) {
      media_item_id
      position_seconds
      duration_seconds
      percentage
      last_watched_at
      media_item {
        id
        type
        title
        poster_url
        year
        content_rating
        runtime_minutes
      }
    }
  }
`;

// Schema: media_items columns: community_rating (not vote_average), runtime_minutes (not runtime)
export const GET_RECENTLY_ADDED = gql`
  query GetRecentlyAdded($limit: Int = 20) {
    media_items(
      where: { status: { _eq: "ready" } }
      order_by: { added_at: desc }
      limit: $limit
    ) {
      id
      type
      title
      poster_url
      backdrop_url
      year
      content_rating
      community_rating
      genres
      runtime_minutes
    }
  }
`;

// Trending: uses trending_content table joined to media_items
export const GET_TRENDING = gql`
  query GetTrending($limit: Int = 20) {
    trending_content(
      order_by: { trending_score: desc }
      limit: $limit
    ) {
      trending_score
      media_item {
        id
        type
        title
        poster_url
        year
        content_rating
        community_rating
        genres
        runtime_minutes
      }
    }
  }
`;

export const GET_GENRE_CONTENT = gql`
  query GetGenreContent($genre: String!, $limit: Int = 20) {
    media_items(
      where: { genres: { _contains: [$genre] }, status: { _eq: "ready" } }
      order_by: { community_rating: desc_nulls_last }
      limit: $limit
    ) {
      id
      type
      title
      poster_url
      year
      content_rating
      community_rating
      genres
      runtime_minutes
    }
  }
`;

// Recommendations: uses user_id (not profile_id)
export const GET_RECOMMENDATIONS = gql`
  query GetRecommendations($userId: uuid!, $limit: Int = 20) {
    content_recommendations(
      where: { user_id: { _eq: $userId } }
      order_by: { score: desc }
      limit: $limit
    ) {
      media_item {
        id
        type
        title
        poster_url
        year
        content_rating
        community_rating
        genres
        runtime_minutes
      }
      score
    }
  }
`;

// --- Catalog ---
export const GET_CATALOG_ITEMS = gql`
  query GetCatalogItems(
    $where: media_items_bool_exp = {}
    $orderBy: [media_items_order_by!] = [{ title: asc }]
    $limit: Int = 24
    $offset: Int = 0
  ) {
    media_items(where: $where, order_by: $orderBy, limit: $limit, offset: $offset) {
      id
      type
      title
      poster_url
      year
      content_rating
      community_rating
      genres
      runtime_minutes
      overview
    }
    media_items_aggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

// --- Detail ---
// Cast/crew stored as JSONB in media_items.credits (not a separate table)
export const GET_MEDIA_ITEM = gql`
  query GetMediaItem($id: uuid!) {
    media_items_by_pk(id: $id) {
      id
      type
      title
      original_title
      slug
      tagline
      year
      overview
      poster_url
      backdrop_url
      thumbnail_url
      genres
      tags
      content_rating
      runtime_minutes
      community_rating
      vote_count
      credits
      status
      hls_master_url
      source_path
      tmdb_id
      imdb_id
      tvdb_id
      parent_id
      season_number
      episode_number
      added_at
      created_at
    }
  }
`;

// TV Shows: uses media_items self-reference (no separate seasons/episodes tables)
export const GET_TV_SHOW_SEASONS = gql`
  query GetTVShowSeasons($showId: uuid!) {
    media_items(
      where: {
        type: { _eq: "episode" }
        parent_id: { _eq: $showId }
      }
      distinct_on: [season_number]
      order_by: [{ season_number: asc }, { id: asc }]
    ) {
      season_number
    }
    media_items_aggregate(
      where: {
        type: { _eq: "episode" }
        parent_id: { _eq: $showId }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

export const GET_SEASON_EPISODES = gql`
  query GetSeasonEpisodes($showId: uuid!, $season: Int!) {
    media_items(
      where: {
        type: { _eq: "episode" }
        parent_id: { _eq: $showId }
        season_number: { _eq: $season }
      }
      order_by: { episode_number: asc }
    ) {
      id
      parent_id
      season_number
      episode_number
      title
      overview
      thumbnail_url
      runtime_minutes
      status
      hls_master_url
      community_rating
      added_at
    }
  }
`;

// --- Search ---
// Uses _ilike on media_items (search_media function does not exist)
export const SEARCH_CONTENT = gql`
  query SearchContent($query: String!, $type: String, $limit: Int = 24) {
    media_items(
      where: {
        _and: [
          { _or: [
            { title: { _ilike: $query } }
            { original_title: { _ilike: $query } }
            { overview: { _ilike: $query } }
          ]}
          { type: { _eq: $type } }
        ]
      }
      order_by: { community_rating: desc_nulls_last }
      limit: $limit
    ) {
      id
      type
      title
      poster_url
      year
      content_rating
      community_rating
      genres
      runtime_minutes
      overview
    }
  }
`;

// --- Watchlist ---
// Uses playlists table with name "__watchlist__" and playlist_items for per-user watchlists.
export const GET_WATCHLIST = gql`
  query GetWatchlist($userId: uuid!) {
    playlists(
      where: { owner_id: { _eq: $userId }, name: { _eq: "__watchlist__" } }
      limit: 1
    ) {
      id
      items(order_by: { position: asc }) {
        id
        media_item_id
        position
        media_item {
          id
          type
          title
          poster_url
          year
          content_rating
          community_rating
          genres
          runtime_minutes
        }
      }
    }
  }
`;

export const ADD_TO_WATCHLIST = gql`
  mutation AddToWatchlist($playlistId: uuid!, $mediaItemId: uuid!) {
    insert_playlist_items_one(
      object: { playlist_id: $playlistId, media_item_id: $mediaItemId }
    ) {
      id
      media_item_id
      position
    }
  }
`;

export const REMOVE_FROM_WATCHLIST = gql`
  mutation RemoveFromWatchlist($id: uuid!) {
    delete_playlist_items_by_pk(id: $id) {
      id
    }
  }
`;
