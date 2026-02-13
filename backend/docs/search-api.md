# Search API — nself-tv

Full-text search is powered by MeiliSearch, indexed via the library_service.

## Index: `media`

Primary key: `id` (UUID from media_items table)

### Searchable Attributes (by priority)

1. `title` — Primary title
2. `original_title` — Original language title
3. `overview` — Plot synopsis
4. `tagline` — Marketing tagline
5. `genres` — Genre array
6. `tags` — User-defined tags

### Filterable Attributes

- `type` — movie, tv_show, episode, music, podcast, game, live_event
- `genres` — Genre array
- `tags` — Tag array
- `year` — Release year
- `content_rating` — TV-Y, TV-Y7, TV-G, TV-PG, TV-14, TV-MA
- `status` — pending, processing, ready, error, archived
- `family_id` — Owner family UUID

### Sortable Attributes

- `title` — Alphabetical
- `year` — Chronological
- `community_rating` — By rating
- `added_at` — By date added
- `view_count` — By popularity

## Search Endpoint

```
POST http://meilisearch:7700/indexes/media/search
Authorization: Bearer {MEILISEARCH_MASTER_KEY}
Content-Type: application/json
```

### Basic Search

```json
{
  "q": "matrix"
}
```

### Filtered Search

```json
{
  "q": "action",
  "filter": "type = 'movie' AND year >= 2000 AND content_rating = 'TV-14'",
  "sort": ["community_rating:desc"],
  "limit": 20,
  "offset": 0
}
```

### Faceted Search

```json
{
  "q": "",
  "facets": ["type", "genres", "year", "content_rating"],
  "filter": "family_id = 'fam_001'"
}
```

### Response Format

```json
{
  "hits": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "The Matrix",
      "original_title": "The Matrix",
      "type": "movie",
      "overview": "A computer hacker learns...",
      "year": 1999,
      "genres": ["Action", "Sci-Fi"],
      "content_rating": "TV-14",
      "community_rating": 8.7,
      "poster_url": "/media-thumbnails/fam_001/movie/the-matrix-1999/poster/poster-400w.webp",
      "runtime_minutes": 136,
      "status": "ready",
      "added_at": "2026-02-12T10:30:00Z"
    }
  ],
  "query": "matrix",
  "processingTimeMs": 3,
  "limit": 20,
  "offset": 0,
  "estimatedTotalHits": 4
}
```

## Synonyms

Pre-configured synonyms for common media terms:

| Term | Synonyms |
|------|----------|
| tv | television, show, series |
| movie | film, cinema, motion picture |
| episode | ep, installment |
| documentary | docu, doc |
| anime | animation, animated |
| sci-fi | science fiction, scifi |
| rom-com | romantic comedy |

## Indexing

Media items are indexed by the library_service when:
- A new media item is added to the database
- A media item's metadata is updated
- A library scan completes (batch indexing)

### Document Format

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "The Matrix",
  "original_title": "The Matrix",
  "type": "movie",
  "overview": "A computer hacker learns about the true nature of reality...",
  "tagline": "Welcome to the Real World",
  "year": 1999,
  "genres": ["Action", "Sci-Fi"],
  "tags": ["cyberpunk", "dystopia"],
  "content_rating": "TV-14",
  "community_rating": 8.7,
  "poster_url": "/thumbnails/poster-400w.webp",
  "backdrop_url": "/thumbnails/backdrop.webp",
  "runtime_minutes": 136,
  "status": "ready",
  "added_at": "2026-02-12T10:30:00Z",
  "view_count": 1542,
  "family_id": "fam_001"
}
```
