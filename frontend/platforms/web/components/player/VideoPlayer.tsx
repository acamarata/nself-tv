'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import Hls, { Events } from 'hls.js';
import type { ErrorData, LevelSwitchedData } from 'hls.js';
import { createHlsInstance, isHlsSupported, isNativeHlsSupported } from '@/lib/player/hls-config';

/** Public API exposed via ref */
export interface VideoPlayerHandle {
  /** Start playback */
  play: () => void;
  /** Pause playback */
  pause: () => void;
  /** Seek to a specific time in seconds */
  seek: (time: number) => void;
  /** Set volume (0-1) */
  setVolume: (v: number) => void;
  /** Toggle mute state */
  toggleMute: () => void;
  /** Toggle fullscreen mode */
  toggleFullscreen: () => void;
  /** Get the underlying video element */
  getVideoElement: () => HTMLVideoElement | null;
}

export interface VideoPlayerProps {
  /** HLS manifest URL or direct video source */
  src: string;
  /** Poster image URL */
  poster?: string;
  /** Whether to autoplay on load */
  autoplay?: boolean;
  /** Start playback at this position in seconds */
  startPosition?: number;
  /** Called periodically with current playback time */
  onProgress?: (currentTime: number, duration: number) => void;
  /** Called when playback reaches the end */
  onEnded?: () => void;
  /** Called when a playback error occurs */
  onError?: (error: { type: string; details: string; fatal: boolean }) => void;
  /** Called when the quality level changes */
  onQualityChange?: (level: number, label: string) => void;
  /** Called when the HLS instance and video element are ready */
  onHlsReady?: (hls: Hls | null, videoElement: HTMLVideoElement) => void;
  /** Additional CSS class names */
  className?: string;
  /** Child elements rendered inside the player container (e.g. controls overlay) */
  children?: React.ReactNode;
}

const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  (
    {
      src,
      poster,
      autoplay = false,
      startPosition,
      onProgress,
      onEnded,
      onError,
      onQualityChange,
      onHlsReady,
      className = '',
      children,
    },
    ref,
  ) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [playing, setPlaying] = useState(false);
    const [buffering, setBuffering] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ---- Imperative handle ----

    const play = useCallback(() => {
      videoRef.current?.play().catch(() => {
        // Autoplay may be blocked by browser policy
      });
    }, []);

    const pause = useCallback(() => {
      videoRef.current?.pause();
    }, []);

    const seek = useCallback((time: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
      }
    }, []);

    const setVolumeValue = useCallback((v: number) => {
      const clamped = Math.min(1, Math.max(0, v));
      if (videoRef.current) {
        videoRef.current.volume = clamped;
      }
      setVolume(clamped);
    }, []);

    const toggleMute = useCallback(() => {
      if (videoRef.current) {
        videoRef.current.muted = !videoRef.current.muted;
        setMuted(videoRef.current.muted);
      }
    }, []);

    const toggleFullscreen = useCallback(() => {
      const container = containerRef.current;
      if (!container) return;

      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        container.requestFullscreen().catch(() => {});
      }
    }, []);

    useImperativeHandle(ref, () => ({
      play,
      pause,
      seek,
      setVolume: setVolumeValue,
      toggleMute,
      toggleFullscreen,
      getVideoElement: () => videoRef.current,
    }));

    // ---- Fullscreen change listener ----

    useEffect(() => {
      const handleFullscreenChange = () => {
        setFullscreen(!!document.fullscreenElement);
      };

      document.addEventListener('fullscreenchange', handleFullscreenChange);
      return () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
      };
    }, []);

    // ---- HLS setup / teardown ----

    useEffect(() => {
      const video = videoRef.current;
      if (!video || !src) return;

      // Clean up previous instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      setError(null);
      setBuffering(true);

      if (isHlsSupported()) {
        const hls = createHlsInstance();
        hlsRef.current = hls;

        hls.loadSource(src);
        hls.attachMedia(video);

        hls.on(Events.MANIFEST_PARSED, () => {
          setBuffering(false);
          if (startPosition != null && startPosition > 0) {
            video.currentTime = startPosition;
          }
          if (autoplay) {
            video.play().catch(() => {});
          }
        });

        hls.on(Events.ERROR, (_event: Events.ERROR, data: ErrorData) => {
          if (data.fatal) {
            setError(data.details);
            onError?.({
              type: data.type.toString(),
              details: data.details,
              fatal: true,
            });

            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                break;
            }
          } else {
            onError?.({
              type: data.type.toString(),
              details: data.details,
              fatal: false,
            });
          }
        });

        hls.on(Events.LEVEL_SWITCHED, (_event: Events.LEVEL_SWITCHED, data: LevelSwitchedData) => {
          const level = hls.levels[data.level];
          if (level) {
            const label = level.height ? `${level.height}p` : `Level ${data.level}`;
            onQualityChange?.(data.level, label);
          }
        });

        onHlsReady?.(hls, video);
      } else if (isNativeHlsSupported()) {
        // Safari / iOS: native HLS support
        video.src = src;

        video.addEventListener(
          'loadedmetadata',
          () => {
            setBuffering(false);
            if (startPosition != null && startPosition > 0) {
              video.currentTime = startPosition;
            }
            if (autoplay) {
              video.play().catch(() => {});
            }
          },
          { once: true },
        );

        onHlsReady?.(null, video);
      } else {
        // Fallback: try direct source
        video.src = src;
        setBuffering(false);
        onHlsReady?.(null, video);
      }

      return () => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
      // Intentionally only re-run when src changes
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src]);

    // ---- Video element event handlers ----

    const handlePlay = useCallback(() => setPlaying(true), []);
    const handlePause = useCallback(() => setPlaying(false), []);

    const handleTimeUpdate = useCallback(() => {
      const video = videoRef.current;
      if (!video) return;
      setCurrentTime(video.currentTime);
      onProgress?.(video.currentTime, video.duration);
    }, [onProgress]);

    const handleLoadedMetadata = useCallback(() => {
      const video = videoRef.current;
      if (!video) return;
      setDuration(video.duration);
      setVolume(video.volume);
      setMuted(video.muted);
    }, []);

    const handleWaiting = useCallback(() => setBuffering(true), []);
    const handlePlaying = useCallback(() => setBuffering(false), []);

    const handleEnded = useCallback(() => {
      setPlaying(false);
      onEnded?.();
    }, [onEnded]);

    const handleVideoError = useCallback(() => {
      const video = videoRef.current;
      if (!video?.error) return;
      const errorMessage = video.error.message || `Media error code ${video.error.code}`;
      setError(errorMessage);
      onError?.({
        type: 'MediaError',
        details: errorMessage,
        fatal: true,
      });
    }, [onError]);

    const handleVolumeChange = useCallback(() => {
      const video = videoRef.current;
      if (!video) return;
      setVolume(video.volume);
      setMuted(video.muted);
    }, []);

    return (
      <div
        ref={containerRef}
        className={`relative bg-black overflow-hidden ${className}`}
        data-playing={playing}
        data-buffering={buffering}
        data-fullscreen={fullscreen}
        data-error={error ? 'true' : undefined}
      >
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          poster={poster}
          playsInline
          onPlay={handlePlay}
          onPause={handlePause}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onWaiting={handleWaiting}
          onPlaying={handlePlaying}
          onEnded={handleEnded}
          onError={handleVideoError}
          onVolumeChange={handleVolumeChange}
        />

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center text-white px-6">
              <p className="text-lg font-semibold mb-2">Playback Error</p>
              <p className="text-sm text-gray-400">{error}</p>
            </div>
          </div>
        )}

        {children}
      </div>
    );
  },
);

VideoPlayer.displayName = 'VideoPlayer';

export { VideoPlayer };
