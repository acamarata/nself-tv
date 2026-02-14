/**
 * thumbnail_generator service entry point.
 *
 * Boots:
 *   1. Redis connection (shared by all BullMQ workers and queues)
 *   2. Three BullMQ workers (poster, sprite, optimize)
 *   3. Express HTTP server with health-check and job-submission endpoints
 *
 * Shuts down gracefully on SIGTERM / SIGINT.
 */

require('dotenv').config();

const express = require('express');
const { Queue } = require('bullmq');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');
const logger = require('./logger');
const { createPosterWorker } = require('./workers/poster-worker');
const { createSpriteWorker } = require('./workers/sprite-worker');
const { createOptimizeWorker } = require('./workers/optimize-worker');

// ---------------------------------------------------------------------------
// Redis
// ---------------------------------------------------------------------------

const connection = new Redis(config.redis);

connection.on('connect', () => logger.info('Redis connected'));
connection.on('error', (err) => logger.error('Redis error', { error: err.message }));

// ---------------------------------------------------------------------------
// BullMQ queues (used by the HTTP API to enqueue jobs)
// ---------------------------------------------------------------------------

const posterQueue = new Queue(config.queues.poster, { connection });
const spriteQueue = new Queue(config.queues.sprite, { connection });
const optimizeQueue = new Queue(config.queues.optimize, { connection });

// Map queue names to Queue instances for status lookups
const queueMap = {
  [config.queues.poster]: posterQueue,
  [config.queues.sprite]: spriteQueue,
  [config.queues.optimize]: optimizeQueue,
};

// ---------------------------------------------------------------------------
// BullMQ workers
// ---------------------------------------------------------------------------

const posterWorker = createPosterWorker(connection);
const spriteWorker = createSpriteWorker(connection);
const optimizeWorker = createOptimizeWorker(connection);

// ---------------------------------------------------------------------------
// Express HTTP server
// ---------------------------------------------------------------------------

const app = express();
app.use(express.json({ limit: '1mb' }));

// ---------- Health ----------

app.get('/health', async (_req, res) => {
  try {
    await connection.ping();

    const [posterCounts, spriteCounts, optimizeCounts] = await Promise.all([
      posterQueue.getJobCounts('waiting', 'active', 'completed', 'failed'),
      spriteQueue.getJobCounts('waiting', 'active', 'completed', 'failed'),
      optimizeQueue.getJobCounts('waiting', 'active', 'completed', 'failed'),
    ]);

    res.json({
      status: 'healthy',
      service: 'thumbnail_generator',
      timestamp: new Date().toISOString(),
      redis: 'connected',
      queues: {
        poster: posterCounts,
        sprite: spriteCounts,
        optimize: optimizeCounts,
      },
    });
  } catch (err) {
    logger.error('Health check failed', { error: err.message });
    res.status(503).json({
      status: 'unhealthy',
      service: 'thumbnail_generator',
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ---------- Submit poster job ----------

app.post('/api/v1/jobs/poster', async (req, res) => {
  try {
    const { sourceBucket, sourceKey, outputBucket, outputPrefix, sizes } = req.body;

    if (!sourceBucket || !sourceKey) {
      return res.status(400).json({ error: 'sourceBucket and sourceKey are required' });
    }
    if (!outputBucket || !outputPrefix) {
      return res.status(400).json({ error: 'outputBucket and outputPrefix are required' });
    }

    const jobId = `poster-${uuidv4()}`;
    const job = await posterQueue.add('generate-poster', req.body, {
      jobId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
    });

    logger.info(`Poster job enqueued: ${job.id}`);
    res.status(201).json({ jobId: job.id, queue: config.queues.poster, status: 'queued' });
  } catch (err) {
    logger.error('Failed to enqueue poster job', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ---------- Submit sprite job ----------

app.post('/api/v1/jobs/sprite', async (req, res) => {
  try {
    const { images, outputBucket, outputPrefix } = req.body;

    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'images array is required and must not be empty' });
    }
    if (!outputBucket || !outputPrefix) {
      return res.status(400).json({ error: 'outputBucket and outputPrefix are required' });
    }

    const jobId = `sprite-${uuidv4()}`;
    const job = await spriteQueue.add('generate-sprite', req.body, {
      jobId,
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 },
    });

    logger.info(`Sprite job enqueued: ${job.id}`);
    res.status(201).json({ jobId: job.id, queue: config.queues.sprite, status: 'queued' });
  } catch (err) {
    logger.error('Failed to enqueue sprite job', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ---------- Submit optimize job ----------

app.post('/api/v1/jobs/optimize', async (req, res) => {
  try {
    const { sourceBucket, sourceKey, outputBucket, outputKey } = req.body;

    if (!sourceBucket || !sourceKey) {
      return res.status(400).json({ error: 'sourceBucket and sourceKey are required' });
    }
    if (!outputBucket || !outputKey) {
      return res.status(400).json({ error: 'outputBucket and outputKey are required' });
    }

    const jobId = `optimize-${uuidv4()}`;
    const job = await optimizeQueue.add('optimize-image', req.body, {
      jobId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
    });

    logger.info(`Optimize job enqueued: ${job.id}`);
    res.status(201).json({ jobId: job.id, queue: config.queues.optimize, status: 'queued' });
  } catch (err) {
    logger.error('Failed to enqueue optimize job', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ---------- Job status ----------

app.get('/api/v1/jobs/:id', async (req, res) => {
  const { id } = req.params;

  // Determine which queue this job belongs to by prefix
  let queue;
  if (id.startsWith('poster-')) {
    queue = posterQueue;
  } else if (id.startsWith('sprite-')) {
    queue = spriteQueue;
  } else if (id.startsWith('optimize-')) {
    queue = optimizeQueue;
  } else {
    // Search all queues
    for (const q of Object.values(queueMap)) {
      const found = await q.getJob(id);
      if (found) {
        queue = q;
        break;
      }
    }
  }

  if (!queue) {
    return res.status(404).json({ error: 'Job not found' });
  }

  try {
    const job = await queue.getJob(id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const state = await job.getState();
    const progress = job.progress;
    const result = job.returnvalue;
    const failedReason = job.failedReason;

    res.json({
      jobId: job.id,
      queue: job.queueName,
      state,
      progress,
      result: state === 'completed' ? result : undefined,
      failedReason: state === 'failed' ? failedReason : undefined,
      createdAt: new Date(job.timestamp).toISOString(),
      processedOn: job.processedOn ? new Date(job.processedOn).toISOString() : null,
      finishedOn: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
      attempts: job.attemptsMade,
    });
  } catch (err) {
    logger.error(`Failed to get job ${id}`, { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ---------- 404 ----------

app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// ---------- Error handler ----------

app.use((err, _req, res, _next) => {
  logger.error('Unhandled Express error', { error: err.message, stack: err.stack });
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.nodeEnv === 'development' ? err.message : undefined,
  });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

let server;

function start() {
  server = app.listen(config.server.port, config.server.host, () => {
    logger.info(`thumbnail_generator listening on ${config.server.host}:${config.server.port}`);
    logger.info(`Workers active for queues: ${Object.values(config.queues).join(', ')}`);
  });
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

async function shutdown(signal) {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  // Stop accepting new HTTP connections
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    logger.info('HTTP server closed');
  }

  // Close workers (drain current jobs, then stop)
  await Promise.all([
    posterWorker.close(),
    spriteWorker.close(),
    optimizeWorker.close(),
  ]);
  logger.info('All workers closed');

  // Close queues
  await Promise.all([
    posterQueue.close(),
    spriteQueue.close(),
    optimizeQueue.close(),
  ]);
  logger.info('All queues closed');

  // Close Redis
  await connection.quit();
  logger.info('Redis connection closed');

  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason: String(reason) });
  process.exit(1);
});

// Boot
start();
