'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Check, Subtitles } from 'lucide-react';
import type { SubtitleTrack } from '@/hooks/useSubtitles';

export interface SubtitleRendererProps {
  /** Available subtitle tracks */
  tracks: SubtitleTrack[];
  /** Currently active track ID, or null if subtitles are off */
  activeTrackId: string | null;
  /** Called when the user selects a track (or null to disable subtitles) */
  onSelect: (id: string | null) => void;
}

/**
 * Dropdown menu for selecting subtitle/caption tracks in the player settings area.
 *
 * Displays a toggle button with a subtitles icon. When opened, shows a list of
 * available tracks plus an "Off" option. The active track is indicated with a checkmark.
 */
export function SubtitleRenderer({ tracks, activeTrackId, onSelect }: SubtitleRendererProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, handleClickOutside]);

  if (tracks.length === 0) return null;

  return (
    <div ref={menuRef} className="relative">
      {/* Toggle button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className={`text-white hover:text-white/80 transition-colors ${activeTrackId ? 'text-primary' : ''}`}
        aria-label="Subtitles"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Subtitles className="h-5 w-5" />
      </button>

      {/* Dropdown menu */}
      {open && (
        <div
          className="absolute bottom-full right-0 mb-2 min-w-[180px] rounded-lg bg-black/95 border border-white/10 shadow-2xl backdrop-blur-sm py-1 z-50"
          role="listbox"
          aria-label="Subtitle tracks"
        >
          <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Subtitles
          </p>

          {/* Off option */}
          <button
            type="button"
            role="option"
            aria-selected={activeTrackId === null}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(null);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors"
          >
            <span className="w-4 flex-shrink-0">
              {activeTrackId === null && <Check className="h-4 w-4 text-primary" />}
            </span>
            <span>Off</span>
          </button>

          {/* Track list */}
          {tracks.map((track) => (
            <button
              key={track.id}
              type="button"
              role="option"
              aria-selected={activeTrackId === track.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(track.id);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors"
            >
              <span className="w-4 flex-shrink-0">
                {activeTrackId === track.id && <Check className="h-4 w-4 text-primary" />}
              </span>
              <span>
                {track.label}
                {track.isCC && (
                  <span className="ml-1.5 rounded bg-white/20 px-1 py-0.5 text-[10px] uppercase">
                    cc
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
