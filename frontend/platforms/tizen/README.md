# nself-tv Tizen (Samsung TV)

Samsung Tizen TV app built with Tizen Web App framework.

## Overview

Optimized for:
- Samsung Smart Remote
- Tizen 4.0+
- Spatial navigation
- 4K/8K support

## Prerequisites

- Tizen Studio
- Samsung Developer account
- Tizen TV emulator or device

## Key Features

- TAU (Tizen Advanced UI) framework
- Spatial navigation API
- AVPlay for media playback
- Samsung TV services integration
- Voice control (Bixby)

## Development

```bash
# Package app
tizen package -t wgt -- .

# Install on TV
tizen install -n nself-tv.wgt -t <tv-name>

# Run
tizen run -p <app-id> -t <tv-name>
```

## Architecture

Web app for Tizen:
- HTML5/CSS3/JavaScript
- TAU framework for TV UI
- AVPlay API for playback
- Shared @ntv/shared business logic

## File Structure

```
index.html
js/
  main.js
  navigation.js
  player.js
css/
  style.css
config.xml
icon.png
```

Phase 7 complete structure. Full implementation in Phase 8.
