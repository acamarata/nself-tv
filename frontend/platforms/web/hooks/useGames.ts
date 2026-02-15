/**
 * Hook for games GraphQL queries and mutations.
 * Includes game catalog search, ROM management, saves, and play sessions.
 */

import { useQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';

// ============================================================
// LIBRARY QUERIES
// ============================================================

const GET_GAME_SYSTEMS = gql`
  query GetGameSystems {
    game_systems(order_by: {name: asc}) {
      id
      name
      full_name
      manufacturer
      release_year
      tier
      core_name
      bios_required
      file_extensions
    }
  }
`;

const GET_ROMS_BY_SYSTEM = gql`
  query GetROMsBySystem($system_id: uuid!) {
    game_roms(
      where: {system_id: {_eq: $system_id}}
      order_by: {popularity_score: desc_nulls_last, title: asc}
    ) {
      id
      title
      cover_url
      year
      genre
      publisher
      developer
      region
      players
      file_size
      pinned
      popularity_score
      download_status
      description
      game_system {
        name
        full_name
        tier
      }
    }
  }
`;

const GET_ROM_DETAIL = gql`
  query GetROMDetail($id: uuid!) {
    game_roms_by_pk(id: $id) {
      id
      title
      description
      cover_url
      screenshot_urls
      year
      genre
      publisher
      developer
      region
      file_size
      file_path
      players
      content_rating
      download_status
      pinned
      popularity_score
      game_system {
        id
        name
        full_name
        core_name
      }
      save_states: game_save_states(
        order_by: { created_at: desc }
        limit: 5
      ) {
        id
        slot
        screenshot_path
        created_at
      }
    }
  }
`;

const GET_USER_SAVE_STATES = gql`
  query GetUserSaveStates($rom_id: uuid!) {
    game_save_states(
      where: {rom_id: {_eq: $rom_id}}
      order_by: {created_at: desc}
    ) {
      id
      slot
      data_path
      screenshot_path
      hash
      created_at
    }
  }
`;

const GET_RECENT_SESSIONS = gql`
  query GetRecentSessions($limit: Int = 10) {
    game_play_sessions(
      order_by: {started_at: desc}
      limit: $limit
    ) {
      id
      started_at
      ended_at
      duration_seconds
      game_rom {
        id
        title
        cover_url
        game_system {
          name
          full_name
        }
      }
    }
  }
`;

// ============================================================
// CATALOG QUERIES (for "Add Game" search)
// ============================================================

const SEARCH_GAME_CATALOG = gql`
  query SearchGameCatalog($query: String!, $system_id: uuid) {
    game_catalog(
      where: {
        _and: [
          {
            _or: [
              {title: {_ilike: $query}}
              {clean_title: {_ilike: $query}}
              {publisher: {_ilike: $query}}
              {developer: {_ilike: $query}}
            ]
          }
          {system_id: {_eq: $system_id}}
        ]
      }
      order_by: {popularity_score: desc}
      limit: 30
    ) {
      id
      title
      clean_title
      slug
      year
      genre
      publisher
      developer
      region
      players
      description
      popularity_score
      global_sales_millions
      critic_score
      user_rating
      cover_url
      thumbnail_url
      screenshot_urls
      rom_file_size
      content_rating
      game_system {
        id
        name
        full_name
        tier
      }
    }
  }
`;

const GET_POPULAR_GAMES = gql`
  query GetPopularGames($system_id: uuid!, $limit: Int = 20) {
    game_catalog(
      where: {system_id: {_eq: $system_id}}
      order_by: {popularity_score: desc}
      limit: $limit
    ) {
      id
      title
      year
      genre
      publisher
      popularity_score
      cover_url
      content_rating
      players
      description
      game_system {
        id
        name
        full_name
      }
    }
  }
`;

const GET_GAME_CATALOG_DETAIL = gql`
  query GetGameCatalogDetail($id: uuid!) {
    game_catalog_by_pk(id: $id) {
      id
      title
      clean_title
      slug
      year
      genre
      publisher
      developer
      region
      players
      description
      popularity_score
      global_sales_millions
      critic_score
      user_rating
      igdb_id
      mobygames_id
      cover_url
      thumbnail_url
      screenshot_urls
      banner_url
      rom_hash_sha256
      rom_file_size
      content_rating
      tags
      metadata
      game_system {
        id
        name
        full_name
        manufacturer
        tier
        core_name
        bios_required
      }
    }
  }
`;

// ============================================================
// MUTATIONS
// ============================================================

const CREATE_SAVE_STATE = gql`
  mutation CreateSaveState($rom_id: uuid!, $slot: Int!, $data_path: String!, $hash: String!) {
    insert_game_save_states_one(
      object: {
        rom_id: $rom_id
        slot: $slot
        data_path: $data_path
        hash: $hash
      }
      on_conflict: {
        constraint: game_save_states_user_id_rom_id_slot_key
        update_columns: [data_path, hash]
      }
    ) {
      id
    }
  }
`;

const START_PLAY_SESSION = gql`
  mutation StartPlaySession($rom_id: uuid!) {
    insert_game_play_sessions_one(
      object: {rom_id: $rom_id}
    ) {
      id
    }
  }
`;

const END_PLAY_SESSION = gql`
  mutation EndPlaySession($session_id: uuid!, $duration_seconds: Int!, $ended_at: timestamptz!) {
    update_game_play_sessions_by_pk(
      pk_columns: {id: $session_id}
      _set: {ended_at: $ended_at, duration_seconds: $duration_seconds}
    ) {
      id
    }
  }
`;

const ADD_GAME_FROM_CATALOG = gql`
  mutation AddGameFromCatalog(
    $family_id: uuid!
    $system_id: uuid!
    $catalog_id: uuid!
    $title: String!
    $cover_url: String
    $year: Int
    $genre: String
    $publisher: String
    $developer: String
    $region: String
    $players: String
    $description: String
    $popularity_score: numeric
    $screenshot_urls: _text
    $content_rating: String
    $file_path: String!
    $file_size: bigint!
    $min_tier: Int
  ) {
    insert_game_roms_one(
      object: {
        family_id: $family_id
        system_id: $system_id
        catalog_id: $catalog_id
        title: $title
        cover_url: $cover_url
        year: $year
        genre: $genre
        publisher: $publisher
        developer: $developer
        region: $region
        players: $players
        description: $description
        popularity_score: $popularity_score
        screenshot_urls: $screenshot_urls
        content_rating: $content_rating
        file_path: $file_path
        file_size: $file_size
        min_tier: $min_tier
        download_status: "pending"
      }
    ) {
      id
      title
      download_status
    }
  }
`;

const UPDATE_ROM_STATUS = gql`
  mutation UpdateROMStatus($id: uuid!, $status: String!, $file_path: String, $file_size: bigint) {
    update_game_roms_by_pk(
      pk_columns: {id: $id}
      _set: {
        download_status: $status
        file_path: $file_path
        file_size: $file_size
      }
    ) {
      id
      download_status
    }
  }
`;

const TOGGLE_PIN_ROM = gql`
  mutation TogglePinROM($id: uuid!, $pinned: Boolean!) {
    update_game_roms_by_pk(
      pk_columns: {id: $id}
      _set: {pinned: $pinned}
    ) {
      id
      pinned
    }
  }
`;

const DELETE_ROM = gql`
  mutation DeleteROM($id: uuid!) {
    delete_game_roms_by_pk(id: $id) {
      id
    }
  }
`;

const DELETE_SAVE_STATE = gql`
  mutation DeleteSaveState($id: uuid!) {
    delete_game_save_states_by_pk(id: $id) {
      id
    }
  }
`;

// ============================================================
// HOOKS — Library
// ============================================================

export function useGameSystems() {
  return useQuery(GET_GAME_SYSTEMS);
}

export function useROMsBySystem(systemId: string) {
  return useQuery(GET_ROMS_BY_SYSTEM, {
    variables: { system_id: systemId },
    skip: !systemId,
  });
}

export function useROMDetail(romId: string) {
  return useQuery(GET_ROM_DETAIL, {
    variables: { id: romId },
    skip: !romId,
  });
}

export function useUserSaveStates(romId: string) {
  return useQuery(GET_USER_SAVE_STATES, {
    variables: { rom_id: romId },
    skip: !romId,
  });
}

// Backward-compatible alias used by pages under app/(app)/games/*.
export function useGameSaveStates(romId: string) {
  return useUserSaveStates(romId);
}

export function useRecentSessions(limit = 10) {
  return useQuery(GET_RECENT_SESSIONS, {
    variables: { limit },
  });
}

// ============================================================
// HOOKS — Catalog (Add Game flow)
// ============================================================

export function useSearchGameCatalog(query: string, systemId?: string) {
  return useQuery(SEARCH_GAME_CATALOG, {
    variables: {
      query: `%${query}%`,
      system_id: systemId || undefined,
    },
    skip: !query || query.length < 2,
  });
}

export function usePopularGames(systemId: string, limit = 20) {
  return useQuery(GET_POPULAR_GAMES, {
    variables: { system_id: systemId, limit },
    skip: !systemId,
  });
}

export function useGameCatalogDetail(id: string) {
  return useQuery(GET_GAME_CATALOG_DETAIL, {
    variables: { id },
    skip: !id,
  });
}

// ============================================================
// HOOKS — Mutations
// ============================================================

export function useCreateSaveState() {
  return useMutation(CREATE_SAVE_STATE, {
    refetchQueries: ['GetUserSaveStates'],
  });
}

export function useDeleteSaveState() {
  return useMutation(DELETE_SAVE_STATE, {
    refetchQueries: ['GetUserSaveStates'],
  });
}

export function useStartPlaySession() {
  return useMutation(START_PLAY_SESSION);
}

export function useEndPlaySession() {
  return useMutation(END_PLAY_SESSION);
}

export function useAddGameFromCatalog() {
  return useMutation(ADD_GAME_FROM_CATALOG, {
    refetchQueries: ['GetROMsBySystem'],
  });
}

export function useUpdateROMStatus() {
  return useMutation(UPDATE_ROM_STATUS);
}

export function useTogglePinROM() {
  return useMutation(TOGGLE_PIN_ROM);
}

export function useDeleteROM() {
  return useMutation(DELETE_ROM, {
    refetchQueries: ['GetROMsBySystem'],
  });
}
