import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  action: () => void;
  preventDefault?: boolean;
}

export interface ShortcutGroup {
  name: string;
  shortcuts: KeyboardShortcut[];
}

/**
 * Keyboard shortcuts hook
 *
 * Registers global keyboard shortcuts and provides help modal
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled: boolean = true) {
  const shortcutsRef = useRef(shortcuts);

  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const matchingShortcut = shortcutsRef.current.find((shortcut) => {
        const keyMatches =
          shortcut.key.toLowerCase() === event.key.toLowerCase() ||
          shortcut.key.toLowerCase() === event.code.toLowerCase();

        const ctrlMatches = shortcut.ctrl === undefined || shortcut.ctrl === event.ctrlKey;
        const shiftMatches = shortcut.shift === undefined || shortcut.shift === event.shiftKey;
        const altMatches = shortcut.alt === undefined || shortcut.alt === event.altKey;
        const metaMatches = shortcut.meta === undefined || shortcut.meta === event.metaKey;

        return keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches;
      });

      if (matchingShortcut) {
        if (matchingShortcut.preventDefault !== false) {
          event.preventDefault();
        }
        matchingShortcut.action();
      }
    },
    [enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}

/**
 * Global app shortcuts
 */
export function useGlobalShortcuts() {
  const shortcuts: ShortcutGroup[] = [
    {
      name: 'Navigation',
      shortcuts: [
        {
          key: 'h',
          description: 'Go to Home',
          action: () => (window.location.href = '/home'),
        },
        {
          key: 's',
          description: 'Search',
          action: () => {
            const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]');
            searchInput?.focus();
          },
        },
        {
          key: 'l',
          description: 'Go to Library',
          action: () => (window.location.href = '/library'),
        },
        {
          key: 'w',
          description: 'Go to Watchlist',
          action: () => (window.location.href = '/watchlist'),
        },
        {
          key: 'f',
          description: 'Go to Favorites',
          action: () => (window.location.href = '/favorites'),
        },
        {
          key: ',',
          ctrl: true,
          description: 'Settings',
          action: () => (window.location.href = '/settings'),
        },
      ],
    },
    {
      name: 'Playback',
      shortcuts: [
        {
          key: ' ',
          description: 'Play/Pause',
          action: () => {
            const video = document.querySelector<HTMLVideoElement>('video');
            if (video) {
              if (video.paused) video.play();
              else video.pause();
            }
          },
        },
        {
          key: 'ArrowLeft',
          description: 'Rewind 10 seconds',
          action: () => {
            const video = document.querySelector<HTMLVideoElement>('video');
            if (video) video.currentTime = Math.max(0, video.currentTime - 10);
          },
        },
        {
          key: 'ArrowRight',
          description: 'Forward 10 seconds',
          action: () => {
            const video = document.querySelector<HTMLVideoElement>('video');
            if (video) video.currentTime = Math.min(video.duration, video.currentTime + 10);
          },
        },
        {
          key: 'j',
          description: 'Rewind 10 seconds',
          action: () => {
            const video = document.querySelector<HTMLVideoElement>('video');
            if (video) video.currentTime = Math.max(0, video.currentTime - 10);
          },
        },
        {
          key: 'l',
          description: 'Forward 10 seconds',
          action: () => {
            const video = document.querySelector<HTMLVideoElement>('video');
            if (video) video.currentTime = Math.min(video.duration, video.currentTime + 10);
          },
        },
        {
          key: 'k',
          description: 'Play/Pause',
          action: () => {
            const video = document.querySelector<HTMLVideoElement>('video');
            if (video) {
              if (video.paused) video.play();
              else video.pause();
            }
          },
        },
        {
          key: 'ArrowUp',
          description: 'Volume up',
          action: () => {
            const video = document.querySelector<HTMLVideoElement>('video');
            if (video) video.volume = Math.min(1, video.volume + 0.1);
          },
        },
        {
          key: 'ArrowDown',
          description: 'Volume down',
          action: () => {
            const video = document.querySelector<HTMLVideoElement>('video');
            if (video) video.volume = Math.max(0, video.volume - 0.1);
          },
        },
        {
          key: 'm',
          description: 'Mute/Unmute',
          action: () => {
            const video = document.querySelector<HTMLVideoElement>('video');
            if (video) video.muted = !video.muted;
          },
        },
        {
          key: 'f',
          description: 'Fullscreen',
          action: () => {
            if (document.fullscreenElement) {
              document.exitFullscreen();
            } else {
              document.documentElement.requestFullscreen();
            }
          },
        },
        {
          key: 'c',
          description: 'Toggle Subtitles',
          action: () => {
            const video = document.querySelector<HTMLVideoElement>('video');
            if (video && video.textTracks.length > 0) {
              const track = video.textTracks[0];
              track.mode = track.mode === 'showing' ? 'hidden' : 'showing';
            }
          },
        },
        {
          key: '>',
          shift: true,
          description: 'Increase Playback Speed',
          action: () => {
            const video = document.querySelector<HTMLVideoElement>('video');
            if (video) video.playbackRate = Math.min(2, video.playbackRate + 0.25);
          },
        },
        {
          key: '<',
          shift: true,
          description: 'Decrease Playback Speed',
          action: () => {
            const video = document.querySelector<HTMLVideoElement>('video');
            if (video) video.playbackRate = Math.max(0.25, video.playbackRate - 0.25);
          },
        },
        {
          key: '0',
          description: 'Jump to 0%',
          action: () => {
            const video = document.querySelector<HTMLVideoElement>('video');
            if (video) video.currentTime = 0;
          },
        },
        {
          key: '1',
          description: 'Jump to 10%',
          action: () => {
            const video = document.querySelector<HTMLVideoElement>('video');
            if (video) video.currentTime = video.duration * 0.1;
          },
        },
        {
          key: '2',
          description: 'Jump to 20%',
          action: () => {
            const video = document.querySelector<HTMLVideoElement>('video');
            if (video) video.currentTime = video.duration * 0.2;
          },
        },
        {
          key: '3',
          description: 'Jump to 30%',
          action: () => {
            const video = document.querySelector<HTMLVideoElement>('video');
            if (video) video.currentTime = video.duration * 0.3;
          },
        },
        {
          key: '4',
          description: 'Jump to 40%',
          action: () => {
            const video = document.querySelector<HTMLVideoElement>('video');
            if (video) video.currentTime = video.duration * 0.4;
          },
        },
        {
          key: '5',
          description: 'Jump to 50%',
          action: () => {
            const video = document.querySelector<HTMLVideoElement>('video');
            if (video) video.currentTime = video.duration * 0.5;
          },
        },
        {
          key: '6',
          description: 'Jump to 60%',
          action: () => {
            const video = document.querySelector<HTMLVideoElement>('video');
            if (video) video.currentTime = video.duration * 0.6;
          },
        },
        {
          key: '7',
          description: 'Jump to 70%',
          action: () => {
            const video = document.querySelector<HTMLVideoElement>('video');
            if (video) video.currentTime = video.duration * 0.7;
          },
        },
        {
          key: '8',
          description: 'Jump to 80%',
          action: () => {
            const video = document.querySelector<HTMLVideoElement>('video');
            if (video) video.currentTime = video.duration * 0.8;
          },
        },
        {
          key: '9',
          description: 'Jump to 90%',
          action: () => {
            const video = document.querySelector<HTMLVideoElement>('video');
            if (video) video.currentTime = video.duration * 0.9;
          },
        },
      ],
    },
    {
      name: 'UI',
      shortcuts: [
        {
          key: '?',
          shift: true,
          description: 'Show keyboard shortcuts',
          action: () => {
            // Trigger modal showing all shortcuts
            window.dispatchEvent(new CustomEvent('show-keyboard-shortcuts'));
          },
        },
        {
          key: 'Escape',
          description: 'Close modal/dialog',
          action: () => {
            // Close any open modals
            const closeButton = document.querySelector<HTMLButtonElement>('[data-close-modal]');
            closeButton?.click();
          },
        },
      ],
    },
  ];

  // Flatten shortcuts for hook
  const flatShortcuts = shortcuts.flatMap((group) => group.shortcuts);

  useKeyboardShortcuts(flatShortcuts);

  return shortcuts;
}

/**
 * Format shortcut for display
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');
  if (shortcut.meta) parts.push('⌘');

  // Format key
  let key = shortcut.key;
  if (key === ' ') key = 'Space';
  else if (key.startsWith('Arrow')) key = key.replace('Arrow', '');
  else if (key.length === 1) key = key.toUpperCase();

  parts.push(key);

  return parts.join(' + ');
}
