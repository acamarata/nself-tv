const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const crypto = require('crypto');
const xml2js = require('xml2js');
const NodeCache = require('node-cache');
const { createLogger, requestIdMiddleware } = require('../../lib/logger');

const app = express();
const port = process.env.PORT || 3100;
const logger = createLogger('subsonic-api');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Cache for frequently accessed data (5 minute TTL)
const cache = new NodeCache({ stdTTL: 300 });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestIdMiddleware(logger));

// Authentication middleware
function authenticate(req, res, next) {
  const { u: username, p: password, t: token, s: salt, c: client, v: version } = req.query;

  if (!username || !client || !version) {
    return sendError(res, 10, 'Required parameter missing');
  }

  // Token-based auth (preferred)
  if (token && salt) {
    const expectedToken = crypto.createHash('md5').update(password + salt).digest('hex');
    if (token !== expectedToken) {
      return sendError(res, 40, 'Wrong username or password');
    }
  }
  // Plain password auth (legacy)
  else if (password) {
    // Verify password against database
    // For now, accept any password (will implement full auth)
  } else {
    return sendError(res, 10, 'Required parameter missing');
  }

  req.username = username;
  req.client = client;
  req.version = version;
  next();
}

// Response helpers
function sendResponse(res, data, format = 'json') {
  const response = {
    'subsonic-response': {
      $: {
        xmlns: 'http://subsonic.org/restapi',
        status: 'ok',
        version: '1.16.1',
        type: 'nself-tv',
        serverVersion: '0.9.0',
      },
      ...data,
    },
  };

  if (format === 'xml') {
    const builder = new xml2js.Builder();
    res.set('Content-Type', 'text/xml');
    res.send(builder.buildObject(response));
  } else {
    res.json(response);
  }
}

function sendError(res, code, message) {
  const response = {
    'subsonic-response': {
      $: {
        xmlns: 'http://subsonic.org/restapi',
        status: 'failed',
        version: '1.16.1',
      },
      error: {
        $: { code, message },
      },
    },
  };

  const format = res.req.query.f || 'json';
  if (format === 'xml') {
    const builder = new xml2js.Builder();
    res.set('Content-Type', 'text/xml');
    res.status(200).send(builder.buildObject(response));
  } else {
    res.status(200).json(response);
  }
}

// API Routes

// System
app.get('/rest/ping', (req, res) => {
  sendResponse(res, {}, req.query.f);
});

app.get('/rest/getLicense', authenticate, (req, res) => {
  sendResponse(res, {
    license: {
      $: {
        valid: true,
        email: 'opensource@nself.org',
        licenseExpires: '2099-12-31T23:59:59',
        trialExpires: '2099-12-31T23:59:59',
      },
    },
  }, req.query.f);
});

// Browsing
app.get('/rest/getMusicFolders', authenticate, async (req, res) => {
  try {
    const folders = [
      { $: { id: '1', name: 'Music Library' } },
      { $: { id: '2', name: 'Podcasts' } },
    ];

    sendResponse(res, { musicFolders: { musicFolder: folders } }, req.query.f);
  } catch (error) {
    sendError(res, 0, error.message);
  }
});

app.get('/rest/getIndexes', authenticate, async (req, res) => {
  try {
    const cacheKey = 'indexes';
    let indexes = cache.get(cacheKey);

    if (!indexes) {
      const result = await pool.query(`
        SELECT DISTINCT UPPER(SUBSTRING(title FROM 1 FOR 1)) as letter
        FROM media_items
        WHERE type = 'music'
        ORDER BY letter
      `);

      indexes = result.rows.map(row => ({
        $: { name: row.letter },
        artist: [],
      }));

      cache.set(cacheKey, indexes);
    }

    sendResponse(res, {
      indexes: {
        $: { lastModified: Date.now() },
        index: indexes,
      },
    }, req.query.f);
  } catch (error) {
    sendError(res, 0, error.message);
  }
});

app.get('/rest/getMusicDirectory', authenticate, async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return sendError(res, 10, 'Required parameter missing');
    }

    const result = await pool.query(`
      SELECT id, title, type, year, genres, poster_url, backdrop_url
      FROM media_items
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return sendError(res, 70, 'Directory not found');
    }

    const item = result.rows[0];

    sendResponse(res, {
      directory: {
        $: {
          id: item.id,
          name: item.title,
          parent: '1',
        },
        child: [],
      },
    }, req.query.f);
  } catch (error) {
    sendError(res, 0, error.message);
  }
});

// Albums
app.get('/rest/getAlbumList', authenticate, async (req, res) => {
  try {
    const { type = 'random', size = 10, offset = 0 } = req.query;

    let orderBy = 'RANDOM()';
    if (type === 'newest') orderBy = 'created_at DESC';
    if (type === 'frequent') orderBy = 'play_count DESC';
    if (type === 'recent') orderBy = 'updated_at DESC';
    if (type === 'alphabeticalByName') orderBy = 'title ASC';
    if (type === 'alphabeticalByArtist') orderBy = 'title ASC';

    const result = await pool.query(`
      SELECT id, title, year, genres, poster_url
      FROM media_items
      WHERE type = 'music'
      ORDER BY ${orderBy}
      LIMIT $1 OFFSET $2
    `, [parseInt(size), parseInt(offset)]);

    const albums = result.rows.map(row => ({
      $: {
        id: row.id,
        name: row.title,
        artist: row.genres?.[0] || 'Unknown Artist',
        year: row.year,
        coverArt: row.id,
      },
    }));

    sendResponse(res, {
      albumList: { album: albums },
    }, req.query.f);
  } catch (error) {
    sendError(res, 0, error.message);
  }
});

app.get('/rest/getAlbumList2', authenticate, async (req, res) => {
  // ID3 tags version of getAlbumList
  return app._router.handle({...req, url: '/rest/getAlbumList', query: req.query}, res, () => {});
});

// Search
app.get('/rest/search3', authenticate, async (req, res) => {
  try {
    const { query: searchQuery, artistCount = 20, albumCount = 20, songCount = 20 } = req.query;

    if (!searchQuery) {
      return sendError(res, 10, 'Required parameter missing');
    }

    const result = await pool.query(`
      SELECT id, title, type, year, genres, poster_url
      FROM media_items
      WHERE title ILIKE $1 OR description ILIKE $1
      LIMIT $2
    `, [`%${searchQuery}%`, parseInt(artistCount) + parseInt(albumCount) + parseInt(songCount)]);

    const artists = [];
    const albums = [];
    const songs = [];

    result.rows.forEach(row => {
      const item = {
        $: {
          id: row.id,
          name: row.title,
          coverArt: row.id,
        },
      };

      if (row.type === 'music' && albums.length < albumCount) {
        albums.push(item);
      } else if (songs.length < songCount) {
        songs.push(item);
      }
    });

    sendResponse(res, {
      searchResult3: {
        artist: artists,
        album: albums,
        song: songs,
      },
    }, req.query.f);
  } catch (error) {
    sendError(res, 0, error.message);
  }
});

// Playlists
app.get('/rest/getPlaylists', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, is_public, item_count, created_at, updated_at
      FROM playlists
      WHERE user_id = (SELECT id FROM users WHERE email = $1)
      ORDER BY updated_at DESC
    `, [req.username]);

    const playlists = result.rows.map(row => ({
      $: {
        id: row.id,
        name: row.name,
        public: row.is_public,
        songCount: row.item_count || 0,
        created: row.created_at,
        changed: row.updated_at,
      },
    }));

    sendResponse(res, {
      playlists: { playlist: playlists },
    }, req.query.f);
  } catch (error) {
    sendError(res, 0, error.message);
  }
});

// Streaming
app.get('/rest/stream', authenticate, async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return sendError(res, 10, 'Required parameter missing');
    }

    const result = await pool.query(`
      SELECT mv.url, mv.format
      FROM media_variants mv
      WHERE mv.media_item_id = $1
      ORDER BY mv.bitrate_kbps DESC
      LIMIT 1
    `, [id]);

    if (result.rows.length === 0) {
      return sendError(res, 70, 'Media not found');
    }

    const variant = result.rows[0];

    // Redirect to actual media URL (MinIO or CDN)
    res.redirect(variant.url);
  } catch (error) {
    sendError(res, 0, error.message);
  }
});

// Cover Art
app.get('/rest/getCoverArt', authenticate, async (req, res) => {
  try {
    const { id, size } = req.query;

    if (!id) {
      return sendError(res, 10, 'Required parameter missing');
    }

    const result = await pool.query(`
      SELECT poster_url
      FROM media_items
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0 || !result.rows[0].poster_url) {
      return sendError(res, 70, 'Cover art not found');
    }

    // Redirect to poster URL
    res.redirect(result.rows[0].poster_url);
  } catch (error) {
    sendError(res, 0, error.message);
  }
});

// User Management
app.get('/rest/getUser', authenticate, async (req, res) => {
  try {
    const { username } = req.query;

    const result = await pool.query(`
      SELECT id, email, created_at
      FROM users
      WHERE email = $1
    `, [username || req.username]);

    if (result.rows.length === 0) {
      return sendError(res, 40, 'User not found');
    }

    const user = result.rows[0];

    sendResponse(res, {
      user: {
        $: {
          username: user.email,
          email: user.email,
          scrobblingEnabled: false,
          adminRole: false,
          settingsRole: true,
          downloadRole: true,
          uploadRole: false,
          playlistRole: true,
          coverArtRole: false,
          commentRole: false,
          podcastRole: true,
          streamRole: true,
          jukeboxRole: false,
          shareRole: false,
        },
      },
    }, req.query.f);
  } catch (error) {
    sendError(res, 0, error.message);
  }
});

// Scrobbling (Last.fm compatibility)
app.get('/rest/scrobble', authenticate, async (req, res) => {
  try {
    const { id, time, submission } = req.query;

    if (!id) {
      return sendError(res, 10, 'Required parameter missing');
    }

    // Record playback in watch_progress
    await pool.query(`
      INSERT INTO watch_progress (user_id, media_item_id, position_seconds, last_watched_at)
      VALUES (
        (SELECT id FROM users WHERE email = $1),
        $2,
        0,
        NOW()
      )
      ON CONFLICT (user_id, media_item_id) DO UPDATE
      SET last_watched_at = NOW()
    `, [req.username, id]);

    sendResponse(res, {}, req.query.f);
  } catch (error) {
    sendError(res, 0, error.message);
  }
});

// OpenSubsonic Extensions
app.get('/rest/getOpenSubsonicExtensions', (req, res) => {
  sendResponse(res, {
    openSubsonicExtensions: {
      $: { versions: ['1'] },
    },
  }, req.query.f);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'subsonic-api' });
});

// Start server
app.listen(port, () => {
  logger.info("Subsonic API started", { port });
});

module.exports = app;
