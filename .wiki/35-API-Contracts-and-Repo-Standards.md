# 35 - API Contract Documentation and Repo Standardization

## Objective

Eliminate contract drift and folder-level ambiguity.

## API Domains

- auth and session APIs
- family content APIs
- chat messaging APIs
- tv catalog/playback APIs
- antbox/antserver control APIs

## Contract Documentation Template

Each endpoint or GraphQL operation must define:

- purpose
- input schema
- output schema
- auth scope
- rate limits
- error codes
- idempotency behavior

## Repo Standards

- strict root layout: `.claude`, `.codex`, `.github`, `.wiki`, `backend`, `frontend`, `README.md`, `.gitignore`, optional `LICENSE`
- top-level app isolation preserved (`backend` and `frontend`)
- ant runtimes are backend-owned (`backend/antbox`, `backend/antserver`)
- shared contracts versioned and centrally referenced
- all generated artifacts excluded or explicitly managed
- all runtime configs templated by environment
- Node/JS/TS package manager standard is `pnpm`; do not introduce `npm`/`yarn` lockfiles unless explicitly approved
