import type { PlayOptions, PlayerState, PlayerStatus, SubtitleTrack, AudioTrack } from '../types';
import type { PlayerError } from '../types/player';

export type { PlayerError };

/**
 * Platform storage adapter interface
 * Implementations: Web (localStorage), React Native (AsyncStorage), Tauri (Store API)
 */
export interface PlatformStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Platform video player adapter interface
 * Implementations: Web (HLS.js), iOS (AVPlayer), Android (ExoPlayer), Desktop (HTML5)
 */
export interface PlatformPlayer {
  /**
   * Initialize player with container element (web) or view ref (native)
   */
  initialize(container: any): Promise<void>;

  /**
   * Play video from URL
   */
  play(url: string, options?: PlayOptions): Promise<void>;

  /**
   * Pause playback
   */
  pause(): Promise<void>;

  /**
   * Seek to position in seconds
   */
  seek(position: number): Promise<void>;

  /**
   * Stop playback and release resources
   */
  stop(): Promise<void>;

  /**
   * Get current player state
   */
  getState(): PlayerState;

  /**
   * Get detailed player status
   */
  getStatus(): PlayerStatus;

  /**
   * Set volume (0.0 - 1.0)
   */
  setVolume(volume: number): Promise<void>;

  /**
   * Set muted state
   */
  setMuted(muted: boolean): Promise<void>;

  /**
   * Get available subtitle tracks
   */
  getSubtitleTracks(): SubtitleTrack[];

  /**
   * Set active subtitle track (or -1 to disable)
   */
  setSubtitleTrack(trackId: number): Promise<void>;

  /**
   * Get available audio tracks
   */
  getAudioTracks(): AudioTrack[];

  /**
   * Set active audio track
   */
  setAudioTrack(trackId: number): Promise<void>;

  /**
   * Register event listeners
   */
  on(event: PlayerEvent, handler: (data?: any) => void): void;

  /**
   * Unregister event listeners
   */
  off(event: PlayerEvent, handler: (data?: any) => void): void;

  /**
   * Destroy player instance
   */
  destroy(): Promise<void>;
}

export type PlayerEvent =
  | 'play'
  | 'pause'
  | 'timeupdate'
  | 'ended'
  | 'error'
  | 'buffering'
  | 'ready'
  | 'qualitychange'
  | 'subtitlechange'
  | 'audiochange';

/**
 * Platform push notification adapter interface
 * Implementations: Web (Web Push API), iOS (APNs), Android (FCM)
 */
export interface PlatformNotifications {
  /**
   * Request notification permission from user
   */
  requestPermission(): Promise<boolean>;

  /**
   * Register device token with backend
   */
  registerToken(token: string): Promise<void>;

  /**
   * Handle incoming notification
   */
  onNotification(handler: (notification: Notification) => void): void;

  /**
   * Remove notification handler
   */
  offNotification(handler: (notification: Notification) => void): void;

  /**
   * Show local notification
   */
  showLocalNotification(notification: LocalNotification): Promise<void>;

  /**
   * Cancel notification by ID
   */
  cancelNotification(id: string): Promise<void>;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
}

export interface LocalNotification extends Notification {
  scheduledTime?: Date;
}

/**
 * Platform file system adapter interface
 * Implementations: Web (none), React Native (RNFS), Tauri (fs API)
 */
export interface PlatformFileSystem {
  /**
   * Download file from URL to local path
   */
  downloadFile(url: string, path: string, onProgress?: (progress: number) => void): Promise<void>;

  /**
   * Delete file at path
   */
  deleteFile(path: string): Promise<void>;

  /**
   * Get file size in bytes
   */
  getFileSize(path: string): Promise<number>;

  /**
   * Get available storage space in bytes
   */
  getAvailableStorage(): Promise<number>;

  /**
   * Check if file exists
   */
  fileExists(path: string): Promise<boolean>;

  /**
   * Get file info
   */
  getFileInfo(path: string): Promise<FileInfo>;
}

export interface FileInfo {
  path: string;
  size: number;
  createdAt: Date;
  modifiedAt: Date;
}

/**
 * Platform biometric authentication adapter interface
 * Implementations: Web (none), iOS (Face ID/Touch ID), Android (BiometricPrompt)
 */
export interface PlatformBiometrics {
  /**
   * Check if biometric authentication is available on device
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get available biometric types
   */
  getAvailableTypes(): Promise<BiometricType[]>;

  /**
   * Authenticate user with biometrics
   */
  authenticate(reason: string): Promise<boolean>;
}

export type BiometricType = 'fingerprint' | 'face' | 'iris' | 'none';

/**
 * Platform casting adapter interface
 * Implementations: Web (Chromecast), iOS (AirPlay), Android (Chromecast)
 */
export interface PlatformCasting {
  /**
   * Check if casting is available
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get available cast devices
   */
  getDevices(): Promise<CastDevice[]>;

  /**
   * Connect to cast device
   */
  connect(deviceId: string): Promise<void>;

  /**
   * Disconnect from cast device
   */
  disconnect(): Promise<void>;

  /**
   * Load media on cast device
   */
  loadMedia(url: string, metadata: CastMediaMetadata): Promise<void>;

  /**
   * Control playback on cast device
   */
  play(): Promise<void>;
  pause(): Promise<void>;
  seek(position: number): Promise<void>;
  stop(): Promise<void>;

  /**
   * Get cast session status
   */
  getStatus(): Promise<CastStatus | null>;

  /**
   * Register cast event listeners
   */
  on(event: CastEvent, handler: (data?: any) => void): void;
  off(event: CastEvent, handler: (data?: any) => void): void;
}

export interface CastDevice {
  id: string;
  name: string;
  type: 'chromecast' | 'airplay';
}

export interface CastMediaMetadata {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  contentType: string;
}

export interface CastStatus {
  connected: boolean;
  deviceName?: string;
  playerState: PlayerState;
  currentTime: number;
  duration: number;
}

export type CastEvent = 'connected' | 'disconnected' | 'statechange' | 'error';
