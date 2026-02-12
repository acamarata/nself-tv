# 00 - Repository Structure Policy

## Purpose

Keep the repository root clean, predictable, and automation-friendly.

## Allowed Root Entries

The root should contain only:

1. `.claude/` (local AI planning and execution artifacts)
2. `.codex/` (local Codex artifacts)
3. `.github/` (workflows/automation)
4. `.wiki/` (canonical markdown wiki source)
5. `backend/` (nSelf backend stack and backend-owned runtimes)
6. `frontend/` (Next.js app workspace and client platforms)
7. `README.md`
8. `.gitignore`

Optional root file:

1. `LICENSE` (recommended once final OSS license is approved)

## Strict Rules

1. Do not create ad-hoc root folders for planning, drafts, exports, or temp files.
2. Store AI plans, notes, scratch output, and run artifacts only in `.claude/` or `.codex/`.
3. Keep public docs in `.wiki/`, not in `/docs`.
4. Keep Ant runtimes under backend ownership:
- `backend/antbox/`
- `backend/antserver/`
5. Any proposed new root entry must include:
- technical justification
- impact analysis
- update to this policy file
- update to root-layout guard script

## Enforcement

1. CI guard: `.github/workflows/repo-structure-guard.yml`
2. Validation script: `.github/scripts/validate-root-layout.sh`

## Notes on License Placement

If you want GitHub license detection, keep a root `LICENSE` file.
You can still keep human-friendly legal pages in `.wiki/LICENSE.md` and link them from `Home.md` or `_Footer.md`.
