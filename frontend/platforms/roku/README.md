# nself-tv Roku

Roku channel built with BrightScript and SceneGraph XML.

## Overview

Optimized for:
- Roku remote navigation
- SceneGraph UI framework
- Roku OS 10.0+
- 720p/1080p/4K playback

## Prerequisites

- Roku device in developer mode
- Roku SDK
- ZIP for sideloading

## Key Features

- RowList for content browsing
- Details screen with metadata
- Video player with HLS support
- Search with on-screen keyboard
- Continue watching persistence
- Recommendations feed

## Development

```bash
# Package channel
zip -r nself-tv.zip . -x ".*" -x "__MACOSX"

# Install on device
curl -u rokudev:<password> -F "mysubmit=Install" -F "archive=@nself-tv.zip" http://<roku-ip>/plugin_install
```

## Architecture

- BrightScript for business logic
- SceneGraph XML for UI
- Task nodes for async operations
- Registry for local storage

## File Structure

```
components/
  screens/
    HomeScreen.brs/xml
    DetailsScreen.brs/xml
    PlayerScreen.brs/xml
  tasks/
    ContentTask.brs/xml
source/
  Main.brs
  ContentFeed.brs
manifest
```

Phase 7 complete structure. Full implementation in Phase 8.
