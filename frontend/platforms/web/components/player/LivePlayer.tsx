'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Loader2,
  SkipForward,
  Radio,
} from 'lucide-react';
import { formatTime } from '@/lib/player/format';
import type { CommercialMarker } from '@/types/dvr';

export interface LiveMetadata {
  channelName: string;
  channelNumber: string;
  programTitle: string;
  teams?: { home: string; away: string };
  score?: { home: number; away: number };
}

export interface LivePlayerProps {
  /** Whether playback is currently active */
  playing: boolean;
  /** Whether the player is buffering */
  buffering: boolean;
  /** Current playback position in seconds */
  currentTime: number;
  /** Total buffered duration in seconds (up to 6h) */
  bufferDuration: number;
  /** Live edge position in seconds */
  liveEdge: number;
  /** Current volume level (0-1) */
  volume: number;
  /** Whether audio is muted */
  muted: boolean;
  /** Whether the player is in fullscreen mode */
  fullscreen: boolean;
  /** Live metadata for the current channel/program */
  metadata: LiveMetadata;
  /** Commercial markers for auto-skip */
  commercialMarkers?: CommercialMarker[];
  /** Called when play is requested */
  onPlay: () => void;
  /** Called when pause is requested */
  onPause: () => void;
  /** Called when user seeks to a specific time in seconds */
  onSeek: (time: number) => void;
  /** Called when user wants to jump to live edge */
  onJumpToLive: () => void;
  /** Called when volume changes (0-1) */
  onVolumeChange: (volume: number) => void;
  /** Called when mute is toggled */
  onMuteToggle: () => void;
  /** Called when fullscreen is toggled */
  onFullscreenToggle: () => void;
  /** Called when a commercial is skipped */
  onCommercialSkip?: (marker: CommercialMarker) => void;
}

const AUTO_HIDE_DELAY = 3000;
const LIVE_EDGE_THRESHOLD = 10; // seconds within live edge to consider "live"
const AUTO_SKIP_CONFIDENCE = 0.9;
const PROMPT_SKIP_CONFIDENCE = 0.7;

/**
 * Live TV player controls with time-shift, commercial skip, and live metadata.
 *
 * Features:
 * - Red "LIVE" badge when at live edge
 * - Time-shift controls with 6h buffer
 * - "Jump to Live" button when behind live edge
 * - Commercial skip (auto at >=0.90, prompt at 0.70-0.89)
 * - Live metadata bar (channel, program, teams/score)
 * - Buffer position indicator
 */
function LivePlayer({
  playing,
  buffering,
  currentTime,
  bufferDuration,
  liveEdge,
  volume,
  muted,
  fullscreen,
  metadata,
  commercialMarkers = [],
  onPlay,
  onPause,
  onSeek,
  onJumpToLive,
  onVolumeChange,
  onMuteToggle,
  onFullscreenToggle,
  onCommercialSkip,
}: LivePlayerProps) {
  const [visible, setVisible] = useState(true);
  const [isVolumeHovered, setIsVolumeHovered] = useState(false);
  const [showSkipPrompt, setShowSkipPrompt] = useState(false);
  const [activeCommercial, setActiveCommercial] = useState<CommercialMarker | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const isAtLiveEdge = liveEdge - currentTime < LIVE_EDGE_THRESHOLD;
  const behindLiveSeconds = Math.max(0, liveEdge - currentTime);
  const bufferProgress = bufferDuration > 0
    ? Math.min(100, (currentTime / bufferDuration) * 100)
    : 0;
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

  // ---- Commercial detection ----

  useEffect(() => {
    const currentMs = currentTime * 1000;

    for (const marker of commercialMarkers) {
      if (currentMs >= marker.startMs && currentMs < marker.endMs) {
        if (marker.confidence >= AUTO_SKIP_CONFIDENCE) {
          // Auto-skip high confidence commercials
          onSeek(marker.endMs / 1000);
          onCommercialSkip?.(marker);
          setShowSkipPrompt(false);
          setActiveCommercial(null);
          return;
        }
        if (marker.confidence >= PROMPT_SKIP_CONFIDENCE) {
          setShowSkipPrompt(true);
          setActiveCommercial(marker);
          return;
        }
      }
    }

    setShowSkipPrompt(false);
    setActiveCommercial(null);
  }, [currentTime, commercialMarkers, onSeek, onCommercialSkip]);

  const handleSkipCommercial = useCallback(() => {
    if (activeCommercial) {
      onSeek(activeCommercial.endMs / 1000);
      onCommercialSkip?.(activeCommercial);
      setShowSkipPrompt(false);
      setActiveCommercial(null);
    }
  }, [activeCommercial, onSeek, onCommercialSkip]);

  // ---- Timeline scrubber ----

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const bar = progressRef.current;
      if (!bar || bufferDuration <= 0) return;
      const rect = bar.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onSeek(fraction * bufferDuration);
    },
    [bufferDuration, onSeek],
  );

  return (
    <div
      className="absolute inset-0 z-10 flex flex-col justify-end select-none"
      onMouseMove={resetHideTimer}
      onClick={resetHideTimer}
      data-testid="live-player"
    >
      {/* Buffering spinner */}
      {buffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader2 className="h-12 w-12 text-white animate-spin" />
        </div>
      )}

      {/* Center play button when paused */}
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

      {/* Commercial skip prompt */}
      {showSkipPrompt && activeCommercial && (
        <div className="absolute top-4 right-4 z-20" data-testid="skip-prompt">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSkipCommercial();
            }}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg shadow-lg hover:bg-primary-hover transition-colors"
            aria-label="Skip commercial"
          >
            <SkipForward className="w-5 h-5" />
            Skip Commercial
          </button>
        </div>
      )}

      {/* Live metadata bar */}
      <div
        className={`transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        {/* Metadata info bar */}
        <div className="px-4 mb-2" data-testid="metadata-bar">
          <div className="flex items-center gap-3">
            {/* Live badge */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                isAtLiveEdge
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}
              data-testid="live-badge"
            >
              <Radio className="w-3 h-3" />
              {isAtLiveEdge ? 'LIVE' : 'DELAYED'}
            </span>

            <span className="text-white text-sm font-medium">
              {metadata.channelNumber} {metadata.channelName}
            </span>

            <span className="text-white/60 text-sm">
              {metadata.programTitle}
            </span>

            {/* Sports score */}
            {metadata.teams && (
              <span className="text-white text-sm font-semibold ml-auto" data-testid="score-display">
                {metadata.teams.home}
                {metadata.score ? ` ${metadata.score.home} - ${metadata.score.away} ` : ' vs '}
                {metadata.teams.away}
              </span>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-4 pt-8">
          {/* Buffer position indicator */}
          <div
            ref={progressRef}
            className="group relative h-1 hover:h-2 bg-white/30 rounded-full cursor-pointer transition-all mb-4"
            onClick={handleProgressClick}
            role="slider"
            aria-label="Time shift"
            aria-valuemin={0}
            aria-valuemax={Math.floor(bufferDuration)}
            aria-valuenow={Math.floor(currentTime)}
            tabIndex={0}
          >
            {/* Playback progress */}
            <div
              className="absolute inset-y-0 left-0 bg-red-500 rounded-full"
              style={{ width: `${bufferProgress}%` }}
            />

            {/* Scrubber handle */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `${bufferProgress}%`, transform: 'translate(-50%, -50%)' }}
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
                  className="w-20 h-1 bg-white/30 rounded-full cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    const bar = e.currentTarget;
                    const rect = bar.getBoundingClientRect();
                    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    onVolumeChange(fraction);
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

            {/* Time behind live display */}
            {!isAtLiveEdge && (
              <span className="text-white text-xs tabular-nums whitespace-nowrap" data-testid="behind-live">
                -{formatTime(behindLiveSeconds)}
              </span>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Jump to Live button */}
            {!isAtLiveEdge && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onJumpToLive();
                }}
                className="flex items-center gap-1 bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
                aria-label="Jump to live"
                data-testid="jump-to-live"
              >
                <Radio className="w-3 h-3" />
                LIVE
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

export { LivePlayer };
