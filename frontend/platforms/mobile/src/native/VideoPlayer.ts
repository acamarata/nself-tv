import { NativeModules, Platform } from 'react-native';

interface VideoPlayerNativeModule {
  initPlayer(streamUrl: string): Promise<string>;
  play(playerId: string): Promise<void>;
  pause(playerId: string): Promise<void>;
  seek(playerId: string, position: number): Promise<void>;
  getPosition(playerId: string): Promise<number>;
  getDuration(playerId: string): Promise<number>;
  setPlaybackRate(playerId: string, rate: number): Promise<void>;
  destroy(playerId: string): Promise<void>;
}

const LINKING_ERROR =
  `The package 'react-native-video-player' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- Run 'pod install' in ios/ directory\n", default: '' }) +
  Platform.select({ android: "- Run 'gradle sync' in Android Studio\n", default: '' }) +
  '- Rebuild the app';

// Native module proxy with fallback for development
const VideoPlayerModule: VideoPlayerNativeModule =
  NativeModules.VideoPlayerModule ??
  new Proxy(
    {},
    {
      get() {
        throw new Error(LINKING_ERROR);
      },
    }
  );

export class VideoPlayer {
  private playerId: string | null = null;

  async initialize(streamUrl: string): Promise<void> {
    this.playerId = await VideoPlayerModule.initPlayer(streamUrl);
  }

  async play(): Promise<void> {
    if (!this.playerId) throw new Error('Player not initialized');
    await VideoPlayerModule.play(this.playerId);
  }

  async pause(): Promise<void> {
    if (!this.playerId) throw new Error('Player not initialized');
    await VideoPlayerModule.pause(this.playerId);
  }

  async seek(position: number): Promise<void> {
    if (!this.playerId) throw new Error('Player not initialized');
    await VideoPlayerModule.seek(this.playerId, position);
  }

  async getPosition(): Promise<number> {
    if (!this.playerId) throw new Error('Player not initialized');
    return await VideoPlayerModule.getPosition(this.playerId);
  }

  async getDuration(): Promise<number> {
    if (!this.playerId) throw new Error('Player not initialized');
    return await VideoPlayerModule.getDuration(this.playerId);
  }

  async setPlaybackRate(rate: number): Promise<void> {
    if (!this.playerId) throw new Error('Player not initialized');
    await VideoPlayerModule.setPlaybackRate(this.playerId, rate);
  }

  async destroy(): Promise<void> {
    if (!this.playerId) throw new Error('Player not initialized');
    await VideoPlayerModule.destroy(this.playerId);
    this.playerId = null;
  }
}
