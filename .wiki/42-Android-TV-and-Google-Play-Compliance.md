# 42 - Android TV and Google Play Compliance

## Objective

Define all requirements for shipping nTV as an Android TV APK via sideloading and Google Play Store publication.

## Android TV SDK Requirements

### Manifest Requirements

```xml
<!-- Declare TV support -->
<uses-feature android:name="android.software.leanback" android:required="true" />

<!-- Declare no touchscreen requirement -->
<uses-feature android:name="android.hardware.touchscreen" android:required="false" />

<!-- Bluetooth for controllers -->
<uses-feature android:name="android.hardware.bluetooth" android:required="false" />

<!-- Leanback launcher activity -->
<activity android:name=".MainActivity"
    android:banner="@drawable/tv_banner"
    android:screenOrientation="landscape">
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
    </intent-filter>
</activity>
```

### Required Assets

- TV banner: 320x180 px (xhdpi), displayed on Android TV home screen
- App icon: standard adaptive icon
- Feature graphic: 1024x500 px for Play Store listing
- Screenshots: TV-resolution screenshots (1920x1080) for Play Store

### UI Requirements

- All UI must be navigable with 5-way D-pad (up/down/left/right/select)
- No touch-only interactions anywhere
- Visible focus states on every interactive element
- Back button must navigate up the hierarchy (not exit app from deep screens)
- No assumptions about pointer/mouse input

## D-pad Navigation Model

### Focus Management

- Every screen must have a clear initial focus target
- Focus must wrap logically (not jump randomly)
- Rows: left/right within row, up/down between rows
- Lists: up/down within list
- Modal dialogs: trap focus within dialog until dismissed

### Remote Button Mapping

| Button | Action |
| --- | --- |
| D-pad center / Select | Primary action (play, open, confirm) |
| Back | Navigate back, close modal, exit nested view |
| Play/Pause | Toggle playback |
| Rewind/Fast Forward | Seek backward/forward (10s/30s increments) |
| Home | Return to Android TV home (OS-handled) |
| Menu / Hamburger | Open context menu or settings |

## ExoPlayer Integration

### Baseline Configuration

- HLS adaptive streaming with automatic quality selection
- subtitle rendering (WebVTT, TTML)
- audio track selection
- seek with trickplay thumbnail support
- buffering indicators and error recovery UI

### DRM Considerations

- Widevine L1/L3 depending on content protection requirements
- DRM optional for self-hosted content (signed URLs sufficient)
- DRM required if distributing licensed content

## Sideloading Workflow

### For Development and Private Deployment

1. Build signed APK (release keystore)
2. Enable Developer Options on TV: Settings > About > Build Number (tap 7 times)
3. Enable USB debugging and Network debugging
4. From workstation: `adb connect TV_IP:5555 && adb install ntv.apk`
5. App appears in "See All Apps" or via Sideload Launcher

### Visibility Fix

Sideloaded apps may not appear on home screen. Recommend:

- Include `LEANBACK_LAUNCHER` intent filter (makes it visible if properly declared)
- Document: install "Sideload Launcher" or "Projectivy Launcher" as fallback

## Google Play Store Submission

### Developer Account

- Google Play Developer account ($25 one-time fee)
- Identity verification required

### Submission Checklist

1. **App Bundle**: signed AAB (not APK) for Play Store
2. **Target SDK**: latest stable Android SDK version
3. **Data Safety Form**: declare all data collection, storage, sharing
4. **Privacy Policy**: hosted URL, linked in app and store listing
5. **Content Rating**: IARC questionnaire completed
6. **Store Listing**: title, descriptions, screenshots (TV), feature graphic, TV banner
7. **TV-specific QA**:
   - all screens navigable by D-pad only
   - no crash on any screen with remote-only input
   - proper back-button behavior from every screen
   - banner displays correctly on home screen

### Release Strategy

1. **Internal testing track**: team-only, immediate availability
2. **Closed testing**: invite-only beta testers
3. **Open testing**: public beta
4. **Production**: full public release

### Common Rejection Reasons and Mitigations

| Rejection Reason | Prevention |
| --- | --- |
| UI not navigable with remote | automated D-pad traversal tests |
| Missing TV banner | include 320x180 banner in manifest |
| Phone UI stretched on TV | use Leanback components, test on TV emulator |
| No privacy policy | host privacy policy, link in app and listing |
| Crash on launch | CI testing on Android TV emulator images |
| Excessive permissions | request only necessary permissions |

## Amazon Fire TV Adaptation

Fire TV runs a fork of Android TV. Adaptation requires:

1. Replace Google Play Services dependencies with Amazon equivalents
2. Test with Fire TV remote (has voice button, no Google Assistant)
3. Submit to Amazon Appstore (separate developer account, free)
4. Fire TV supports sideloading via ADB identically to Android TV

## Bluetooth Controller Support

### For Game Emulation Mode

- Support standard Bluetooth HID game controllers
- Tested targets: Xbox Wireless, PlayStation DualSense, 8BitDo Pro 2
- Controller mapping profiles stored per emulator
- Allow user remapping from settings UI
- Recommend 2.4 GHz USB dongle controllers for lowest latency gaming
