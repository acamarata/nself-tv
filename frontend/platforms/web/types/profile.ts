export type ProfileRole = 'owner' | 'admin' | 'helper' | 'child';

export type ContentRating = 'TV-Y' | 'TV-Y7' | 'TV-G' | 'TV-PG' | 'TV-14' | 'TV-MA';
export type MovieRating = 'G' | 'PG' | 'PG-13' | 'R' | 'NC-17';

export interface Profile {
  id: string;
  userId: string;
  familyId: string;
  displayName: string;
  avatarUrl: string | null;
  contentRatingLimit: string | null;
  language: string | null;
  subtitleLanguage: string | null;
  audioLanguage: string | null;
  autoplayNext: boolean;
  preferences: Record<string, unknown> | null;
  isDefault: boolean;
  createdAt: string;
}

export interface CreateProfileInput {
  displayName: string;
  avatarUrl?: string;
  contentRatingLimit?: string;
  language?: string;
  subtitleLanguage?: string;
  audioLanguage?: string;
}

export interface UpdateProfileInput {
  displayName?: string;
  avatarUrl?: string;
  contentRatingLimit?: string;
  language?: string;
  subtitleLanguage?: string;
  audioLanguage?: string;
  autoplayNext?: boolean;
  preferences?: Record<string, unknown>;
}
