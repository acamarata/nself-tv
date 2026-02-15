export interface WatchProgress {
  mediaId: string;
  profileId: string;
  currentTime: number;
  duration: number;
  progress: number;
  completed: boolean;
  lastWatchedAt: string;
  deviceId?: string;
}

export interface ContinueWatching {
  media: {
    id: string;
    type: string;
    title: string;
    posterUrl?: string;
    showTitle?: string;
    seasonNumber?: number;
    episodeNumber?: number;
  };
  progress: WatchProgress;
}
