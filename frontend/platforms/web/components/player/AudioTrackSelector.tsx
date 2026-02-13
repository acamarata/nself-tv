'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Check, Languages } from 'lucide-react';
import type { AudioTrack } from '@/hooks/useAudioTracks';

export interface AudioTrackSelectorProps {
  /** Available audio tracks */
  tracks: AudioTrack[];
  /** Currently active track ID */
  activeTrackId: string | null;
  /** Called when the user selects an audio track */
  onSelect: (id: string) => void;
}

/**
 * Dropdown menu for selecting audio tracks in the player settings area.
 *
 * Displays a toggle button with a languages icon. When opened, shows a list of
 * available audio tracks. The active track is indicated with a checkmark.
 */
export function AudioTrackSelector({ tracks, activeTrackId, onSelect }: AudioTrackSelectorProps) {
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

  if (tracks.length <= 1) return null;

  return (
    <div ref={menuRef} className="relative">
      {/* Toggle button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="text-white hover:text-white/80 transition-colors"
        aria-label="Audio tracks"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Languages className="h-5 w-5" />
      </button>

      {/* Dropdown menu */}
      {open && (
        <div
          className="absolute bottom-full right-0 mb-2 min-w-[180px] rounded-lg bg-black/95 border border-white/10 shadow-2xl backdrop-blur-sm py-1 z-50"
          role="listbox"
          aria-label="Audio tracks"
        >
          <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Audio
          </p>

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
              <span className="flex flex-col items-start">
                <span>{track.label}</span>
                {track.codec !== 'unknown' && (
                  <span className="text-[10px] text-gray-400">{track.codec}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
