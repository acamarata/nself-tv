'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'ntv_subtitle_prefs';

type FontSize = 'small' | 'medium' | 'large' | 'extra-large';
type FontColor = 'white' | 'yellow' | 'green' | 'cyan';
type Background = 'transparent' | 'semi-transparent' | 'opaque';

export interface SubtitlePreferences {
  fontSize: FontSize;
  fontColor: FontColor;
  background: Background;
}

const DEFAULT_PREFS: SubtitlePreferences = {
  fontSize: 'medium',
  fontColor: 'white',
  background: 'semi-transparent',
};

const FONT_SIZE_OPTIONS: { value: FontSize; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'extra-large', label: 'Extra Large' },
];

const FONT_COLOR_OPTIONS: { value: FontColor; label: string; css: string }[] = [
  { value: 'white', label: 'White', css: '#ffffff' },
  { value: 'yellow', label: 'Yellow', css: '#ffff00' },
  { value: 'green', label: 'Green', css: '#00ff00' },
  { value: 'cyan', label: 'Cyan', css: '#00ffff' },
];

const BACKGROUND_OPTIONS: { value: Background; label: string; css: string }[] = [
  { value: 'transparent', label: 'Transparent', css: 'transparent' },
  { value: 'semi-transparent', label: 'Semi-transparent', css: 'rgba(0, 0, 0, 0.5)' },
  { value: 'opaque', label: 'Opaque', css: 'rgba(0, 0, 0, 0.9)' },
];

const FONT_SIZE_MAP: Record<FontSize, string> = {
  'small': '0.875rem',
  'medium': '1.125rem',
  'large': '1.5rem',
  'extra-large': '2rem',
};

function loadPreferences(): SubtitlePreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
    }
  } catch {
    // Invalid JSON or storage unavailable
  }
  return DEFAULT_PREFS;
}

function savePreferences(prefs: SubtitlePreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage full or unavailable
  }
}

export interface SubtitleSettingsProps {
  /** Optional child elements that receive subtitle style CSS custom properties */
  children?: React.ReactNode;
}

/**
 * Subtitle style customization panel and wrapper.
 *
 * Provides controls for font size, font color, and background opacity.
 * Preferences are persisted to localStorage under the key `ntv_subtitle_prefs`.
 * Applies subtitle styles via CSS custom properties on a wrapper div:
 *   --ntv-sub-font-size, --ntv-sub-font-color, --ntv-sub-bg
 */
export function SubtitleSettings({ children }: SubtitleSettingsProps) {
  const [prefs, setPrefs] = useState<SubtitlePreferences>(DEFAULT_PREFS);

  // Load from localStorage on mount
  useEffect(() => {
    setPrefs(loadPreferences());
  }, []);

  const updatePref = useCallback(<K extends keyof SubtitlePreferences>(key: K, value: SubtitlePreferences[K]) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      savePreferences(next);
      return next;
    });
  }, []);

  const cssVars = useMemo(() => {
    const colorEntry = FONT_COLOR_OPTIONS.find((c) => c.value === prefs.fontColor);
    const bgEntry = BACKGROUND_OPTIONS.find((b) => b.value === prefs.background);

    return {
      '--ntv-sub-font-size': FONT_SIZE_MAP[prefs.fontSize],
      '--ntv-sub-font-color': colorEntry?.css ?? '#ffffff',
      '--ntv-sub-bg': bgEntry?.css ?? 'rgba(0, 0, 0, 0.5)',
    } as React.CSSProperties;
  }, [prefs]);

  return (
    <div style={cssVars}>
      {/* Settings panel */}
      <div className="space-y-4 rounded-lg bg-black/95 border border-white/10 p-4 min-w-[240px]">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Subtitle Appearance
        </p>

        {/* Font Size */}
        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-gray-300">Font Size</legend>
          <div className="flex flex-wrap gap-1.5">
            {FONT_SIZE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updatePref('fontSize', opt.value)}
                className={`rounded px-2.5 py-1 text-xs transition-colors ${
                  prefs.fontSize === opt.value
                    ? 'bg-primary text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Font Color */}
        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-gray-300">Font Color</legend>
          <div className="flex gap-2">
            {FONT_COLOR_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updatePref('fontColor', opt.value)}
                className={`h-7 w-7 rounded-full border-2 transition-all ${
                  prefs.fontColor === opt.value
                    ? 'border-primary scale-110'
                    : 'border-transparent hover:border-white/30'
                }`}
                style={{ backgroundColor: opt.css }}
                aria-label={opt.label}
                title={opt.label}
              />
            ))}
          </div>
        </fieldset>

        {/* Background */}
        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-gray-300">Background</legend>
          <div className="flex flex-wrap gap-1.5">
            {BACKGROUND_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updatePref('background', opt.value)}
                className={`rounded px-2.5 py-1 text-xs transition-colors ${
                  prefs.background === opt.value
                    ? 'bg-primary text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Preview */}
        <div className="mt-2 rounded bg-gray-900 p-3 flex items-center justify-center">
          <span
            className="px-2 py-0.5 rounded"
            style={{
              fontSize: FONT_SIZE_MAP[prefs.fontSize],
              color: FONT_COLOR_OPTIONS.find((c) => c.value === prefs.fontColor)?.css,
              backgroundColor: BACKGROUND_OPTIONS.find((b) => b.value === prefs.background)?.css,
            }}
          >
            Sample Subtitle
          </span>
        </div>
      </div>

      {/* Wrapper for children with CSS custom properties applied */}
      {children}
    </div>
  );
}

export type { FontSize, FontColor, Background };
