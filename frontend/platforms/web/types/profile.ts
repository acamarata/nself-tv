export type ProfileRole = 'owner' | 'admin' | 'helper' | 'child';

export type ContentRating = 'TV-Y' | 'TV-Y7' | 'TV-G' | 'TV-PG' | 'TV-14' | 'TV-MA';
export type MovieRating = 'G' | 'PG' | 'PG-13' | 'R' | 'NC-17';

export interface ParentalControls {
  maxTvRating: ContentRating;
  maxMovieRating: MovieRating;
  pinEnabled: boolean;
  pin: string | null;
}

export interface ProfilePreferences {
  subtitleLanguage: string;
  audioLanguage: string;
  qualityCap: string;
  autoplayNextEpisode: boolean;
}

export interface Profile {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  role: ProfileRole;
  parentalControls: ParentalControls;
  preferences: ProfilePreferences;
  isDefault: boolean;
  createdAt: string;
}

export interface CreateProfileInput {
  displayName: string;
  avatarUrl?: string;
  role: ProfileRole;
  parentalControls?: Partial<ParentalControls>;
}

export interface UpdateProfileInput {
  displayName?: string;
  avatarUrl?: string;
  parentalControls?: Partial<ParentalControls>;
  preferences?: Partial<ProfilePreferences>;
}
