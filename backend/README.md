# backend

Canonical nTV backend workspace.

This directory is the demo nSelf CLI generated stack or self-hosted backend foundation for this open-source app.

## Responsibilities

1. Identity/auth/session and service trust boundaries.
2. Data contracts for media catalog, playback sessions, schedules, and recordings.
3. Policy enforcement, audit logging, and governance telemetry.
4. Jobs/orchestration contracts for ingest, processing, metadata, and publishing.
5. Ant runtime control surfaces:
- `backend/antbox/` for edge capture runtime.
- `backend/antserver/` for ingest and DVR command-center runtime.

## Recommended Tech Direction

1. Postgres as source-of-truth datastore.
2. Hasura for GraphQL contract and permission layer.
3. Go services for orchestration and non-CRUD logic.
4. Redis (optional) for queue/transient orchestration state.

## Folder Map

```text
backend/
├── apps/
├── db/
│   ├── migrations/
│   ├── schemas/
│   └── seed/
├── services/
├── hasura/
├── infra/
├── scripts/
├── antbox/
├── antserver/
└── docs/
```

## Environment Expectations

1. Local: nSelf CLI plus deterministic local dependencies.
2. Staging: production-like contracts and migration rehearsal.
3. Production: hardened Hetzner VPS deployment with HOS integration.
