/**
 * Content acquisition types for Phase 6.
 * Used by acquisition, VPN, torrent, and subtitle plugin clients.
 */

// -- Download State Machine --

export type DownloadState =
  | 'created'
  | 'vpn_connecting'
  | 'searching'
  | 'downloading'
  | 'encoding'
  | 'subtitles'
  | 'uploading'
  | 'finalizing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type FeedStatus = 'active' | 'dormant' | 'inactive' | 'error';

export type MovieStatus = 'monitoring' | 'released' | 'downloading' | 'completed' | 'failed';

export type QualityProfile = 'minimal' | 'balanced' | '4k_premium';

export type RuleAction = 'auto_download' | 'notify' | 'skip';

export type FileQuality =
  | 'remux'
  | 'bluray'
  | 'web-dl'
  | 'webrip'
  | 'hdtv'
  | 'unknown';

// -- Core Entities --

export interface TVSubscription {
  id: string;
  familyId: string;
  showName: string;
  feedUrl: string;
  qualityProfile: QualityProfile;
  autoDownload: boolean;
  status: FeedStatus;
  lastChecked: string | null;
  nextCheck: string | null;
  episodeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MovieMonitoring {
  id: string;
  familyId: string;
  title: string;
  tmdbId: string | null;
  releaseDate: string | null;
  status: MovieStatus;
  qualityProfile: QualityProfile;
  posterUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RSSFeed {
  id: string;
  title: string;
  url: string;
  status: FeedStatus;
  lastChecked: string | null;
  errorCount: number;
  itemCount: number;
  checkIntervalMinutes: number;
  createdAt: string;
}

export interface FeedValidation {
  valid: boolean;
  title: string | null;
  itemCount: number;
  sampleItems: RSSFeedItem[];
  errors: string[];
}

export interface RSSFeedItem {
  title: string;
  publishedAt: string;
  magnetUri: string | null;
  size: number | null;
  quality: FileQuality;
  season: number | null;
  episode: number | null;
}

export interface Download {
  id: string;
  familyId: string;
  contentType: 'episode' | 'movie';
  title: string;
  state: DownloadState;
  progress: number;
  downloadSpeed: number | null;
  uploadSpeed: number | null;
  eta: number | null;
  size: number | null;
  downloadedBytes: number | null;
  sourceUrl: string | null;
  quality: FileQuality;
  error: string | null;
  retryCount: number;
  stateHistory: DownloadStateEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface DownloadStateEntry {
  state: DownloadState;
  timestamp: string;
  duration: number | null;
  error: string | null;
}

export interface DownloadRule {
  id: string;
  familyId: string;
  name: string;
  priority: number;
  conditions: Record<string, unknown>;
  action: RuleAction;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TorrentSource {
  id: string;
  name: string;
  domain: string;
  activeFrom: string;
  retiredAt: string | null;
  isActive: boolean;
  trustScore: number;
}

export interface SeedingStats {
  id: string;
  torrentHash: string;
  name: string;
  ratio: number;
  uploaded: number;
  downloaded: number;
  seedingDuration: number;
  isFavorite: boolean;
  seedRatioLimit: number;
  seedTimeLimitMinutes: number;
}

export interface SeedingAggregate {
  totalUploaded: number;
  totalDownloaded: number;
  averageRatio: number;
  activeTorrents: number;
  completedTorrents: number;
}

export interface VPNStatus {
  connected: boolean;
  provider: string | null;
  server: string | null;
  protocol: string | null;
  ip: string | null;
  country: string | null;
  uptime: number | null;
  killSwitchActive: boolean;
}

export interface BandwidthConfig {
  downloadLimitKbps: number;
  uploadLimitKbps: number;
  scheduleEnabled: boolean;
  schedule: BandwidthScheduleEntry[];
}

export interface BandwidthScheduleEntry {
  dayOfWeek: number;
  startHour: number;
  endHour: number;
  downloadLimitKbps: number;
  uploadLimitKbps: number;
}

// -- Request/Response Types --

export interface SubscribeRequest {
  showName: string;
  feedUrl: string;
  qualityProfile: QualityProfile;
  autoDownload: boolean;
  backfill?: boolean;
}

export interface MonitorMovieRequest {
  title: string;
  tmdbId?: string;
  qualityProfile: QualityProfile;
}

export interface CreateDownloadRequest {
  contentType: 'episode' | 'movie';
  title: string;
  sourceUrl: string;
  quality: FileQuality;
}

export interface CreateRuleRequest {
  name: string;
  priority: number;
  conditions: Record<string, unknown>;
  action: RuleAction;
}

export interface CalendarEntry {
  date: string;
  movies: MovieMonitoring[];
}

export interface AcquisitionDashboard {
  activeDownloads: number;
  completedToday: number;
  failedThisWeek: number;
  activeSubscriptions: number;
  recentActivity: ActivityEntry[];
}

export interface ActivityEntry {
  id: string;
  type: 'download_complete' | 'download_failed' | 'subscription_added' | 'movie_released' | 'episode_detected';
  title: string;
  timestamp: string;
  details: string | null;
}
