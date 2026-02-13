'use client';

import { useState, useEffect } from 'react';
import { useProfiles } from '@/hooks/useProfiles';
import { Button } from '@/components/ui/Button';

const SUBTITLE_LANGUAGES = [
  { value: 'off', label: 'Off' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ar', label: 'Arabic' },
  { value: 'hi', label: 'Hindi' },
];

const AUDIO_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ar', label: 'Arabic' },
  { value: 'hi', label: 'Hindi' },
];

const QUALITY_OPTIONS = [
  { value: 'auto', label: 'Auto (Recommended)' },
  { value: '720p', label: '720p' },
  { value: '1080p', label: '1080p' },
  { value: '4k', label: '4K Ultra HD' },
];

export default function PlaybackSettingsPage() {
  const { currentProfile, updateProfile } = useProfiles();

  const [subtitleLanguage, setSubtitleLanguage] = useState('off');
  const [audioLanguage, setAudioLanguage] = useState('en');
  const [qualityCap, setQualityCap] = useState('auto');
  const [autoplayNextEpisode, setAutoplayNext] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (currentProfile?.preferences) {
      const prefs = currentProfile.preferences;
      setSubtitleLanguage(prefs.subtitleLanguage ?? 'off');
      setAudioLanguage(prefs.audioLanguage ?? 'en');
      setQualityCap(prefs.qualityCap ?? 'auto');
      setAutoplayNext(prefs.autoplayNextEpisode ?? true);
    }
  }, [currentProfile]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      await updateProfile({
        preferences: {
          ...currentProfile?.preferences,
          subtitleLanguage,
          audioLanguage,
          qualityCap,
          autoplayNextEpisode,
        },
      });
      setSaveMessage('Playback settings saved.');
    } catch {
      setSaveMessage('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-lg">
      <section className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Playback Preferences
        </h2>

        <div className="space-y-6">
          {/* Subtitle Language */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Subtitle Language
            </label>
            <select
              value={subtitleLanguage}
              onChange={(e) => setSubtitleLanguage(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {SUBTITLE_LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-text-tertiary mt-1">
              Subtitles will be shown in this language when available.
            </p>
          </div>

          {/* Audio Language */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Audio Language
            </label>
            <select
              value={audioLanguage}
              onChange={(e) => setAudioLanguage(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {AUDIO_LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-text-tertiary mt-1">
              Preferred audio track language when multiple options are available.
            </p>
          </div>

          {/* Quality Cap */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Maximum Streaming Quality
            </label>
            <select
              value={qualityCap}
              onChange={(e) => setQualityCap(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {QUALITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-text-tertiary mt-1">
              Limits the maximum streaming resolution. &quot;Auto&quot; adapts to your connection speed.
            </p>
          </div>

          {/* Autoplay Next Episode */}
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-text-primary">
                Autoplay Next Episode
              </label>
              <p className="text-xs text-text-tertiary mt-0.5">
                Automatically play the next episode when the current one ends.
              </p>
            </div>
            <button
              onClick={() => setAutoplayNext(!autoplayNextEpisode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoplayNextEpisode ? 'bg-primary' : 'bg-border'
              }`}
              role="switch"
              aria-checked={autoplayNextEpisode}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoplayNextEpisode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {saveMessage && (
          <p className={`text-sm mt-4 ${saveMessage.includes('Failed') ? 'text-red-500' : 'text-green-500'}`}>
            {saveMessage}
          </p>
        )}

        <div className="mt-6">
          <Button
            variant="primary"
            onClick={handleSave}
            isLoading={isSaving}
          >
            Save Settings
          </Button>
        </div>
      </section>
    </div>
  );
}
