# antserver

Cloud ingest and orchestration service for live capture, scheduling, and DVR lifecycle.

## Responsibilities

- receive and validate AntBox ingest streams
- coordinate event schedules and tuner assignments
- run recording lifecycle orchestration
- trigger post-processing and media indexing workflows
- provide control APIs and operational visibility

## Folder Map

```text
antserver/
├── ingest/
├── scheduler/
├── dvr/
├── metadata/
├── api/
├── workers/
├── configs/
├── scripts/
├── docs/
```

## Documentation

- `docs/architecture/overview.md`
- `docs/pipelines/event-lifecycle.md`
- `docs/ops/operations.md`
- `docs/security/trust-boundary.md`
