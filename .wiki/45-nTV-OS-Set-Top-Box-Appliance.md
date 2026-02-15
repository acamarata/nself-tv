# 45 - nTV OS and Set-Top Box Appliance Spec

## Objective

Define a Batocera-like immutable Linux OS purpose-built for mini-PCs that turns commodity hardware into a dedicated nTV set-top box. Users power on the device and immediately have access to Movies, Shows, Live TV, Sports, Podcasts, and Games — all controlled via remote, Bluetooth controller, or keyboard/mouse.

## Why nTV OS Exists

1. **Appliance experience**: power on -> nTV. No desktop, no OS to manage, no distractions.
2. **Game emulation performance**: native Linux emulators with GPU acceleration outperform Android TV SoCs for Tier 2/3 games.
3. **Full control**: the operator or family controls the entire stack from hardware to application.
4. **White-label ready**: boot splash, branding, and default backend URL all configurable before imaging.

## Comparison: nTV OS vs Batocera / LibreELEC / SteamOS

| Feature | Batocera | LibreELEC | SteamOS | nTV OS |
| --- | --- | --- | --- | --- |
| Primary purpose | game emulation | Kodi media center | PC gaming | unified media + games |
| Video streaming | limited | Kodi addons | Steam + browser | native HLS/DASH player |
| Live TV / DVR | no | Kodi PVR addons | no | native (AntBox integration) |
| Podcasts | no | Kodi addons | no | native |
| Game emulation | primary focus | no | Steam + Proton | integrated (RetroArch + standalone) |
| White-label | no | no | no | yes (backend-URL + branding) |
| Immutable OS | yes | yes | yes | yes |
| OTA updates | yes | yes | yes | yes |
| Remote control UX | limited | yes (Kodi) | no | yes (10-foot UI) |

## System Architecture

```
+------------------------------------------------------------------+
|                         nTV OS Image                              |
|                                                                   |
|  +-------------------+  +-------------------------------------+  |
|  | Boot Layer        |  | Application Layer                   |  |
|  | systemd-boot      |  |                                     |  |
|  | initramfs         |  |  nTV Frontend (Electron/CEF/Wayland) |  |
|  | A/B partition mgr  |  |  RetroArch + standalone emulators   |  |
|  +-------------------+  |  mpv / GStreamer (video playback)    |  |
|                         |  Audio daemon (PipeWire)              |  |
|  +-------------------+  +-------------------------------------+  |
|  | System Services   |                                           |
|  | NetworkManager    |  +-------------------------------------+  |
|  | BlueZ (Bluetooth) |  | Data Layer                          |  |
|  | PipeWire (audio)  |  |                                     |  |
|  | udev (peripherals)|  |  /data/config/   (persistent)       |  |
|  | HDMI-CEC daemon   |  |  /data/cache/    (ROM cache, LRU)   |  |
|  | ntv-updater       |  |  /data/saves/    (game saves)       |  |
|  +-------------------+  |  /data/podcasts/ (offline episodes)  |  |
|                         +-------------------------------------+  |
+------------------------------------------------------------------+
```

## Partition Layout

```
/dev/sda1  EFI System Partition     512 MB   FAT32
/dev/sda2  rootfs-a (active)        4 GB     ext4 (read-only mount)
/dev/sda3  rootfs-b (standby)       4 GB     ext4 (read-only mount)
/dev/sda4  data                     remaining ext4 (read-write)
```

### Partition Roles

- **rootfs-a / rootfs-b**: immutable OS images, one active, one for updates
- **data**: persistent user data, config, ROM cache, saves, podcast downloads
- A/B swap on reboot after successful update validation

## Boot Sequence

1. UEFI (x86_64) or Pi firmware (ARM) -> systemd-boot -> select active rootfs partition
2. initramfs mounts rootfs read-only, overlays `/data` for writable paths
3. systemd starts: NetworkManager, BlueZ, PipeWire, udev, HDMI-CEC daemon
4. nTV launcher starts in kiosk mode (full-screen, no window manager chrome)
5. If first boot: launch setup wizard + tier pack provisioning
6. If configured: launch directly to nTV home screen
7. Performance targets:
   - **x86_64 Tier 1-2**: < 30s cold boot to interactive UI
   - **x86_64 Tier 3+**: < 20s cold boot to interactive UI (NVMe SSD)
   - **ARM (Pi 4/5)**: < 30s cold boot to interactive UI (USB SSD)
   - **Wake/resume**: < 2s to interactive UI
   - **Input latency**: < 50ms typical, < 100ms worst-case

## First-Run Setup Wizard

All steps navigable via remote control, Bluetooth controller, or keyboard.

### Step 1: Language and Region

- select language from supported list
- select timezone
- select date format

### Step 2: Network

- if Ethernet detected and connected: skip to Step 3
- if no Ethernet: show Wi-Fi network list, select and enter password
- on-screen keyboard optimized for remote/controller input (grid layout, not QWERTY)

### Step 3: Backend Connection

- prompt: "Enter your nTV server address"
- input field: `tv.mydomain.com` or `192.168.1.100:8080`
- test connection button: verifies `/api/v1/config` endpoint reachable
- on success: fetch and apply tenant config (name, branding, feature flags)
- on failure: retry, skip (configure later), or enter different address

### Step 4: Account Login

- device-code flow: display 6-character code and URL
- user confirms on phone/computer
- on success: display welcome with user profile name

### Step 5: Controllers

- scan for Bluetooth devices
- pair controllers with guided instructions per controller type
- test button mapping
- option to skip and use keyboard/HDMI-CEC remote

### Step 6: Display and Audio

- detect connected display resolution and refresh rate
- allow manual override
- audio output selection: HDMI, Bluetooth, analog (3.5mm if available)
- test audio output

### Step 7: Complete

- summary of configuration
- "Start using nTV" button
- boot to home screen

## OTA Update System

### Update Flow

1. `ntv-updater` daemon checks update server on configured schedule
2. download new rootfs image to inactive partition (background, resumable)
3. verify image checksum and signature
4. mark inactive partition as "pending boot"
5. prompt user: "Update available. Restart to apply?" (or auto-apply during idle)
6. on reboot: boot from newly written partition
7. if boot fails (3 consecutive failures): rollback to previous partition

### Update Channels

| Channel | Audience | Frequency |
| --- | --- | --- |
| stable | all users | monthly or as needed |
| candidate | early adopters | biweekly |
| nightly | developers/testers | daily |

### Delta Updates

- full image updates as baseline
- binary diff (bsdiff/xdelta) for smaller delta updates when possible
- fallback to full image if delta fails

## Tier Pack Provisioning

nTV OS uses a **minimal base + expand by tier** strategy to reduce image size and download requirements.

### Base Image Contents

All base images (x86_64 and ARM) include:
- Essential GPU drivers (Mesa, Vulkan/OpenGL)
- Wi-Fi/BT firmware for common chipsets
- NetworkManager, BlueZ, PipeWire, HDMI-CEC stack
- nTV UI runtime (offline-capable)
- RetroArch + Tier 1 cores (NES, SNES, Genesis, GB/GBA, PS1)

### First-Boot Tier Pack Installation

On first boot, nTV OS:
1. Detects hardware (CPU, GPU, RAM) and assigns `device_tier`
2. Resolves `TierPackManifest` from backend (or uses local defaults if offline)
3. Downloads and installs tier-appropriate emulators and assets:
   - **Tier 2+**: Add PCSX2, Dolphin, RPCS3 as appropriate
   - **All tiers**: Shader caches, artwork scrapers, BIOS management UI
4. Reboots or hot-reloads UI with expanded capabilities

### Tier Pack Examples

| Tier | Additional Components |
| --- | --- |
| 1 | Base only (RetroArch + PS1 cores) |
| 2 | + PCSX2 + BIOS management UI |
| 3 | + Dolphin + performance profiles |
| 4 | + RPCS3 + per-title patch management |
| 5 | + Experimental PS4 runtime + sandboxing |

**Offline Mode:** Base image is fully functional for Tier 1 emulation without network. Tier packs require network on first boot.

### Image Variants

| Variant | Architecture | Size | Contents |
| --- | --- | --- | --- |
| `ntv-os-x86_64.img` | x86_64 | ~2 GB | Universal x86_64 installer (Tier 1-5 capable) |
| `ntv-os-rpi4.img` | ARM64 | ~1.5 GB | Raspberry Pi 4 (Tier 1) |
| `ntv-os-rpi5.img` | ARM64 | ~1.5 GB | Raspberry Pi 5 (Tier 1+) |

## White-Label Provisioning

### Method 1: USB Provisioning Key

Create a USB drive with `/ntv-provision.json`:

```json
{
  "backend_url": "https://tv.myfamily.com",
  "locale": "en-US",
  "timezone": "America/New_York",
  "branding": {
    "app_name": "FamilyTV",
    "boot_splash": "splash.png",
    "accent_color": "#1a73e8"
  },
  "network": {
    "wifi_ssid": "HomeNetwork",
    "wifi_psk": "encrypted:base64..."
  },
  "update_channel": "stable",
  "skip_wizard": false
}
```

- Insert USB before first boot -> config auto-applied
- Boot splash and branding assets read from USB if present

### Method 2: Headless Provisioning

- enable SSH on first boot via `ntv-provision.json` flag: `"enable_ssh": true`
- SSH in and run: `ntv-configure --backend-url https://tv.myfamily.com`
- useful for fleet deployment scripting

### Method 3: Remote Push

- backend admin panel can push config updates to registered nTV OS devices
- device polls for config changes on heartbeat interval
- changes applied on next idle period or reboot

## Hardware Compatibility

### Supported Architectures

nTV OS supports two CPU architectures:

1. **x86_64** (primary STB path) - Intel/AMD mini-PCs for Tier 1-5 emulation
2. **ARM64** (STB Retro Edition) - Raspberry Pi 4 and Pi 5 for Tier 1-1.5 emulation

### Minimum Requirements (x86_64)

| Component | Minimum | Recommended |
| --- | --- | --- |
| CPU | x86_64, 4 cores, 2.0 GHz | 6+ cores, 3.0+ GHz |
| RAM | 4 GB | 8-16 GB |
| Storage | 64 GB SSD | 256 GB+ NVMe |
| GPU | Intel UHD 600+ or AMD Vega | AMD 780M or discrete |
| Network | Ethernet 100 Mbps or Wi-Fi | Gigabit Ethernet |
| Bluetooth | 4.0 | 5.0+ |
| Display | HDMI 1.4 | HDMI 2.0+ (4K) |

### ARM Requirements (Raspberry Pi)

| Component | Pi 4 | Pi 5 |
| --- | --- | --- |
| RAM | 4 GB minimum, 8 GB recommended | 8 GB recommended |
| Storage | USB SSD boot (SD card not recommended) | USB SSD boot or NVMe via HAT |
| Power Supply | Official Pi 4 PSU (3A) | Official Pi 5 PSU (5A, 27W) |
| Cooling | Heatsink required | Active cooling required (fan) |
| Network | Built-in Wi-Fi 5 + Gigabit Ethernet | Built-in Wi-Fi 6 + Gigabit Ethernet |
| Bluetooth | BT 5.0 | BT 5.0 |
| Display | HDMI 2.0 (dual micro-HDMI) | HDMI 2.0 (dual micro-HDMI) |

**ARM Notes:**
- Raspberry Pi 4: Tier 1 emulation (PS1 and below reliably)
- Raspberry Pi 5: Tier 1+ to 1.5 (some N64/PSP/Dreamcast improvements)
- SD cards are failure-prone; USB SSD boot strongly recommended
- Proper cooling essential to avoid thermal throttling
- No Tier 2+ (PS2) promises on ARM

### Reference Hardware Tiers

See wiki 46 for specific recommended mini-PC models and pricing.

## Security Model

### Boot Security

- signed OS images (Ed25519 signatures verified before partition swap)
- optional Secure Boot with custom keys
- read-only rootfs prevents runtime tampering

### Network Security

- all backend communication over HTTPS
- device identity via Ed25519 keypair (same model as AntBox, wiki 18)
- optional WireGuard tunnel for backend connectivity

### Local Security

- no default root password (SSH disabled by default)
- data partition encryption optional (LUKS, passphrase or TPM-bound)
- factory reset: wipe data partition, regenerate device identity

## Diagnostics and Support

### On-Device Diagnostics

Accessible from Settings > System > Diagnostics:

- network connectivity test (ping backend, DNS, internet)
- hardware info (CPU, RAM, GPU, storage, temperature)
- emulator capability report (which tiers supported)
- controller status (connected, battery, mapping)
- update status and history
- log viewer (last 1000 lines of system log)

### Remote Diagnostics

- backend admin panel can request diagnostic bundle from device
- bundle includes: hardware info, network status, app version, recent errors
- no user data included in diagnostic bundles
