/**
 * Hook for games GraphQL queries and mutations
 */

import { useQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';

// GraphQL queries
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
      order_by: {title: asc}
    ) {
      id
      title
      cover_url
      year
      genre
      publisher
      region
      file_size
      pinned
      game_system {
        name
        full_name
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

// GraphQL mutations
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
  mutation EndPlaySession($session_id: uuid!, $duration_seconds: Int!) {
    update_game_play_sessions_by_pk(
      pk_columns: {id: $session_id}
      _set: {ended_at: "now()", duration_seconds: $duration_seconds}
    ) {
      id
    }
  }
`;

// Hooks
export function useGameSystems() {
  return useQuery(GET_GAME_SYSTEMS);
}

export function useROMsBySystem(systemId: string) {
  return useQuery(GET_ROMS_BY_SYSTEM, {
    variables: { system_id: systemId },
    skip: !systemId,
  });
}

export function useUserSaveStates(romId: string) {
  return useQuery(GET_USER_SAVE_STATES, {
    variables: { rom_id: romId },
    skip: !romId,
  });
}

export function useRecentSessions(limit = 10) {
  return useQuery(GET_RECENT_SESSIONS, {
    variables: { limit },
  });
}

export function useCreateSaveState() {
  return useMutation(CREATE_SAVE_STATE);
}

export function useStartPlaySession() {
  return useMutation(START_PLAY_SESSION);
}

export function useEndPlaySession() {
  return useMutation(END_PLAY_SESSION);
}
