export interface Playlist {
  id: string;
  familyId: string;
  profileId?: string;
  name: string;
  description?: string;
  isPublic: boolean;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistItem {
  playlistId: string;
  mediaId: string;
  position: number;
  addedAt: string;
}

export interface Watchlist extends Playlist {
  name: 'Watchlist';
}
