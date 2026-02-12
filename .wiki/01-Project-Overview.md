# 01 - Project Overview

## Mission

Build an open-source, self-hostable TV platform that can be:

1. operated standalone
2. integrated into the nSelf ecosystem
3. customized/white-labeled for different deployments

## Product Pillars

1. VOD media platform (library, playback, metadata, subtitles, multi-bitrate delivery).
2. Live capture and recording platform (AntBox + AntServer ingest/orchestration).
3. Sports and event workflows (NFL-first, extensible sports integrations).
4. Podcast platform (feed ingest, audio playback, subscriptions, offline downloads).
5. Game emulation platform ("Netflix for Games" — modular emulators, ROM management, save sync).
6. Multi-platform delivery (Web, Desktop Mac/Win/Linux, Mobile iOS/Android, TV Android TV/Roku/webOS/tvOS/Tizen/Fire TV, nTV OS).
7. nTV OS — immutable Linux appliance OS for mini-PCs (Batocera-like set-top box experience).
8. White-label and backend-URL configuration (any client connects to any backend, custom branding/features).
9. Operations-first platform engineering (security, observability, backup/restore, runbooks).

## Why This Exists

1. Commercial streaming and DVR stacks are expensive, restrictive, or non-portable.
2. Self-hosters need production guidance without cloud lock-in.
3. nSelf should be demonstrably capable of powering media-heavy workloads.

## Non-Goals for Initial Planning Stage

1. Shipping code before contracts/gates are defined.
2. Treating edge and live components as optional afterthoughts.
3. Relaxing quality/security gates for speed.

## Delivery Philosophy

1. Planning-first and docs-first.
2. Phase-based execution (`v0.1` to `v0.11`) with strict quality gates.
3. `v1.0` only after full RC hardening, per-platform certification, and no-miss feature audit.
