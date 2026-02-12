# 48 - Input and Controller Abstraction Spec

## Objective

Define a unified input abstraction layer that allows every nTV client to handle keyboard, mouse, touch, TV remote, game controller, and HDMI-CEC input through a consistent model.

## Why This Matters

nTV runs on 10+ platform surfaces. Each has different primary input methods:

- Web: keyboard + mouse
- Mobile: touch + gestures
- Desktop: keyboard + mouse + media keys
- Android TV: D-pad remote + Bluetooth controller
- Roku: Roku remote
- webOS: LG Magic Remote (pointer + D-pad)
- tvOS: Siri Remote (touch + swipe + D-pad + click)
- nTV OS: Bluetooth controller + USB keyboard + IR remote + HDMI-CEC

Without a shared model, every platform re-invents input handling. The abstraction layer ensures consistent behavior.

## Input Abstraction Model

### Semantic Actions (Platform-Agnostic)

All UI interactions are expressed as semantic actions, not raw input events:

```typescript
enum NavigationAction {
  UP,
  DOWN,
  LEFT,
  RIGHT,
  SELECT,       // primary action (play, open, confirm)
  BACK,         // navigate back, close modal
  MENU,         // open context menu or settings
  HOME,         // return to home screen (app-level, not OS)
  SEARCH,       // open search
}

enum PlaybackAction {
  PLAY_PAUSE,
  STOP,
  SEEK_FORWARD,   // +10s default, configurable
  SEEK_BACKWARD,  // -10s default, configurable
  SEEK_FORWARD_LONG,  // +30s
  SEEK_BACKWARD_LONG, // -30s
  NEXT_TRACK,
  PREV_TRACK,
  VOLUME_UP,
  VOLUME_DOWN,
  MUTE,
  SUBTITLE_TOGGLE,
  AUDIO_TRACK_NEXT,
  FULLSCREEN_TOGGLE,
}

enum GameAction {
  // mapped per-emulator from controller buttons
  A, B, X, Y,
  L1, R1, L2, R2,
  L3, R3,           // stick clicks
  START, SELECT_BTN,
  DPAD_UP, DPAD_DOWN, DPAD_LEFT, DPAD_RIGHT,
  LEFT_STICK_X, LEFT_STICK_Y,
  RIGHT_STICK_X, RIGHT_STICK_Y,
  MENU_TOGGLE,      // overlay menu during gameplay
  SAVE_STATE,
  LOAD_STATE,
}
```

### Input Source to Action Mapping

Each platform maps its raw input to semantic actions:

#### Keyboard (Web, Desktop, nTV OS)

| Key | Navigation | Playback | Notes |
| --- | --- | --- | --- |
| Arrow keys | UP/DOWN/LEFT/RIGHT | SEEK_FWD/BACK | context-dependent |
| Enter / Space | SELECT | PLAY_PAUSE | context-dependent |
| Escape / Backspace | BACK | — | |
| M | — | MUTE | |
| F | — | FULLSCREEN_TOGGLE | |
| S | SEARCH | — | |
| C | — | SUBTITLE_TOGGLE | |
| ] / [ | — | SEEK_FWD_LONG / SEEK_BACK_LONG | |

#### D-pad Remote (Android TV, Fire TV)

| Button | Navigation | Playback |
| --- | --- | --- |
| D-pad directions | UP/DOWN/LEFT/RIGHT | SEEK during playback |
| Center/Select | SELECT | PLAY_PAUSE |
| Back | BACK | BACK (exit player) |
| Play/Pause | — | PLAY_PAUSE |
| Rewind | — | SEEK_BACKWARD |
| Fast Forward | — | SEEK_FORWARD |
| Menu | MENU | MENU |

#### Touch (Mobile)

| Gesture | Navigation | Playback |
| --- | --- | --- |
| Tap | SELECT | show/hide controls |
| Swipe left/right | — | SEEK |
| Swipe down | — | dismiss player |
| Double-tap left | — | SEEK_BACKWARD |
| Double-tap right | — | SEEK_FORWARD |
| Pinch | — | zoom (optional) |
| Long press | MENU (context) | — |

#### Game Controller (all platforms)

| Button | Navigation Mode | Game Mode |
| --- | --- | --- |
| A / Cross | SELECT | A |
| B / Circle | BACK | B |
| X / Square | — | X |
| Y / Triangle | MENU | Y |
| D-pad | UP/DOWN/LEFT/RIGHT | DPAD directions |
| Left Stick | UP/DOWN/LEFT/RIGHT | analog input |
| Start | MENU | START |
| Select/Back | BACK | SELECT_BTN |
| L1/R1 | page up/down in lists | L1/R1 |
| L2/R2 | — | L2/R2 |
| Guide/Home | HOME | MENU_TOGGLE (in-game overlay) |

#### HDMI-CEC (nTV OS)

HDMI-CEC allows the TV's own remote to control the nTV OS device.

| CEC Command | Action |
| --- | --- |
| Up/Down/Left/Right | navigation |
| Select/OK | SELECT |
| Back/Return | BACK |
| Play | PLAY_PAUSE |
| Pause | PLAY_PAUSE |
| Stop | STOP |
| Rewind | SEEK_BACKWARD |
| Fast Forward | SEEK_FORWARD |
| Power Off | suspend nTV OS |

#### IR Remote via LIRC (nTV OS)

Configurable key-to-action mapping stored in `/data/config/lirc-keymap.json`.

## Focus Management System (TV Platforms)

TV platforms use spatial navigation (focus-based) instead of pointer/touch.

### Focus Rules

1. Every screen has a **default focus target** (first interactive element)
2. Focus moves in 2D grid based on D-pad direction
3. Focus wraps within containers (rows, lists, grids)
4. Focus does NOT jump between unrelated screen regions unexpectedly
5. Focused element is always visually distinct (border, highlight, scale)
6. Focus state persists when navigating back (return to last-focused item)

### Focus Zones

```
+--------------------------------------------------+
|  [Nav Bar]  Home | Movies | Live | Games | ...    |  <- Zone 1
+--------------------------------------------------+
|  [Hero Banner]                                    |  <- Zone 2
|  Featured Content Carousel                        |
+--------------------------------------------------+
|  [Row 1]  Continue Watching                       |  <- Zone 3
|  [Card] [Card] [Card] [Card] [Card]              |
+--------------------------------------------------+
|  [Row 2]  Recently Added                          |  <- Zone 4
|  [Card] [Card] [Card] [Card] [Card]              |
+--------------------------------------------------+
```

- D-pad UP/DOWN moves between zones
- D-pad LEFT/RIGHT moves within a zone (horizontal scroll in rows)
- SELECT on nav bar item: switch section
- SELECT on card: open detail page

### Focus Persistence

- When navigating from Row 2 to Row 1 and back, focus returns to the same card
- When navigating back from a detail page, focus returns to the card that was selected
- Stored in memory per screen, cleared on section change

## Controller Pairing and Management

### Bluetooth Pairing Flow (nTV OS and Android TV)

1. User opens: Settings > Controllers > Pair New Controller
2. App displays: "Put your controller in pairing mode" with per-controller instructions
3. App scans for Bluetooth HID devices
4. User selects device from discovered list
5. Pair and test: prompt user to press each button to verify mapping
6. Save controller profile

### Controller Database

Maintain a built-in database of known controllers with default mappings:

| Controller | Vendor ID | Product ID | Default Profile |
| --- | --- | --- | --- |
| Xbox Wireless Controller | 045e | 0b13 | xbox_default |
| PlayStation DualSense | 054c | 0ce6 | ps_default |
| 8BitDo Pro 2 | 2dc8 | 6003 | 8bitdo_default |
| 8BitDo Ultimate | 2dc8 | 3106 | 8bitdo_default |
| Generic HID Gamepad | * | * | generic_default |

Unknown controllers fall back to `generic_default` profile with standard button ordering.

### User Remapping

- accessible from: Settings > Controllers > [Controller Name] > Remap Buttons
- per-emulator override: "Use custom mapping for SNES games"
- save/load mapping profiles
- reset to default

## Game-Specific Input Concerns

### Analog Stick Sensitivity

- configurable deadzone per stick (default: 15%)
- configurable sensitivity curve (linear, quadratic)
- per-game overrides stored in game settings

### Turbo / Auto-Fire

- configurable per button per game
- useful for retro games that require rapid button presses
- toggle from in-game overlay menu

### On-Screen Virtual Controller (Mobile)

For mobile devices without a physical controller:

- semi-transparent overlay with D-pad, face buttons, shoulder buttons
- customizable layout (drag buttons to preferred positions)
- adjustable opacity and size
- haptic feedback on button press
- auto-hide when physical controller detected

## Accessibility Input Considerations

- all UI navigable by keyboard alone (no mouse/touch required)
- screen reader focus tracking follows visual focus
- high contrast focus indicators (minimum 3:1 contrast ratio)
- adjustable key repeat rates for navigation
- switch access support (mobile: iOS Switch Control, Android Switch Access)
