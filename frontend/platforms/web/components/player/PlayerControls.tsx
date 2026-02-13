'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Loader2,
} from 'lucide-react';
import { formatTime, timeToPercent } from '@/lib/player/format';

export interface PlayerControlsProps {
  /** Whether playback is currently active */
  playing: boolean;
  /** Whether the player is buffering */
  buffering: boolean;
  /** Current playback position in seconds */
  currentTime: number;
  /** Total media duration in seconds */
  duration: number;
  /** Current volume level (0-1) */
  volume: number;
  /** Whether audio is muted */
  muted: boolean;
  /** Whether the player is in fullscreen mode */
  fullscreen: boolean;
  /** Label for current quality level (e.g. "1080p") */
  qualityLabel?: string;
  /** Called when play is requested */
  onPlay: () => void;
  /** Called when pause is requested */
  onPause: () => void;
  /** Called when user seeks to a specific time in seconds */
  onSeek: (time: number) => void;
  /** Called when volume changes (0-1) */
  onVolumeChange: (volume: number) => void;
  /** Called when mute is toggled */
  onMuteToggle: () => void;
  /** Called when fullscreen is toggled */
  onFullscreenToggle: () => void;
  /** Called when settings button is clicked */
  onSettingsClick?: () => void;
  /** Optional child elements (e.g. trickplay preview) */
  children?: React.ReactNode;
}

const AUTO_HIDE_DELAY = 3000;

/**
 * Player controls overlay with play/pause, timeline, volume, and fullscreen controls.
 *
 * Auto-hides after 3 seconds of inactivity. Reappears on mouse movement or click.
 */
function PlayerControls({
  playing,
  buffering,
  currentTime,
  duration,
  volume,
  muted,
  fullscreen,
  qualityLabel,
  onPlay,
  onPause,
  onSeek,
  onVolumeChange,
  onMuteToggle,
  onFullscreenToggle,
  onSettingsClick,
  children,
}: PlayerControlsProps) {
  const [visible, setVisible] = useState(true);
  const [isVolumeHovered, setIsVolumeHovered] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);

  const progress = timeToPercent(currentTime, duration);
  const effectiveVolume = muted ? 0 : volume;

  // ---- Auto-hide logic ----

  const resetHideTimer = useCallback(() => {
    setVisible(true);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    if (playing) {
      hideTimerRef.current = setTimeout(() => setVisible(false), AUTO_HIDE_DELAY);
    }
  }, [playing]);

  useEffect(() => {
    if (!playing) {
      setVisible(true);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    } else {
      resetHideTimer();
    }

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [playing, resetHideTimer]);

  const handleMouseMove = useCallback(() => {
    resetHideTimer();
  }, [resetHideTimer]);

  const handleContainerClick = useCallback(() => {
    resetHideTimer();
  }, [resetHideTimer]);

  // ---- Timeline scrubber ----

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const bar = progressRef.current;
      if (!bar || !Number.isFinite(duration) || duration <= 0) return;
      const rect = bar.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onSeek(fraction * duration);
    },
    [duration, onSeek],
  );

  const handleProgressMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      setIsSeeking(true);
      handleProgressClick(e);
    },
    [handleProgressClick],
  );

  // Drag-to-seek support
  useEffect(() => {
    if (!isSeeking) return;

    const handleMouseMove = (e: MouseEvent) => {
      const bar = progressRef.current;
      if (!bar || !Number.isFinite(duration) || duration <= 0) return;
      const rect = bar.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onSeek(fraction * duration);
    };

    const handleMouseUp = () => {
      setIsSeeking(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isSeeking, duration, onSeek]);

  // ---- Volume slider ----

  const handleVolumeClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const bar = volumeRef.current;
      if (!bar) return;
      const rect = bar.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onVolumeChange(fraction);
    },
    [onVolumeChange],
  );

  return (
    <div
      className="absolute inset-0 z-10 flex flex-col justify-end select-none"
      onMouseMove={handleMouseMove}
      onClick={handleContainerClick}
    >
      {/* Buffering spinner */}
      {buffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader2 className="h-12 w-12 text-white animate-spin" />
        </div>
      )}

      {/* Center play button when paused and not buffering */}
      {!buffering && !playing && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
          className="absolute inset-0 flex items-center justify-center"
          aria-label="Play"
        >
          <div className="rounded-full bg-black/50 p-4 transition-transform hover:scale-110">
            <Play className="h-12 w-12 text-white fill-white" />
          </div>
        </button>
      )}

      {/* Controls bar */}
      <div
        className={`transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <div className="bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-4 pt-16">
          {/* Timeline scrubber */}
          <div
            ref={progressRef}
            className="group relative h-1 hover:h-2 bg-white/30 rounded-full cursor-pointer transition-all mb-4"
            onMouseDown={handleProgressMouseDown}
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.floor(duration)}
            aria-valuenow={Math.floor(currentTime)}
            tabIndex={0}
          >
            {/* Buffered indicator */}
            <div
              className="absolute inset-y-0 left-0 bg-white/20 rounded-full"
              style={{ width: `${Math.min(100, progress + 10)}%` }}
            />

            {/* Playback progress */}
            <div
              className="absolute inset-y-0 left-0 bg-primary rounded-full"
              style={{ width: `${progress}%` }}
            />

            {/* Scrubber handle */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
            />
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                playing ? onPause() : onPlay();
              }}
              className="text-white hover:text-white/80 transition-colors"
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? (
                <Pause className="w-6 h-6 fill-white" />
              ) : (
                <Play className="w-6 h-6 fill-white" />
              )}
            </button>

            {/* Volume */}
            <div
              className="flex items-center gap-2"
              onMouseEnter={() => setIsVolumeHovered(true)}
              onMouseLeave={() => setIsVolumeHovered(false)}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMuteToggle();
                }}
                className="text-white hover:text-white/80 transition-colors"
                aria-label={muted ? 'Unmute' : 'Mute'}
              >
                {muted || volume === 0 ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>

              <div
                className={`overflow-hidden transition-all duration-200 ${isVolumeHovered ? 'w-20 opacity-100' : 'w-0 opacity-0'}`}
              >
                <div
                  ref={volumeRef}
                  className="w-20 h-1 bg-white/30 rounded-full cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVolumeClick(e);
                  }}
                  role="slider"
                  aria-label="Volume"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(effectiveVolume * 100)}
                  tabIndex={0}
                >
                  <div
                    className="h-full bg-white rounded-full"
                    style={{ width: `${effectiveVolume * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Time Display */}
            <span className="text-white text-xs tabular-nums whitespace-nowrap">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Quality label */}
            {qualityLabel && (
              <span className="text-xs text-white/70 ml-1">{qualityLabel}</span>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Optional children (trickplay preview, etc.) */}
            {children}

            {/* Settings */}
            {onSettingsClick && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSettingsClick();
                }}
                className="text-white hover:text-white/80 transition-colors"
                aria-label="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}

            {/* Fullscreen */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFullscreenToggle();
              }}
              className="text-white hover:text-white/80 transition-colors"
              aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {fullscreen ? (
                <Minimize className="w-5 h-5" />
              ) : (
                <Maximize className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { PlayerControls };
