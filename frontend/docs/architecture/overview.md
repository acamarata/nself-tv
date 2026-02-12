# TV Architecture Overview

## Core Components

- catalog and discovery UI
- playback session manager
- live player surface
- profile and watch-state persistence

## Data and API Dependencies

- media metadata and manifests from backend
- stream admission decisions from stream-gateway
- live event state from antserver integrations

## Playback Requirements

- HLS baseline compatibility
- adaptive quality selection
- stable subtitle/audio track handling
- seek and trickplay support
