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
export const GET_FAMILY_PROFILES = gql`
  query GetFamilyProfiles($userId: uuid!) {
    profiles(where: { user_id: { _eq: $userId } }, order_by: { created_at: asc }) {
      id
      user_id
      display_name
      avatar_url
      role
      parental_controls
      preferences
      is_default
      created_at
    }
  }
`;

export const CREATE_PROFILE = gql`
  mutation CreateProfile($input: profiles_insert_input!) {
    insert_profiles_one(object: $input) {
      id
      user_id
      display_name
      avatar_url
      role
      parental_controls
      preferences
      is_default
      created_at
    }
  }
`;

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($id: uuid!, $input: profiles_set_input!) {
    update_profiles_by_pk(pk_columns: { id: $id }, _set: $input) {
      id
      user_id
      display_name
      avatar_url
      role
      parental_controls
      preferences
      is_default
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
export const GET_CONTINUE_WATCHING = gql`
  query GetContinueWatching($profileId: uuid!, $limit: Int = 20) {
    watch_progress(
      where: { profile_id: { _eq: $profileId }, percentage: { _lt: 95, _gt: 5 } }
      order_by: { updated_at: desc }
      limit: $limit
    ) {
      media_item_id
      position
      duration
      percentage
      updated_at
      media_item {
        id
        type
        title
        poster_url
        year
        content_rating
        runtime
      }
    }
  }
`;

export const GET_RECENTLY_ADDED = gql`
  query GetRecentlyAdded($limit: Int = 20, $contentRating: String) {
    media_items(
      where: { content_rating: { _lte: $contentRating } }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      id
      type
      title
      poster_url
      backdrop_url
      year
      content_rating
      vote_average
      genres
      runtime
    }
  }
`;

export const GET_TRENDING = gql`
  query GetTrending($limit: Int = 20) {
    media_items(
      order_by: { trending_score: desc_nulls_last }
      limit: $limit
    ) {
      id
      type
      title
      poster_url
      year
      content_rating
      vote_average
      genres
      runtime
    }
  }
`;

export const GET_GENRE_CONTENT = gql`
  query GetGenreContent($genre: String!, $limit: Int = 20) {
    media_items(
      where: { genres: { _contains: [$genre] } }
      order_by: { vote_average: desc_nulls_last }
      limit: $limit
    ) {
      id
      type
      title
      poster_url
      year
      content_rating
      vote_average
      genres
      runtime
    }
  }
`;

export const GET_RECOMMENDATIONS = gql`
  query GetRecommendations($profileId: uuid!, $limit: Int = 20) {
    content_recommendations(
      where: { profile_id: { _eq: $profileId } }
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
        vote_average
        genres
        runtime
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
      vote_average
      genres
      runtime
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
export const GET_MEDIA_ITEM = gql`
  query GetMediaItem($id: uuid!) {
    media_items_by_pk(id: $id) {
      id
      type
      title
      original_title
      year
      overview
      poster_url
      backdrop_url
      genres
      content_rating
      runtime
      vote_average
      vote_count
      status
      created_at
      cast_members(order_by: { order: asc }, limit: 20) {
        id
        name
        character
        profile_url
        order
      }
    }
  }
`;

export const GET_TV_SHOW_SEASONS = gql`
  query GetTVShowSeasons($showId: uuid!) {
    seasons(where: { show_id: { _eq: $showId } }, order_by: { season_number: asc }) {
      id
      show_id
      season_number
      name
      overview
      poster_url
      episode_count
      air_date
    }
  }
`;

export const GET_SEASON_EPISODES = gql`
  query GetSeasonEpisodes($seasonId: uuid!) {
    episodes(where: { season_id: { _eq: $seasonId } }, order_by: { episode_number: asc }) {
      id
      show_id
      season_id
      season_number
      episode_number
      title
      overview
      still_url
      runtime
      air_date
    }
  }
`;

// --- Search ---
export const SEARCH_CONTENT = gql`
  query SearchContent($query: String!, $type: String, $limit: Int = 24) {
    search_media(args: { search_query: $query, media_type: $type, result_limit: $limit }) {
      id
      type
      title
      poster_url
      year
      content_rating
      vote_average
      genres
      runtime
      overview
    }
  }
`;

// --- Watchlist ---
export const GET_WATCHLIST = gql`
  query GetWatchlist($profileId: uuid!) {
    watchlist_items(
      where: { profile_id: { _eq: $profileId } }
      order_by: { sort_order: asc }
    ) {
      id
      media_item_id
      profile_id
      sort_order
      added_at
      media_item {
        id
        type
        title
        poster_url
        year
        content_rating
        vote_average
        genres
        runtime
      }
    }
  }
`;

export const ADD_TO_WATCHLIST = gql`
  mutation AddToWatchlist($profileId: uuid!, $mediaItemId: uuid!) {
    insert_watchlist_items_one(
      object: { profile_id: $profileId, media_item_id: $mediaItemId }
      on_conflict: { constraint: watchlist_items_profile_id_media_item_id_key, update_columns: [] }
    ) {
      id
      media_item_id
      profile_id
      sort_order
      added_at
    }
  }
`;

export const REMOVE_FROM_WATCHLIST = gql`
  mutation RemoveFromWatchlist($id: uuid!) {
    delete_watchlist_items_by_pk(id: $id) {
      id
    }
  }
`;

export const REORDER_WATCHLIST = gql`
  mutation ReorderWatchlist($updates: [watchlist_items_updates!]!) {
    update_watchlist_items_many(updates: $updates) {
      returning {
        id
        sort_order
      }
    }
  }
`;
