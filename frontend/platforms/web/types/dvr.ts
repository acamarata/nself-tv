export type EventStatus = 'pending' | 'scheduled' | 'active' | 'recording' | 'finalizing' | 'complete' | 'failed';
export type RecordingStatus = 'scheduled' | 'recording' | 'processing' | 'ready' | 'failed';

export interface LiveChannel {
  id: string;
  number: string;
  name: string;
  logoUrl: string | null;
  genre: string;
  signalQuality: number; // 0-100
  isFavorite: boolean;
}

export interface Program {
  id: string;
  channelId: string;
  title: string;
  description: string;
  startTime: string; // ISO
  endTime: string;   // ISO
  genre: string;
  isNew: boolean;
  isLive: boolean;
  seasonNumber?: number;
  episodeNumber?: number;
}

export interface LiveEvent {
  id: string;
  channelId: string;
  title: string;
  status: EventStatus;
  startTime: string;
  endTime: string;
  league?: string;
  teams?: { home: string; away: string };
  score?: { home: number; away: number };
}

export interface DVRRecording {
  id: string;
  eventId: string;
  title: string;
  channelName: string;
  status: RecordingStatus;
  startTime: string;
  endTime: string;
  duration: number; // seconds
  size: number; // bytes
  hasCommercials: boolean;
  commercialMarkers: CommercialMarker[];
}

export interface CommercialMarker {
  startMs: number;
  endMs: number;
  confidence: number;
  source: 'comskip' | 'manual';
}

export interface AntBoxDevice {
  id: string;
  name: string;
  type: 'hdhomerun' | 'antenna' | 'custom';
  status: 'online' | 'offline' | 'degraded';
  ip: string;
  tunerCount: number;
  activeTuners: number;
  signalStrength: number;
  lastHeartbeat: string;
  firmware: string;
  uptime: number; // seconds
}
