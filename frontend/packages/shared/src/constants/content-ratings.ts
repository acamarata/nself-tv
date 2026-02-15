export const CONTENT_RATINGS = {
  // TV Ratings (US)
  TV_Y: 'TV-Y',       // All children
  TV_Y7: 'TV-Y7',     // Directed to older children
  TV_G: 'TV-G',       // General audience
  TV_PG: 'TV-PG',     // Parental guidance suggested
  TV_14: 'TV-14',     // Parents strongly cautioned
  TV_MA: 'TV-MA',     // Mature audiences only

  // Movie Ratings (MPAA)
  G: 'G',             // General audiences
  PG: 'PG',           // Parental guidance suggested
  PG_13: 'PG-13',     // Parents strongly cautioned
  R: 'R',             // Restricted
  NC_17: 'NC-17',     // Adults only

  // Unrated
  NR: 'NR'            // Not rated
} as const;

export type ContentRating = typeof CONTENT_RATINGS[keyof typeof CONTENT_RATINGS];

/**
 * Rating hierarchy order (lower index = less restrictive)
 * Used for filtering content based on profile parental control settings
 */
export const RATING_HIERARCHY: ContentRating[] = [
  'TV-Y',
  'TV-Y7',
  'G',
  'TV-G',
  'PG',
  'TV-PG',
  'PG-13',
  'TV-14',
  'R',
  'TV-MA',
  'NC-17',
  'NR'
];

/**
 * Rating display labels
 */
export const RATING_LABELS: Record<ContentRating, string> = {
  'TV-Y': 'TV-Y (All Children)',
  'TV-Y7': 'TV-Y7 (Older Children)',
  'TV-G': 'TV-G (General Audience)',
  'TV-PG': 'TV-PG (Parental Guidance)',
  'TV-14': 'TV-14 (Parents Cautioned)',
  'TV-MA': 'TV-MA (Mature)',
  'G': 'G (General)',
  'PG': 'PG (Parental Guidance)',
  'PG-13': 'PG-13 (Parents Cautioned)',
  'R': 'R (Restricted)',
  'NC-17': 'NC-17 (Adults Only)',
  'NR': 'NR (Not Rated)'
};
