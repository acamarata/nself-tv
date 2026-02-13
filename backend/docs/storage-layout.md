# Storage Layout — nself-tv

All media assets are stored in MinIO (S3-compatible object storage).

## Buckets

| Bucket | Purpose | Access | Lifecycle |
|--------|---------|--------|-----------|
| `media-raw` | Uploaded source files | Private | 30-day expiry |
| `media-encoded` | HLS renditions and playlists | Public read | Permanent |
| `media-thumbnails` | Posters, sprites, trickplay | Public read | Permanent |
| `media-subtitles` | WebVTT subtitle files | Public read | Permanent |
| `backups` | Database and config backups | Private | Manual cleanup |

## Path Convention

```
{bucket}/{family_id}/{content_type}/{content_slug}/{artifact_type}/{filename}
```

### Examples

**Raw uploads:**
```
media-raw/fam_001/movie/the-matrix-1999/source/The.Matrix.1999.1080p.mkv
media-raw/fam_001/tv/breaking-bad/s01e01/source/Breaking.Bad.S01E01.mkv
```

**HLS renditions:**
```
media-encoded/fam_001/movie/the-matrix-1999/renditions/master.m3u8
media-encoded/fam_001/movie/the-matrix-1999/renditions/r720/index.m3u8
media-encoded/fam_001/movie/the-matrix-1999/renditions/r720/segment_000.ts
media-encoded/fam_001/movie/the-matrix-1999/renditions/r720/segment_001.ts
media-encoded/fam_001/movie/the-matrix-1999/renditions/r1080/index.m3u8
media-encoded/fam_001/movie/the-matrix-1999/renditions/r1080/segment_000.ts
```

**Thumbnails and posters:**
```
media-thumbnails/fam_001/movie/the-matrix-1999/poster/poster-100w.webp
media-thumbnails/fam_001/movie/the-matrix-1999/poster/poster-400w.webp
media-thumbnails/fam_001/movie/the-matrix-1999/poster/poster-1200w.webp
media-thumbnails/fam_001/movie/the-matrix-1999/trickplay/sprites.vtt
media-thumbnails/fam_001/movie/the-matrix-1999/trickplay/sprite_001.jpg
media-thumbnails/fam_001/movie/the-matrix-1999/trickplay/sprite_002.jpg
```

**Subtitles:**
```
media-subtitles/fam_001/movie/the-matrix-1999/subtitles/en.vtt
media-subtitles/fam_001/movie/the-matrix-1999/subtitles/es.vtt
media-subtitles/fam_001/movie/the-matrix-1999/subtitles/fr.vtt
```

## URL Access

In development, MinIO is accessible at:
- API: `http://localhost:9000` (or `http://minio:9000` from Docker)
- Console: `http://localhost:9001`

Public buckets are accessible via direct URL:
```
http://minio:9000/media-encoded/fam_001/movie/the-matrix-1999/renditions/master.m3u8
```

In production, a CDN sits in front of MinIO:
```
https://cdn.nself.org/media-encoded/fam_001/movie/the-matrix-1999/renditions/master.m3u8
```

## Slug Generation

Content slugs are derived from title + year:
- `The Matrix (1999)` -> `the-matrix-1999`
- `Breaking Bad S01E01` -> `breaking-bad/s01e01`
- `My Podcast Episode 42` -> `my-podcast-episode-42`

Rules:
1. Lowercase the title
2. Replace non-alphanumeric characters with hyphens
3. Collapse consecutive hyphens
4. Trim leading/trailing hyphens
5. Append year for movies
6. Use season/episode path segments for TV
