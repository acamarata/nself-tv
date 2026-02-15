export interface PlayOptions {
  autoplay?: boolean;
  startPosition?: number;
  subtitleTrack?: number;
  audioTrack?: number;
  quality?: string;
}

export type PlayerState = 'idle' | 'loading' | 'playing' | 'paused' | 'buffering' | 'ended' | 'error';

export interface PlayerStatus {
  state: PlayerState;
  currentTime: number;
  duration: number;
  buffered: number;
  volume: number;
  muted: boolean;
  quality?: string;
  subtitleTrack?: number;
  audioTrack?: number;
}

export interface PlayerError {
  code: string;
  message: string;
  fatal: boolean;
  recoverable: boolean;
}

export interface Track {
  id: number;
  language: string;
  label: string;
  enabled: boolean;
}

export interface SubtitleTrack extends Track {
  format: 'vtt' | 'srt';
}

export interface AudioTrack extends Track {
  codec: string;
  channels: number;
}
