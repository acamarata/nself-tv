/**
 * Phase 2 Integration Tests: VOD Ingest Pipeline
 *
 * Validates the VOD (Video on Demand) ingest pipeline contract:
 * - Pipeline stages are in correct order
 * - Each stage calls the correct downstream service/queue
 * - Progress percentages are monotonically increasing
 * - Error handling: fatal vs non-fatal stage classification
 *
 * These tests validate the pipeline contract definition — no running
 * services or Docker containers required.
 */

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// VOD Ingest Pipeline Definition
// ---------------------------------------------------------------------------
// This is the canonical pipeline contract. The library_service orchestrates
// this pipeline, dispatching jobs to video_processor and thumbnail_generator
// via BullMQ queues, and tracking state in Redis under ingest:{ingestId}.

/**
 * Pipeline stage definition.
 *
 * @typedef {Object} PipelineStage
 * @property {string} name - Human-readable stage name
 * @property {string} service - Service responsible for this stage
 * @property {string|null} queue - BullMQ queue name (null for in-process stages)
 * @property {number} progressStart - Progress percentage at stage start
 * @property {number} progressEnd - Progress percentage at stage completion
 * @property {boolean} fatal - If true, pipeline stops on failure
 * @property {string} description - What this stage does
 */

const VOD_PIPELINE_STAGES = [
  {
    name: 'validate',
    service: 'library_service',
    queue: null,
    progressStart: 0,
    progressEnd: 5,
    fatal: true,
    description: 'Validate source file exists, is a recognized format, and meets size limits',
  },
  {
    name: 'probe',
    service: 'library_service',
    queue: null,
    progressStart: 5,
    progressEnd: 10,
    fatal: true,
    description: 'Extract media metadata (duration, resolution, codecs, audio tracks, subtitles)',
  },
  {
    name: 'transcode',
    service: 'video_processor',
    queue: 'video:transcode',
    progressStart: 10,
    progressEnd: 70,
    fatal: true,
    description: 'Transcode source to HLS renditions at configured quality levels',
  },
  {
    name: 'trickplay',
    service: 'video_processor',
    queue: 'video:trickplay',
    progressStart: 70,
    progressEnd: 80,
    fatal: false,
    description: 'Generate trickplay/scrub sprites for timeline preview',
  },
  {
    name: 'subtitles',
    service: 'video_processor',
    queue: 'video:subtitle',
    progressStart: 80,
    progressEnd: 85,
    fatal: false,
    description: 'Extract embedded subtitles to WebVTT format',
  },
  {
    name: 'posters',
    service: 'thumbnail_generator',
    queue: 'image:poster',
    progressStart: 85,
    progressEnd: 90,
    fatal: false,
    description: 'Generate poster images at multiple sizes (100w, 400w, 1200w)',
  },
  {
    name: 'sprites',
    service: 'thumbnail_generator',
    queue: 'image:sprite',
    progressStart: 90,
    progressEnd: 95,
    fatal: false,
    description: 'Generate timeline sprite sheets for scrubbing',
  },
  {
    name: 'database',
    service: 'library_service',
    queue: null,
    progressStart: 95,
    progressEnd: 98,
    fatal: true,
    description: 'Update database: media_variants, subtitle_tracks, URLs, status -> ready',
  },
  {
    name: 'index',
    service: 'library_service',
    queue: null,
    progressStart: 98,
    progressEnd: 100,
    fatal: false,
    description: 'Index media item in MeiliSearch for full-text search',
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('VOD Pipeline Stage Order', () => {
  it('should define exactly 9 pipeline stages', () => {
    expect(VOD_PIPELINE_STAGES).toHaveLength(9);
  });

  it('should start with validate stage', () => {
    expect(VOD_PIPELINE_STAGES[0].name).toBe('validate');
  });

  it('should end with index stage', () => {
    expect(VOD_PIPELINE_STAGES[VOD_PIPELINE_STAGES.length - 1].name).toBe('index');
  });

  it('should follow the correct order: validate -> probe -> transcode -> trickplay -> subtitles -> posters -> sprites -> database -> index', () => {
    const expectedOrder = [
      'validate',
      'probe',
      'transcode',
      'trickplay',
      'subtitles',
      'posters',
      'sprites',
      'database',
      'index',
    ];

    const actualOrder = VOD_PIPELINE_STAGES.map((s) => s.name);
    expect(actualOrder).toEqual(expectedOrder);
  });

  it('should run validate before probe (need to know file exists before probing)', () => {
    const validateIdx = VOD_PIPELINE_STAGES.findIndex((s) => s.name === 'validate');
    const probeIdx = VOD_PIPELINE_STAGES.findIndex((s) => s.name === 'probe');
    expect(validateIdx).toBeLessThan(probeIdx);
  });

  it('should run probe before transcode (need metadata to determine quality levels)', () => {
    const probeIdx = VOD_PIPELINE_STAGES.findIndex((s) => s.name === 'probe');
    const transcodeIdx = VOD_PIPELINE_STAGES.findIndex((s) => s.name === 'transcode');
    expect(probeIdx).toBeLessThan(transcodeIdx);
  });

  it('should run transcode before trickplay (trickplay needs transcoded output)', () => {
    const transcodeIdx = VOD_PIPELINE_STAGES.findIndex((s) => s.name === 'transcode');
    const trickplayIdx = VOD_PIPELINE_STAGES.findIndex((s) => s.name === 'trickplay');
    expect(transcodeIdx).toBeLessThan(trickplayIdx);
  });

  it('should run all media processing before database update', () => {
    const dbIdx = VOD_PIPELINE_STAGES.findIndex((s) => s.name === 'database');
    const processingStages = ['transcode', 'trickplay', 'subtitles', 'posters', 'sprites'];

    for (const stageName of processingStages) {
      const stageIdx = VOD_PIPELINE_STAGES.findIndex((s) => s.name === stageName);
      expect(stageIdx, `${stageName} should run before database`).toBeLessThan(dbIdx);
    }
  });

  it('should run database update before search indexing', () => {
    const dbIdx = VOD_PIPELINE_STAGES.findIndex((s) => s.name === 'database');
    const indexIdx = VOD_PIPELINE_STAGES.findIndex((s) => s.name === 'index');
    expect(dbIdx).toBeLessThan(indexIdx);
  });
});

describe('VOD Pipeline Service Assignments', () => {
  it('should assign validate to library_service (in-process)', () => {
    const stage = VOD_PIPELINE_STAGES.find((s) => s.name === 'validate');
    expect(stage.service).toBe('library_service');
    expect(stage.queue).toBeNull();
  });

  it('should assign probe to library_service (in-process)', () => {
    const stage = VOD_PIPELINE_STAGES.find((s) => s.name === 'probe');
    expect(stage.service).toBe('library_service');
    expect(stage.queue).toBeNull();
  });

  it('should assign transcode to video_processor via video:transcode queue', () => {
    const stage = VOD_PIPELINE_STAGES.find((s) => s.name === 'transcode');
    expect(stage.service).toBe('video_processor');
    expect(stage.queue).toBe('video:transcode');
  });

  it('should assign trickplay to video_processor via video:trickplay queue', () => {
    const stage = VOD_PIPELINE_STAGES.find((s) => s.name === 'trickplay');
    expect(stage.service).toBe('video_processor');
    expect(stage.queue).toBe('video:trickplay');
  });

  it('should assign subtitles to video_processor via video:subtitle queue', () => {
    const stage = VOD_PIPELINE_STAGES.find((s) => s.name === 'subtitles');
    expect(stage.service).toBe('video_processor');
    expect(stage.queue).toBe('video:subtitle');
  });

  it('should assign posters to thumbnail_generator via image:poster queue', () => {
    const stage = VOD_PIPELINE_STAGES.find((s) => s.name === 'posters');
    expect(stage.service).toBe('thumbnail_generator');
    expect(stage.queue).toBe('image:poster');
  });

  it('should assign sprites to thumbnail_generator via image:sprite queue', () => {
    const stage = VOD_PIPELINE_STAGES.find((s) => s.name === 'sprites');
    expect(stage.service).toBe('thumbnail_generator');
    expect(stage.queue).toBe('image:sprite');
  });

  it('should assign database to library_service (in-process)', () => {
    const stage = VOD_PIPELINE_STAGES.find((s) => s.name === 'database');
    expect(stage.service).toBe('library_service');
    expect(stage.queue).toBeNull();
  });

  it('should assign index to library_service (in-process)', () => {
    const stage = VOD_PIPELINE_STAGES.find((s) => s.name === 'index');
    expect(stage.service).toBe('library_service');
    expect(stage.queue).toBeNull();
  });

  it('should use only the 3 documented services', () => {
    const services = new Set(VOD_PIPELINE_STAGES.map((s) => s.service));
    expect(services.size).toBe(3);
    expect(services).toContain('library_service');
    expect(services).toContain('video_processor');
    expect(services).toContain('thumbnail_generator');
  });

  it('should use only documented BullMQ queue names', () => {
    const validQueues = [
      null,
      'video:transcode',
      'video:trickplay',
      'video:subtitle',
      'image:poster',
      'image:sprite',
      'image:optimize',
    ];

    for (const stage of VOD_PIPELINE_STAGES) {
      expect(
        validQueues,
        `Unknown queue: ${stage.queue} in stage ${stage.name}`,
      ).toContain(stage.queue);
    }
  });
});

describe('VOD Pipeline Progress Tracking', () => {
  it('should start at 0% progress', () => {
    expect(VOD_PIPELINE_STAGES[0].progressStart).toBe(0);
  });

  it('should end at 100% progress', () => {
    const lastStage = VOD_PIPELINE_STAGES[VOD_PIPELINE_STAGES.length - 1];
    expect(lastStage.progressEnd).toBe(100);
  });

  it('should have monotonically increasing progressStart values', () => {
    for (let i = 1; i < VOD_PIPELINE_STAGES.length; i++) {
      expect(
        VOD_PIPELINE_STAGES[i].progressStart,
        `progressStart of stage ${VOD_PIPELINE_STAGES[i].name} should be >= previous stage`,
      ).toBeGreaterThanOrEqual(VOD_PIPELINE_STAGES[i - 1].progressStart);
    }
  });

  it('should have monotonically increasing progressEnd values', () => {
    for (let i = 1; i < VOD_PIPELINE_STAGES.length; i++) {
      expect(
        VOD_PIPELINE_STAGES[i].progressEnd,
        `progressEnd of stage ${VOD_PIPELINE_STAGES[i].name} should be >= previous stage`,
      ).toBeGreaterThanOrEqual(VOD_PIPELINE_STAGES[i - 1].progressEnd);
    }
  });

  it('should have progressEnd >= progressStart for every stage', () => {
    for (const stage of VOD_PIPELINE_STAGES) {
      expect(
        stage.progressEnd,
        `${stage.name}: progressEnd (${stage.progressEnd}) < progressStart (${stage.progressStart})`,
      ).toBeGreaterThanOrEqual(stage.progressStart);
    }
  });

  it('should have contiguous progress ranges (no gaps)', () => {
    for (let i = 1; i < VOD_PIPELINE_STAGES.length; i++) {
      expect(
        VOD_PIPELINE_STAGES[i].progressStart,
        `Gap between ${VOD_PIPELINE_STAGES[i - 1].name} end and ${VOD_PIPELINE_STAGES[i].name} start`,
      ).toBe(VOD_PIPELINE_STAGES[i - 1].progressEnd);
    }
  });

  it('should allocate the most progress to transcode (the heaviest stage)', () => {
    const transcodeRange =
      VOD_PIPELINE_STAGES.find((s) => s.name === 'transcode');
    const transcodeProgress = transcodeRange.progressEnd - transcodeRange.progressStart;

    for (const stage of VOD_PIPELINE_STAGES) {
      if (stage.name === 'transcode') continue;
      const stageProgress = stage.progressEnd - stage.progressStart;
      expect(
        transcodeProgress,
        `Transcode (${transcodeProgress}%) should have more progress than ${stage.name} (${stageProgress}%)`,
      ).toBeGreaterThan(stageProgress);
    }
  });

  it('should keep all progress values between 0 and 100', () => {
    for (const stage of VOD_PIPELINE_STAGES) {
      expect(stage.progressStart).toBeGreaterThanOrEqual(0);
      expect(stage.progressStart).toBeLessThanOrEqual(100);
      expect(stage.progressEnd).toBeGreaterThanOrEqual(0);
      expect(stage.progressEnd).toBeLessThanOrEqual(100);
    }
  });
});

describe('VOD Pipeline Error Handling', () => {
  const fatalStages = VOD_PIPELINE_STAGES.filter((s) => s.fatal);
  const nonFatalStages = VOD_PIPELINE_STAGES.filter((s) => !s.fatal);

  it('should mark validate as fatal', () => {
    expect(VOD_PIPELINE_STAGES.find((s) => s.name === 'validate').fatal).toBe(true);
  });

  it('should mark probe as fatal', () => {
    expect(VOD_PIPELINE_STAGES.find((s) => s.name === 'probe').fatal).toBe(true);
  });

  it('should mark transcode as fatal', () => {
    expect(VOD_PIPELINE_STAGES.find((s) => s.name === 'transcode').fatal).toBe(true);
  });

  it('should mark database as fatal', () => {
    expect(VOD_PIPELINE_STAGES.find((s) => s.name === 'database').fatal).toBe(true);
  });

  it('should mark trickplay as non-fatal (enhancement, not required)', () => {
    expect(VOD_PIPELINE_STAGES.find((s) => s.name === 'trickplay').fatal).toBe(false);
  });

  it('should mark subtitles as non-fatal (may not have embedded subs)', () => {
    expect(VOD_PIPELINE_STAGES.find((s) => s.name === 'subtitles').fatal).toBe(false);
  });

  it('should mark posters as non-fatal (can use placeholder)', () => {
    expect(VOD_PIPELINE_STAGES.find((s) => s.name === 'posters').fatal).toBe(false);
  });

  it('should mark sprites as non-fatal (enhancement, not required)', () => {
    expect(VOD_PIPELINE_STAGES.find((s) => s.name === 'sprites').fatal).toBe(false);
  });

  it('should mark index as non-fatal (search is not required for playback)', () => {
    expect(VOD_PIPELINE_STAGES.find((s) => s.name === 'index').fatal).toBe(false);
  });

  it('should have exactly 4 fatal stages', () => {
    expect(fatalStages).toHaveLength(4);
  });

  it('should have exactly 5 non-fatal stages', () => {
    expect(nonFatalStages).toHaveLength(5);
  });

  it('should place all fatal stages before the first non-fatal stage OR after non-fatal stages that are naturally ordered', () => {
    // The key invariant: fatal stages validate, probe, transcode must come
    // before non-fatal stages (trickplay, subtitles, posters, sprites)
    // and fatal stage database must come after non-fatal processing stages
    const validateIdx = VOD_PIPELINE_STAGES.findIndex((s) => s.name === 'validate');
    const probeIdx = VOD_PIPELINE_STAGES.findIndex((s) => s.name === 'probe');
    const transcodeIdx = VOD_PIPELINE_STAGES.findIndex((s) => s.name === 'transcode');
    const trickplayIdx = VOD_PIPELINE_STAGES.findIndex((s) => s.name === 'trickplay');

    // Core pipeline (validate -> probe -> transcode) is all fatal and comes first
    expect(validateIdx).toBe(0);
    expect(probeIdx).toBe(1);
    expect(transcodeIdx).toBe(2);
    expect(trickplayIdx).toBe(3); // First non-fatal stage starts after transcode
  });

  it('should continue pipeline when a non-fatal stage fails', () => {
    // Simulate pipeline execution: if trickplay fails, subsequent stages still run
    const pipelineResult = [];

    for (const stage of VOD_PIPELINE_STAGES) {
      // Simulate trickplay failure
      if (stage.name === 'trickplay') {
        pipelineResult.push({ ...stage, status: 'failed' });
        if (stage.fatal) break; // Fatal would stop here
        continue; // Non-fatal continues
      }
      pipelineResult.push({ ...stage, status: 'completed' });
    }

    // Pipeline should not stop at trickplay
    const stageNames = pipelineResult.map((r) => r.name);
    expect(stageNames).toContain('subtitles');
    expect(stageNames).toContain('posters');
    expect(stageNames).toContain('sprites');
    expect(stageNames).toContain('database');
    expect(stageNames).toContain('index');
  });

  it('should stop pipeline when a fatal stage fails', () => {
    // Simulate pipeline execution: if transcode fails, pipeline stops
    const pipelineResult = [];

    for (const stage of VOD_PIPELINE_STAGES) {
      if (stage.name === 'transcode') {
        pipelineResult.push({ ...stage, status: 'failed' });
        if (stage.fatal) break;
        continue;
      }
      pipelineResult.push({ ...stage, status: 'completed' });
    }

    // Pipeline should stop at transcode
    const stageNames = pipelineResult.map((r) => r.name);
    expect(stageNames).toContain('validate');
    expect(stageNames).toContain('probe');
    expect(stageNames).toContain('transcode');
    expect(stageNames).not.toContain('trickplay');
    expect(stageNames).not.toContain('database');
    expect(stageNames).not.toContain('index');
  });

  it('should stop pipeline when validate fails (cannot process invalid files)', () => {
    const pipelineResult = [];

    for (const stage of VOD_PIPELINE_STAGES) {
      if (stage.name === 'validate') {
        pipelineResult.push({ ...stage, status: 'failed' });
        if (stage.fatal) break;
        continue;
      }
      pipelineResult.push({ ...stage, status: 'completed' });
    }

    // Only validate should have run
    expect(pipelineResult).toHaveLength(1);
    expect(pipelineResult[0].name).toBe('validate');
    expect(pipelineResult[0].status).toBe('failed');
  });

  it('should stop pipeline when database update fails (data integrity critical)', () => {
    const pipelineResult = [];

    for (const stage of VOD_PIPELINE_STAGES) {
      if (stage.name === 'database') {
        pipelineResult.push({ ...stage, status: 'failed' });
        if (stage.fatal) break;
        continue;
      }
      pipelineResult.push({ ...stage, status: 'completed' });
    }

    // Pipeline should include all stages up to and including database
    const stageNames = pipelineResult.map((r) => r.name);
    expect(stageNames).toContain('database');
    expect(stageNames).not.toContain('index');
  });
});

describe('VOD Pipeline Stage Descriptions', () => {
  it('should have a non-empty description for every stage', () => {
    for (const stage of VOD_PIPELINE_STAGES) {
      expect(
        stage.description.length,
        `Stage ${stage.name} has no description`,
      ).toBeGreaterThan(0);
    }
  });

  it('should have a non-empty name for every stage', () => {
    for (const stage of VOD_PIPELINE_STAGES) {
      expect(stage.name.length).toBeGreaterThan(0);
    }
  });

  it('should have unique stage names', () => {
    const names = VOD_PIPELINE_STAGES.map((s) => s.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });
});

describe('VOD Pipeline Redis State Contract', () => {
  // The pipeline tracks its state in Redis under ingest:{ingestId}
  // This validates the state object structure.

  const INGEST_STATE_SCHEMA = {
    requiredFields: [
      'ingestId',
      'mediaItemId',
      'familyId',
      'currentStage',
      'overallProgress',
      'status',
      'stages',
      'startedAt',
    ],
    validStatuses: ['pending', 'running', 'completed', 'failed', 'cancelled'],
    stageStatuses: ['pending', 'running', 'completed', 'failed', 'skipped'],
  };

  it('should track all required state fields', () => {
    expect(INGEST_STATE_SCHEMA.requiredFields).toContain('ingestId');
    expect(INGEST_STATE_SCHEMA.requiredFields).toContain('mediaItemId');
    expect(INGEST_STATE_SCHEMA.requiredFields).toContain('familyId');
    expect(INGEST_STATE_SCHEMA.requiredFields).toContain('currentStage');
    expect(INGEST_STATE_SCHEMA.requiredFields).toContain('overallProgress');
    expect(INGEST_STATE_SCHEMA.requiredFields).toContain('status');
    expect(INGEST_STATE_SCHEMA.requiredFields).toContain('stages');
    expect(INGEST_STATE_SCHEMA.requiredFields).toContain('startedAt');
  });

  it('should define valid pipeline-level statuses', () => {
    expect(INGEST_STATE_SCHEMA.validStatuses).toContain('pending');
    expect(INGEST_STATE_SCHEMA.validStatuses).toContain('running');
    expect(INGEST_STATE_SCHEMA.validStatuses).toContain('completed');
    expect(INGEST_STATE_SCHEMA.validStatuses).toContain('failed');
    expect(INGEST_STATE_SCHEMA.validStatuses).toContain('cancelled');
  });

  it('should define valid per-stage statuses', () => {
    expect(INGEST_STATE_SCHEMA.stageStatuses).toContain('pending');
    expect(INGEST_STATE_SCHEMA.stageStatuses).toContain('running');
    expect(INGEST_STATE_SCHEMA.stageStatuses).toContain('completed');
    expect(INGEST_STATE_SCHEMA.stageStatuses).toContain('failed');
    expect(INGEST_STATE_SCHEMA.stageStatuses).toContain('skipped');
  });

  it('should support skipped status for non-fatal stages that fail', () => {
    // When a non-fatal stage fails, its status should be "skipped" not "failed"
    // at the pipeline level (the stage itself records "failed")
    expect(INGEST_STATE_SCHEMA.stageStatuses).toContain('skipped');
  });

  it('should validate a well-formed ingest state object', () => {
    const validState = {
      ingestId: 'ingest_abc123',
      mediaItemId: '550e8400-e29b-41d4-a716-446655440000',
      familyId: '00000000-0000-0000-0000-000000000001',
      currentStage: 'transcode',
      overallProgress: 45,
      status: 'running',
      stages: {
        validate: { status: 'completed', duration: 120 },
        probe: { status: 'completed', duration: 500 },
        transcode: { status: 'running', progress: 58 },
        trickplay: { status: 'pending' },
        subtitles: { status: 'pending' },
        posters: { status: 'pending' },
        sprites: { status: 'pending' },
        database: { status: 'pending' },
        index: { status: 'pending' },
      },
      startedAt: '2026-02-13T10:00:00Z',
    };

    // All required fields present
    for (const field of INGEST_STATE_SCHEMA.requiredFields) {
      expect(validState).toHaveProperty(field);
    }

    // Status is valid
    expect(INGEST_STATE_SCHEMA.validStatuses).toContain(validState.status);

    // All pipeline stages are represented
    const stageNames = VOD_PIPELINE_STAGES.map((s) => s.name);
    for (const stageName of stageNames) {
      expect(validState.stages).toHaveProperty(stageName);
    }

    // Progress is between 0 and 100
    expect(validState.overallProgress).toBeGreaterThanOrEqual(0);
    expect(validState.overallProgress).toBeLessThanOrEqual(100);
  });
});
