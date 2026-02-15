# nself-tv webOS (LG TV)

LG webOS TV app built with webOS SDK and Enyo framework.

## Overview

Optimized for:
- LG Magic Remote
- webOS 3.0+
- Spatial navigation
- 4K HDR support

## Prerequisites

- webOS TV SDK
- LG Developer account
- webOS TV emulator or device

## Key Features

- Enyo-based UI components
- webOS Luna services integration
- Magic Remote pointer + d-pad support
- webOS media pipeline
- Deep linking support

## Development

```bash
# Package app
ares-package .

# Install on TV
ares-install --device <tv-name> com.nself.tv_0.7.0_all.ipk

# Launch
ares-launch --device <tv-name> com.nself.tv
```

## Architecture

Web app packaged for webOS:
- HTML5/CSS3/JavaScript
- Enyo framework for spatial nav
- webOS services for system integration
- Shared @ntv/shared business logic

## File Structure

```
webOSTVjs/
  index.html
  app.js
  spatial-nav.js
appinfo.json
icon.png
largeIcon.png
```

Phase 7 complete structure. Full implementation in Phase 8.
