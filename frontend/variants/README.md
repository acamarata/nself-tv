# variants/

**Platform-Specific UI Components**

Different user interfaces for different interaction models.

## Directory Structure

- **tv-ui/** — 10-foot UI for TV remotes (d-pad navigation, focus management)
- **display-ui/** — Touch/pointer UI for web/mobile/desktop (mouse, touch, keyboard)
- **shared/** — UI primitives used by both variants

## Variants Explained

### tv-ui/ (10-Foot Interface)

For TV platforms where users sit 10+ feet away using a remote control:

- **Large touch targets** — Minimum 100px clickable area
- **Focus management** — Clear visual focus indicators
- **D-pad navigation** — Up/down/left/right remote control
- **Simple layouts** — Few elements, large text, high contrast
- **No hover states** — Remotes don't have hover
- **Reduced animation** — Better performance on TV hardware

Platforms: Android TV, Roku, webOS, tvOS, Tizen, nTV OS

### display-ui/ (Touch/Pointer Interface)

For platforms with mouse, touch, or trackpad input:

- **Dense layouts** — More information per screen
- **Hover states** — Interactive feedback on pointer movement
- **Scroll interactions** — Natural scrolling, momentum
- **Touch gestures** — Swipe, pinch, drag
- **Smaller text** — Users sit closer to screen
- **Complex navigation** — Multi-level menus, tabs, dropdowns

Platforms: Web, macOS, Windows, Linux, iOS, Android

### shared/ (Primitives)

UI building blocks used by both variants:

- Typography system
- Color palette and theme
- Icons and assets
- Layout primitives (Box, Stack, Grid)
- Base components (Text, Image, Video)

## Guidelines

1. **Variant-specific styling only** — Same component, different presentation
2. **Shared logic** — Business logic stays in src/, not in variants/
3. **Accessible** — Both variants must meet WCAG 2.1 AA standards
4. **Responsive** — tv-ui adapts to different TV resolutions, display-ui adapts to screen size

## Usage Example

```typescript
// src/components/Catalog.tsx (shared logic)
import { CatalogTV } from '@/variants/tv-ui/CatalogTV'
import { CatalogDisplay } from '@/variants/display-ui/CatalogDisplay'
import { useDeviceType } from '@/hooks/useDeviceType'

export function Catalog() {
  const deviceType = useDeviceType()

  // Same data, different UI
  return deviceType === 'tv'
    ? <CatalogTV />
    : <CatalogDisplay />
}
```

## Testing

Each variant must have:
- Visual regression tests (Chromatic/Percy)
- Interaction tests (keyboard, remote, touch)
- Accessibility tests (axe-core)
