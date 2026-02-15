import type { ContentRating } from '../constants';

export interface Profile {
  id: string;
  familyId: string;
  name: string;
  avatarUrl?: string;
  isKids: boolean;
  maxContentRating: ContentRating;
  pinProtected: boolean;
  createdAt: string;
  preferences: ProfilePreferences;
}

export interface ProfilePreferences {
  autoplayNext: boolean;
  skipIntro: boolean;
  subtitlesEnabled: boolean;
  preferredSubtitleLanguage?: string;
  preferredAudioLanguage?: string;
  playbackSpeed: number;
}

export const DEFAULT_PROFILE_PREFERENCES: ProfilePreferences = {
  autoplayNext: true,
  skipIntro: false,
  subtitlesEnabled: false,
  playbackSpeed: 1.0
};
