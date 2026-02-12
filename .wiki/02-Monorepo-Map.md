# 02 - Monorepo Map

## Top-Level Tree

```text
.
├── .claude/
├── .codex/
├── .github/
├── .wiki/
├── backend/
├── frontend/
├── README.md
└── .gitignore
```

## Repository Conventions

1. Root is strict: only approved entries are allowed.
2. `.wiki/` is the canonical public architecture source.
3. Local/private planning and AI guardrails remain in gitignored `.claude/` and `.codex/` folders.
4. Ant runtimes live under backend: `backend/antbox/` and `backend/antserver/`.

## Ownership Boundaries

### backend

1. auth/session/trust contracts
2. schema/API/Hasura contracts
3. orchestration and policy enforcement
4. audit/observability foundations

### frontend

1. VOD and live playback UX
2. multi-platform client parity
3. stream policy and session UX
4. platform-specific client adapters

### antbox

1. edge tuner/capture runtime
2. ingest transport client behavior
3. local resilience and watchdog behavior
4. provisioning/update lifecycle

### antserver

1. schedule intake and event state machine
2. command dispatch and ingest control
3. DVR/commercial/archive lifecycle
4. live operations and analytics APIs

## Implementation Sequence (Recommended)

1. `backend`
2. `frontend` VOD baseline
3. `backend/antserver` core control plane
4. `backend/antbox` enrollment + ingest runtime
5. advanced live/sports features and hardening
