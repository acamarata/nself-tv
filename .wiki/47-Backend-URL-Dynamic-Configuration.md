# 47 - Backend-URL Dynamic Configuration Spec

## Objective

Define how every nTV client (web, mobile, desktop, TV, nTV OS) discovers and connects to its backend, fetches tenant configuration (branding, theme, feature flags), and handles white-label deployment without code changes.

## Core Concept

Every nTV deployment has a backend server. Clients connect to it by URL or IP address. The backend serves a public configuration endpoint that provides everything the client needs to brand itself and know which features are enabled.

**Two deployment models:**

1. **Default nTV app**: user installs the generic nTV app and enters their backend URL on first launch
2. **White-labeled build**: developer pre-configures the backend URL at build time, user sees a branded experience immediately

Both models use the same configuration protocol.

## Configuration Endpoint

### `GET /api/v1/config`

**Authentication**: none required (public endpoint)

**Response**:

```json
{
  "schema_version": 1,
  "instance": {
    "name": "FamilyTV",
    "tagline": "Our Family Entertainment Hub",
    "locale": "en-US",
    "timezone": "America/New_York"
  },
  "branding": {
    "logo_url": "/assets/branding/logo.svg",
    "logo_dark_url": "/assets/branding/logo-dark.svg",
    "favicon_url": "/assets/branding/favicon.ico",
    "splash_image_url": "/assets/branding/splash.png",
    "accent_color": "#1a73e8",
    "accent_color_dark": "#4fc3f7",
    "background_color": "#0d1117",
    "surface_color": "#161b22",
    "text_color": "#e6edf3",
    "font_family": "Inter, system-ui, sans-serif"
  },
  "features": {
    "vod_enabled": true,
    "live_tv_enabled": true,
    "sports_enabled": true,
    "podcasts_enabled": true,
    "games_enabled": true,
    "games_max_tier": 3,
    "offline_downloads_enabled": true,
    "admin_panel_enabled": true
  },
  "auth": {
    "device_code_enabled": true,
    "oauth_providers": ["google"],
    "registration_open": false
  },
  "api": {
    "graphql_url": "/graphql",
    "rest_base_url": "/api/v1",
    "websocket_url": "/ws",
    "media_base_url": "https://media.myfamily.com"
  },
  "update": {
    "ntv_os_update_url": "https://updates.myfamily.com/ntv-os",
    "ntv_os_update_channel": "stable"
  }
}
```

### `PUT /api/v1/config`

**Authentication**: `OWNER` or `ADMIN` role required

Updates tenant configuration. Accepts partial updates (merge semantics).

### `POST /api/v1/bootstrap`

**Authentication**: none (one-time use, disabled after first call)

Creates the initial tenant with owner account. Request body includes:

```json
{
  "owner_email": "admin@myfamily.com",
  "owner_password": "...",
  "instance_name": "FamilyTV",
  "locale": "en-US",
  "timezone": "America/New_York"
}
```

Returns: owner auth tokens + default config.

Endpoint disables itself after successful call (re-enable requires DB flag reset).

## Client Discovery Flow

### First Launch (generic nTV app)

```
1. App starts -> check local storage for saved backend URL
2. No URL found -> show "Connect to Server" screen
3. User enters: tv.myfamily.com or 192.168.1.50:8080
4. App constructs: https://{input}/api/v1/config
   - if no scheme provided, try HTTPS first, fall back to HTTP for local IPs
5. Fetch config endpoint
6. On success:
   - save backend URL to local storage
   - apply branding (logo, colors, name)
   - proceed to auth screen
7. On failure:
   - show error with retry option
   - suggest checking URL and network connectivity
   - option to enter different URL
```

### First Launch (white-labeled build)

```
1. App starts with compiled-in backend URL
2. Fetch config endpoint (same as above)
3. On success: apply branding, proceed to auth
4. On failure: show connection error with retry (no URL change option)
```

### Subsequent Launches

```
1. Load backend URL and cached config from local storage
2. Display UI immediately using cached config (instant startup)
3. Fetch fresh config in background
4. If config changed: apply updates (theme, feature flags) live
5. If backend unreachable: continue with cached config, show connectivity warning
```

## Config Caching

### Cache Strategy

- store full config JSON in platform-appropriate local storage:
  - Web: `localStorage`
  - Mobile: `SharedPreferences` (Android) / `UserDefaults` (iOS)
  - Desktop: `~/.ntv/config.json`
  - nTV OS: `/data/config/tenant.json`
  - Android TV: `SharedPreferences`
- cache TTL: 1 hour (background refresh)
- stale-while-revalidate: always use cache for instant startup, refresh in background

### Config Version Tracking

- `schema_version` field in config response
- client checks version on each fetch
- if server schema_version > client's supported version: prompt app update
- if server schema_version < client's supported version: use backward-compatible defaults

## Dynamic Theming

### How Config Drives the UI

```
// Pseudocode for applying tenant config to theme
function applyTenantTheme(config):
  setCSSVariable('--accent-color', config.branding.accent_color)
  setCSSVariable('--accent-color-dark', config.branding.accent_color_dark)
  setCSSVariable('--bg-color', config.branding.background_color)
  setCSSVariable('--surface-color', config.branding.surface_color)
  setCSSVariable('--text-color', config.branding.text_color)
  setCSSVariable('--font-family', config.branding.font_family)
  setLogo(config.branding.logo_url)
  setAppTitle(config.instance.name)
```

### Feature Flag Enforcement

- if `features.games_enabled = false`: hide entire Games section from navigation
- if `features.podcasts_enabled = false`: hide Podcasts section
- if `features.live_tv_enabled = false`: hide Live TV section
- if `features.sports_enabled = false`: hide Sports section
- feature flags checked at navigation level AND at API level (server enforces too)

## Multi-Backend Support (Future)

For users who want to connect to multiple nTV backends:

- settings screen: "Manage Servers"
- add/remove/rename server connections
- switch active server (reloads config and re-authenticates)
- each server has independent: config cache, auth tokens, watch progress

Not planned for v1.0 but architecture supports it.

## White-Label Build Configuration

### Build-Time Variables

For developers creating white-labeled builds:

```env
# .env.whitelabel
NTV_BACKEND_URL=https://tv.myfamily.com
NTV_APP_NAME=FamilyTV
NTV_BUNDLE_ID=com.myfamily.tv
NTV_HIDE_SERVER_CONFIG=true
NTV_DEFAULT_LOCALE=en-US
```

These compile into the app binary. The app still fetches runtime config from the backend, but the user never sees the server configuration screen.

### nTV OS White-Label Build

For nTV OS images, white-label config baked into the image:

```
/etc/ntv/defaults.json    # compiled-in defaults
/data/config/tenant.json  # runtime config (overrides defaults)
```

Build pipeline accepts branding assets (boot splash, logo) and backend URL as build parameters.

## Error Handling

| Scenario | Behavior |
| --- | --- |
| Backend URL unreachable on first launch | show error, allow retry or re-enter URL |
| Backend URL unreachable on subsequent launch | use cached config, show warning banner |
| Config endpoint returns 5xx | retry with exponential backoff (3 attempts), then use cache |
| Config endpoint returns 404 | likely wrong URL — prompt user to check |
| Config schema_version unsupported | prompt user to update app |
| HTTPS certificate error on local IP | allow user to accept self-signed cert (with warning) |
| Backend requires auth for config | error — config endpoint must be public |
