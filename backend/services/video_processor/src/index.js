/**
 * Video Processor Service — Main Entry Point
 *
 * Initialises Redis, starts the three BullMQ workers (transcode, trickplay,
 * subtitle), and exposes an Express HTTP API for health checks, queue status,
 * and job submission.
 */

require('dotenv').config();

const express = require('express');
const Redis = require('ioredis');
const { Queue } = require('bullmq');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const config = require('./config');
const logger = require('./logger');
const { createTranscodeWorker } = require('./workers/transcode-worker');
const { createTrickplayWorker } = require('./workers/trickplay-worker');
const { createSubtitleWorker } = require('./workers/subtitle-worker');

// ---------------------------------------------------------------------------
// Redis
// ---------------------------------------------------------------------------

const connection = new Redis(config.redis);

connection.on('connect', () => logger.info('Redis connected'));
connection.on('error', (err) =>
  logger.error(`Redis error: ${err.message}`, { error: err.stack }),
);

// ---------------------------------------------------------------------------
// Queues (used by the API to submit jobs and query status)
// ---------------------------------------------------------------------------

const transcodeQueue = new Queue(config.queues.transcode, { connection });
const trickplayQueue = new Queue(config.queues.trickplay, { connection });
const subtitleQueue = new Queue(config.queues.subtitle, { connection });

// Map for looking up queues by type
const queueMap = {
  transcode: transcodeQueue,
  trickplay: trickplayQueue,
  subtitle: subtitleQueue,
};

// ---------------------------------------------------------------------------
// Workers
// ---------------------------------------------------------------------------

const transcodeWorker = createTranscodeWorker(config.redis);
const trickplayWorker = createTrickplayWorker(config.redis);
const subtitleWorker = createSubtitleWorker(config.redis);

// Ensure temp directory exists
fs.mkdirSync(config.tempDir, { recursive: true });

// ---------------------------------------------------------------------------
// Express HTTP API
// ---------------------------------------------------------------------------

const app = express();
app.use(express.json());

// ---- Health ----

app.get('/health', async (req, res) => {
  try {
    const ping = await connection.ping();
    const [transcodeStats, trickplayStats, subtitleStats] = await Promise.all([
      transcodeQueue.getJobCounts(),
      trickplayQueue.getJobCounts(),
      subtitleQueue.getJobCounts(),
    ]);

    res.json({
      status: 'healthy',
      service: 'video_processor',
      timestamp: new Date().toISOString(),
      redis: ping === 'PONG' ? 'connected' : 'degraded',
      queues: {
        [config.queues.transcode]: transcodeStats,
        [config.queues.trickplay]: trickplayStats,
        [config.queues.subtitle]: subtitleStats,
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'video_processor',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// ---- Queue status ----

app.get('/api/v1/queues/status', async (req, res) => {
  try {
    const [transcodeStats, trickplayStats, subtitleStats] = await Promise.all([
      transcodeQueue.getJobCounts(),
      trickplayQueue.getJobCounts(),
      subtitleQueue.getJobCounts(),
    ]);

    res.json({
      [config.queues.transcode]: transcodeStats,
      [config.queues.trickplay]: trickplayStats,
      [config.queues.subtitle]: subtitleStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---- Submit transcode job ----

app.post('/api/v1/jobs/transcode', async (req, res) => {
  try {
    const {
      sourceBucket,
      sourceKey,
      outputBucket,
      outputPrefix,
      familyId,
      mediaId,
      priority,
    } = req.body;

    if (!sourceBucket || !sourceKey) {
      return res
        .status(400)
        .json({ error: 'Missing required fields: sourceBucket, sourceKey' });
    }

    const jobId = uuidv4();
    const job = await transcodeQueue.add(
      'transcode',
      {
        sourceBucket,
        sourceKey,
        outputBucket: outputBucket || config.minio.buckets.output,
        outputPrefix: outputPrefix || `transcode/${jobId}`,
        familyId: familyId || null,
        mediaId: mediaId || null,
      },
      {
        jobId,
        priority: priority || 0,
        attempts: 2,
        backoff: { type: 'exponential', delay: 30000 },
      },
    );

    res.status(202).json({
      jobId: job.id,
      queue: config.queues.transcode,
      status: 'queued',
    });
  } catch (error) {
    logger.error(`Failed to enqueue transcode job: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// ---- Submit trickplay job ----

app.post('/api/v1/jobs/trickplay', async (req, res) => {
  try {
    const {
      sourceBucket,
      sourceKey,
      outputBucket,
      outputPrefix,
      interval,
      priority,
    } = req.body;

    if (!sourceBucket || !sourceKey) {
      return res
        .status(400)
        .json({ error: 'Missing required fields: sourceBucket, sourceKey' });
    }

    const jobId = uuidv4();
    const job = await trickplayQueue.add(
      'trickplay',
      {
        sourceBucket,
        sourceKey,
        outputBucket: outputBucket || config.minio.buckets.thumbnails,
        outputPrefix: outputPrefix || `trickplay/${jobId}`,
        interval: interval || 5,
      },
      {
        jobId,
        priority: priority || 0,
        attempts: 2,
        backoff: { type: 'exponential', delay: 15000 },
      },
    );

    res.status(202).json({
      jobId: job.id,
      queue: config.queues.trickplay,
      status: 'queued',
    });
  } catch (error) {
    logger.error(`Failed to enqueue trickplay job: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// ---- Submit subtitle job ----

app.post('/api/v1/jobs/subtitle', async (req, res) => {
  try {
    const {
      sourceBucket,
      sourceKey,
      outputBucket,
      outputPrefix,
      priority,
    } = req.body;

    if (!sourceBucket || !sourceKey) {
      return res
        .status(400)
        .json({ error: 'Missing required fields: sourceBucket, sourceKey' });
    }

    const jobId = uuidv4();
    const job = await subtitleQueue.add(
      'subtitle',
      {
        sourceBucket,
        sourceKey,
        outputBucket: outputBucket || config.minio.buckets.subtitles,
        outputPrefix: outputPrefix || `subtitles/${jobId}`,
      },
      {
        jobId,
        priority: priority || 0,
        attempts: 2,
        backoff: { type: 'exponential', delay: 15000 },
      },
    );

    res.status(202).json({
      jobId: job.id,
      queue: config.queues.subtitle,
      status: 'queued',
    });
  } catch (error) {
    logger.error(`Failed to enqueue subtitle job: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// ---- Get job status ----

app.get('/api/v1/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Search all queues for the job
    for (const [queueType, queue] of Object.entries(queueMap)) {
      const job = await queue.getJob(id);
      if (job) {
        const state = await job.getState();
        const progress = job.progress;
        const result = job.returnvalue;
        const failedReason = job.failedReason;

        return res.json({
          jobId: job.id,
          queue: queue.name,
          type: queueType,
          state,
          progress,
          data: job.data,
          result: result || null,
          failedReason: failedReason || null,
          createdAt: new Date(job.timestamp).toISOString(),
          processedAt: job.processedOn
            ? new Date(job.processedOn).toISOString()
            : null,
          completedAt: job.finishedOn
            ? new Date(job.finishedOn).toISOString()
            : null,
          attemptsMade: job.attemptsMade,
        });
      }
    }

    res.status(404).json({ error: `Job ${id} not found` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---- 404 ----

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

// ---- Error handler ----

app.use((err, req, res, _next) => {
  logger.error(`Unhandled error: ${err.message}`, { error: err.stack });
  res.status(500).json({
    error: 'Internal Server Error',
    message:
      config.nodeEnv === 'development' ? err.message : 'Something went wrong',
  });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

const server = app.listen(config.server.port, config.server.host, () => {
  logger.info(
    `video_processor listening on ${config.server.host}:${config.server.port}`,
  );
  logger.info(`Workers active: ${config.queues.transcode}, ${config.queues.trickplay}, ${config.queues.subtitle}`);
  logger.info(`Worker concurrency: ${config.worker.concurrency}`);
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

async function shutdown(signal) {
  logger.info(`Received ${signal}, shutting down gracefully`);

  // Stop accepting new HTTP connections
  server.close();

  try {
    // Close workers (allows in-flight jobs to finish)
    await Promise.all([
      transcodeWorker.close(),
      trickplayWorker.close(),
      subtitleWorker.close(),
    ]);
    logger.info('Workers closed');

    // Close queues
    await Promise.all([
      transcodeQueue.close(),
      trickplayQueue.close(),
      subtitleQueue.close(),
    ]);
    logger.info('Queues closed');

    // Disconnect Redis
    await connection.quit();
    logger.info('Redis disconnected');

    process.exit(0);
  } catch (err) {
    logger.error(`Error during shutdown: ${err.message}`);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
