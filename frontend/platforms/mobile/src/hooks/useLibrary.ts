/**
 * Hook for library content (playlists, favorites, watch later)
 */

import { useQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';

const GET_USER_PLAYLISTS = gql`
  query GetUserPlaylists {
    playlists(
      order_by: { updated_at: desc }
    ) {
      id
      name
      description
      is_public
      item_count
      created_at
      updated_at
      playlist_items(limit: 1, order_by: { position: asc }) {
        media_item {
          poster_url
        }
      }
    }
  }
`;

const GET_PLAYLIST_ITEMS = gql`
  query GetPlaylistItems($playlist_id: uuid!) {
    playlist_items(
      where: { playlist_id: { _eq: $playlist_id } }
      order_by: { position: asc }
    ) {
      id
      position
      added_at
      media_item {
        id
        title
        poster_url
        backdrop_url
        type
        duration_seconds
        year
        user_rating
      }
    }
  }
`;

const GET_FAVORITES = gql`
  query GetFavorites {
    playlists(
      where: { name: { _eq: "Favorites" } }
    ) {
      id
      playlist_items(order_by: { added_at: desc }) {
        id
        added_at
        media_item {
          id
          title
          poster_url
          backdrop_url
          type
          genres
          year
          user_rating
        }
      }
    }
  }
`;

const GET_WATCH_LATER = gql`
  query GetWatchLater {
    playlists(
      where: { name: { _eq: "Watch Later" } }
    ) {
      id
      playlist_items(order_by: { added_at: desc }) {
        id
        added_at
        media_item {
          id
          title
          poster_url
          backdrop_url
          type
          duration_seconds
          year
        }
      }
    }
  }
`;

const GET_DOWNLOADED_CONTENT = gql`
  query GetDownloadedContent {
    media_items(
      where: {
        watch_progress: {
          downloaded: { _eq: true }
        }
      }
      order_by: { created_at: desc }
    ) {
      id
      title
      poster_url
      backdrop_url
      type
      duration_seconds
      year
    }
  }
`;

const ADD_TO_PLAYLIST = gql`
  mutation AddToPlaylist($playlist_id: uuid!, $media_item_id: uuid!, $position: Int!) {
    insert_playlist_items_one(
      object: {
        playlist_id: $playlist_id
        media_item_id: $media_item_id
        position: $position
      }
    ) {
      id
      position
    }
  }
`;

const REMOVE_FROM_PLAYLIST = gql`
  mutation RemoveFromPlaylist($id: uuid!) {
    delete_playlist_items_by_pk(id: $id) {
      id
    }
  }
`;

export function useUserPlaylists() {
  return useQuery(GET_USER_PLAYLISTS);
}

export function usePlaylistItems(playlistId: string) {
  return useQuery(GET_PLAYLIST_ITEMS, {
    variables: { playlist_id: playlistId },
    skip: !playlistId,
  });
}

export function useFavorites() {
  return useQuery(GET_FAVORITES);
}

export function useWatchLater() {
  return useQuery(GET_WATCH_LATER);
}

export function useDownloadedContent() {
  return useQuery(GET_DOWNLOADED_CONTENT);
}

export function useAddToPlaylist() {
  return useMutation(ADD_TO_PLAYLIST);
}

export function useRemoveFromPlaylist() {
  return useMutation(REMOVE_FROM_PLAYLIST);
}
