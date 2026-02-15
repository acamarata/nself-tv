/**
 * Hook for music GraphQL queries and mutations.
 * Covers artists, albums, tracks, playlists, progress, and subscriptions.
 */

import { useQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';

// ============================================================
// QUERIES
// ============================================================

const GET_ARTISTS = gql`
  query GetArtists($limit: Int = 50) {
    music_artists(
      order_by: {name: asc}
      limit: $limit
    ) {
      id
      name
      artwork_url
      genres
      albums_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

const GET_ARTIST_DETAIL = gql`
  query GetArtistDetail($id: uuid!) {
    music_artists_by_pk(id: $id) {
      id
      name
      sort_name
      biography
      artwork_url
      genres
      tags
      musicbrainz_id
      albums(order_by: {year: desc}) {
        id
        title
        year
        cover_url
        genre
        album_type
        track_count
        duration_seconds
      }
    }
  }
`;

const GET_ALBUMS = gql`
  query GetAlbums($limit: Int = 50) {
    music_albums(
      order_by: {created_at: desc}
      limit: $limit
    ) {
      id
      title
      year
      genre
      album_type
      cover_url
      track_count
      duration_seconds
      artist {
        id
        name
      }
    }
  }
`;

const GET_ALBUM_DETAIL = gql`
  query GetAlbumDetail($id: uuid!) {
    music_albums_by_pk(id: $id) {
      id
      title
      year
      genre
      album_type
      cover_url
      track_count
      duration_seconds
      release_date
      metadata
      artist {
        id
        name
        artwork_url
      }
      tracks(order_by: [{disc_number: asc}, {track_number: asc}]) {
        id
        title
        track_number
        disc_number
        duration_seconds
        file_path
        file_format
        explicit
      }
    }
  }
`;

const SEARCH_MUSIC = gql`
  query SearchMusic($query: String!) {
    music_artists(
      where: {
        _or: [
          {name: {_ilike: $query}}
          {biography: {_ilike: $query}}
        ]
      }
      order_by: {name: asc}
      limit: 20
    ) {
      id
      name
      artwork_url
      genres
    }
    music_albums(
      where: {
        _or: [
          {title: {_ilike: $query}}
          {genre: {_ilike: $query}}
        ]
      }
      order_by: {title: asc}
      limit: 20
    ) {
      id
      title
      year
      cover_url
      artist {
        id
        name
      }
    }
  }
`;

const GET_USER_PLAYLISTS = gql`
  query GetUserPlaylists {
    music_playlists(order_by: {updated_at: desc}) {
      id
      name
      description
      cover_url
      track_count
      total_duration_seconds
      is_public
      updated_at
    }
  }
`;

const GET_PLAYLIST_DETAIL = gql`
  query GetPlaylistDetail($id: uuid!) {
    music_playlists_by_pk(id: $id) {
      id
      name
      description
      cover_url
      track_count
      total_duration_seconds
      is_public
      playlist_tracks(order_by: {position: asc}) {
        id
        position
        track {
          id
          title
          track_number
          duration_seconds
          file_path
          album {
            id
            title
            cover_url
          }
          artist {
            id
            name
          }
        }
      }
    }
  }
`;

const GET_RECENT_LISTENING = gql`
  query GetRecentListening($limit: Int = 20) {
    music_progress(
      order_by: {last_played_at: desc}
      limit: $limit
    ) {
      id
      play_count
      last_played_at
      track {
        id
        title
        duration_seconds
        album {
          id
          title
          cover_url
        }
        artist {
          id
          name
        }
      }
    }
  }
`;

const GET_USER_SUBSCRIPTIONS = gql`
  query GetMusicSubscriptions {
    music_subscriptions(order_by: {created_at: desc}) {
      id
      auto_download
      notify_new_releases
      artist {
        id
        name
        artwork_url
        genres
      }
    }
  }
`;

// ============================================================
// MUTATIONS
// ============================================================

const ADD_ARTIST = gql`
  mutation AddArtist(
    $family_id: uuid!
    $name: String!
    $sort_name: String
    $musicbrainz_id: String
    $biography: String
    $artwork_url: String
    $genres: _text
  ) {
    insert_music_artists_one(
      object: {
        family_id: $family_id
        name: $name
        sort_name: $sort_name
        musicbrainz_id: $musicbrainz_id
        biography: $biography
        artwork_url: $artwork_url
        genres: $genres
      }
      on_conflict: {constraint: music_artists_family_id_name_key, update_columns: [artwork_url, biography, genres]}
    ) {
      id
      name
    }
  }
`;

const ADD_ALBUM = gql`
  mutation AddAlbum(
    $family_id: uuid!
    $artist_id: uuid!
    $title: String!
    $year: Int
    $genre: String
    $album_type: String
    $cover_url: String
    $musicbrainz_id: String
    $track_count: Int
    $duration_seconds: Int
  ) {
    insert_music_albums_one(
      object: {
        family_id: $family_id
        artist_id: $artist_id
        title: $title
        year: $year
        genre: $genre
        album_type: $album_type
        cover_url: $cover_url
        musicbrainz_id: $musicbrainz_id
        track_count: $track_count
        duration_seconds: $duration_seconds
      }
    ) {
      id
      title
    }
  }
`;

const CREATE_PLAYLIST = gql`
  mutation CreatePlaylist($family_id: uuid!, $name: String!, $description: String) {
    insert_music_playlists_one(
      object: {
        family_id: $family_id
        name: $name
        description: $description
      }
    ) {
      id
      name
    }
  }
`;

const ADD_TO_PLAYLIST = gql`
  mutation AddToPlaylist($playlist_id: uuid!, $track_id: uuid!, $position: Int!) {
    insert_music_playlist_tracks_one(
      object: {
        playlist_id: $playlist_id
        track_id: $track_id
        position: $position
      }
    ) {
      id
    }
  }
`;

const SAVE_MUSIC_PROGRESS = gql`
  mutation SaveMusicProgress($track_id: uuid!, $position_seconds: Int!, $play_count: Int!) {
    insert_music_progress_one(
      object: {
        track_id: $track_id
        position_seconds: $position_seconds
        play_count: $play_count
      }
      on_conflict: {
        constraint: music_progress_user_id_track_id_key
        update_columns: [position_seconds, play_count, last_played_at]
      }
    ) {
      id
    }
  }
`;

const SUBSCRIBE_TO_ARTIST = gql`
  mutation SubscribeToArtist($artist_id: uuid!) {
    insert_music_subscriptions_one(
      object: {artist_id: $artist_id, auto_download: true, notify_new_releases: true}
      on_conflict: {constraint: music_subscriptions_user_id_artist_id_key, update_columns: []}
    ) {
      id
    }
  }
`;

const UNSUBSCRIBE_FROM_ARTIST = gql`
  mutation UnsubscribeFromArtist($artist_id: uuid!) {
    delete_music_subscriptions(where: {artist_id: {_eq: $artist_id}}) {
      affected_rows
    }
  }
`;

const DELETE_PLAYLIST = gql`
  mutation DeletePlaylist($id: uuid!) {
    delete_music_playlists_by_pk(id: $id) {
      id
    }
  }
`;

// ============================================================
// HOOKS
// ============================================================

export function useArtists(limit = 50) {
  return useQuery(GET_ARTISTS, { variables: { limit } });
}

export function useArtistDetail(id: string) {
  return useQuery(GET_ARTIST_DETAIL, {
    variables: { id },
    skip: !id,
  });
}

export function useAlbums(limit = 50) {
  return useQuery(GET_ALBUMS, { variables: { limit } });
}

export function useAlbumDetail(id: string) {
  return useQuery(GET_ALBUM_DETAIL, {
    variables: { id },
    skip: !id,
  });
}

export function useSearchMusic(query: string) {
  return useQuery(SEARCH_MUSIC, {
    variables: { query: `%${query}%` },
    skip: !query || query.length < 2,
  });
}

export function useUserPlaylists() {
  return useQuery(GET_USER_PLAYLISTS);
}

export function usePlaylistDetail(id: string) {
  return useQuery(GET_PLAYLIST_DETAIL, {
    variables: { id },
    skip: !id,
  });
}

export function useRecentListening(limit = 20) {
  return useQuery(GET_RECENT_LISTENING, { variables: { limit } });
}

export function useMusicSubscriptions() {
  return useQuery(GET_USER_SUBSCRIPTIONS);
}

export function useAddArtist() {
  return useMutation(ADD_ARTIST, {
    refetchQueries: ['GetArtists'],
  });
}

export function useAddAlbum() {
  return useMutation(ADD_ALBUM, {
    refetchQueries: ['GetAlbums', 'GetArtistDetail'],
  });
}

export function useCreatePlaylist() {
  return useMutation(CREATE_PLAYLIST, {
    refetchQueries: ['GetUserPlaylists'],
  });
}

export function useAddToPlaylist() {
  return useMutation(ADD_TO_PLAYLIST, {
    refetchQueries: ['GetPlaylistDetail'],
  });
}

export function useSaveMusicProgress() {
  return useMutation(SAVE_MUSIC_PROGRESS);
}

export function useSubscribeToArtist() {
  return useMutation(SUBSCRIBE_TO_ARTIST, {
    refetchQueries: ['GetMusicSubscriptions'],
  });
}

export function useUnsubscribeFromArtist() {
  return useMutation(UNSUBSCRIBE_FROM_ARTIST, {
    refetchQueries: ['GetMusicSubscriptions'],
  });
}

export function useDeletePlaylist() {
  return useMutation(DELETE_PLAYLIST, {
    refetchQueries: ['GetUserPlaylists'],
  });
}
