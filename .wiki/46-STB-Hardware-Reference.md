# 46 - STB Hardware Reference and Recommendations

## Objective

Provide concrete hardware recommendations for nTV OS set-top box deployments, organized by performance tier, with pricing, emulation capability, and media playback ratings.

## Tier Overview

| Tier | Name | Target Use | Emulation Ceiling | Approx. Price |
| --- | --- | --- | --- | --- |
| 1 | Retro + Media | media streaming + retro games (NES-PS1) | Tier 1 | $50-350 |
| 2 | Sweet Spot | all media + games through PS2/GC/Wii | Tier 1 + Tier 2 + Tier 3 | $400-600 |
| 3 | Power | everything including light PS3 | Tier 1-3 + light PS3 | $600-900 |
| 4 | High-End | strong PS3 support | Tier 1-4 + most PS3 | $400-500 |
| 5 | Experimental | PS3 full + experimental PS4 | All + experimental | $650+ |

---

## Tier 1 — "Retro + Media"

### Target Hardware Class

Intel N100/N150 or equivalent low-power x86_64 mini-PCs.

### Reference Models

| Model | CPU | RAM | Storage | GPU | Bluetooth | Approx. Price |
| --- | --- | --- | --- | --- | --- | --- |
| Beelink Mini S12 Pro | Intel N100 (4C/4T) | 16 GB DDR4 | 500 GB SSD | Intel UHD | BT 4.2 | ~$180 |
| Beelink EQ12 | Intel N100 | 16 GB DDR5 | 500 GB SSD | Intel UHD | BT 5.2 | ~$200 |
| ACEMAGIC S1 | Intel N150 | 16 GB DDR4 | 512 GB SSD | Intel UHD | BT 5.2 | ~$210 |
| Minisforum UN100D | Intel N100 | 16 GB DDR4 | 512 GB SSD | Intel UHD | BT 5.2 | ~$230 |

### Capability Matrix

| Feature | Rating | Notes |
| --- | --- | --- |
| 4K video decode | good | hardware H.264/H.265/VP9 decode via VA-API |
| HLS streaming | excellent | more than sufficient for adaptive streaming |
| NES/SNES/GB/GBA | excellent | full speed, no issues |
| Genesis/Master System | excellent | full speed |
| PS1 | good | most titles at 1x resolution |
| N64 | fair | many titles playable, some struggle |
| PSP | fair | some titles playable at 1x |
| Dreamcast | fair | lighter titles OK |
| PS2/GameCube | poor | not recommended on this tier |
| Power draw | 6-15W | excellent for always-on appliance |
| Noise | silent (fanless available) | ideal for living room |

### Notes

- Best value tier for families who primarily want media streaming with casual retro gaming
- Fanless models available — completely silent operation
- 16 GB RAM recommended even on this tier for comfortable multitasking between media and games
- 500 GB storage provides ~200 GB usable ROM cache after OS and media cache

---

## Tier 2 — "Sweet Spot" (Recommended Default)

### Target Hardware Class

AMD Ryzen 7/9 7040-7940 series with Radeon 780M integrated GPU.

### Reference Models

| Model | CPU | RAM | Storage | GPU | Bluetooth | Approx. Price |
| --- | --- | --- | --- | --- | --- | --- |
| Beelink SER7 | Ryzen 7 7840HS (8C/16T) | 32 GB DDR5 | 500 GB NVMe | Radeon 780M | BT 5.2 | ~$450 |
| Minisforum UM790 Pro | Ryzen 9 7940HS (8C/16T) | 32 GB DDR5 | 512 GB NVMe | Radeon 780M | BT 5.2 | ~$500 |
| GEEKOM A7 | Ryzen 9 7940HS | 32 GB DDR5 | 1 TB NVMe | Radeon 780M | BT 5.2 | ~$550 |
| Minisforum Venus UM790 | Ryzen 9 7940HS | 32 GB DDR5 | 1 TB NVMe | Radeon 780M | BT 5.3 | ~$520 |

### Capability Matrix

| Feature | Rating | Notes |
| --- | --- | --- |
| 4K video decode | excellent | hardware decode + capable of 4K HDR passthrough |
| HLS streaming | excellent | massive headroom |
| NES through PS1 | excellent | flawless at any upscale |
| N64 | excellent | nearly all titles at 2x+ resolution |
| PSP | excellent | most titles at 2-3x resolution |
| Dreamcast | excellent | full speed, widescreen hacks |
| GameCube | good | most titles playable at 2x |
| PS2 | good | many titles playable, some need per-game settings |
| Wii | good | similar to GameCube |
| PS3 (RPCS3) | poor-fair | select lighter titles only, experimental |
| Power draw | 25-54W | moderate, needs ventilation |
| Noise | low-moderate | fan runs under load |

### Notes

- **This is the recommended tier for most nTV OS deployments**
- AMD 780M iGPU provides Vulkan support essential for Dolphin and PCSX2
- 32 GB RAM allows comfortable multitasking between media, games, and background services
- 1 TB NVMe recommended for large ROM libraries + media cache + podcast downloads
- Active cooling required — ensure adequate ventilation in entertainment center

---

## Tier 3 — "Power"

### Target Hardware Class

AMD Ryzen 9 with discrete GPU or high-end APU configurations.

### Reference Models

| Model | CPU | RAM | Storage | GPU | Bluetooth | Approx. Price |
| --- | --- | --- | --- | --- | --- | --- |
| Beelink GTR7 Pro | Ryzen 9 7940HS | 32 GB DDR5 | 1 TB NVMe | Radeon 780M | BT 5.2 | ~$650 |
| Minisforum HX99G | Ryzen 9 6900HX | 32 GB DDR5 | 512 GB NVMe | Radeon RX 6600M (dGPU) | BT 5.2 | ~$750 |
| GEEKOM GT13 Pro | Intel Core i9-13900H | 32 GB DDR5 | 1 TB NVMe | Intel Iris Xe | BT 5.2 | ~$680 |
| Minisforum AtomMan X7 Ti | Intel Core Ultra 9 185H | 32 GB DDR5 | 1 TB NVMe | Intel Arc (integrated) | BT 5.3 | ~$850 |

### Capability Matrix

| Feature | Rating | Notes |
| --- | --- | --- |
| 4K HDR video | excellent | full HDR10/Dolby Vision passthrough (dGPU models) |
| All Tier 1-2 emulators | excellent | flawless |
| GameCube/PS2/Wii | excellent | most titles at 3x+ resolution |
| PS3 (RPCS3) | fair | select titles playable, depends on game and settings |
| Xbox 360 (Xenia) | poor-fair | very experimental, select titles only |
| Power draw | 45-120W | requires proper cooling and PSU |
| Noise | moderate | fan actively runs under emulation load |

### Notes

- Only recommended for users who specifically want PS3/360 experimentation
- The dGPU models (HX99G) provide significantly better emulation performance
- Higher power draw and noise may not be ideal for all living room setups
- 2 TB NVMe recommended if hosting large PS2/GC/Wii ROM libraries

---

## Tier 4 — "High-End PS3"

### Target Hardware Class

AMD Ryzen 7/9 8000 series with enhanced GPU or similar high-performance x86_64 mini-PCs.

### Reference Models

| Model | CPU | RAM | Storage | GPU | Bluetooth | Approx. Price |
| --- | --- | --- | --- | --- | --- | --- |
| GMKtec NucBox K8 Plus | Ryzen 7 8845HS (8C/16T) | 32 GB DDR5 | 1 TB NVMe | Radeon 780M | BT 5.2 | ~$400 |
| Beelink GTR7 | Ryzen 7 7840HS | 32 GB DDR5 | 1 TB NVMe | Radeon 780M | BT 5.2 | ~$450 |

### Capability Matrix

| Feature | Rating | Notes |
| --- | --- | --- |
| All Tier 1-3 | excellent | flawless performance |
| PS3 (RPCS3) | good | Most titles playable with proper settings |
| GameCube/PS2/Wii | excellent | 3x+ resolution on most titles |
| Power draw | 35-65W | moderate power requirements |
| Noise | low-moderate | active cooling under load |

### Notes

- Ideal for users who want reliable PS3 emulation without top-tier pricing
- Similar hardware to Tier 3 but marketed for PS3 focus
- 1 TB storage recommended for PS3 game library

---

## Tier 5 — "Experimental" (PS3 Full + PS4)

### Target Hardware Class

High-end AMD Ryzen with discrete GPU or top-tier integrated graphics.

### Reference Models

| Model | CPU | RAM | Storage | GPU | Bluetooth | Approx. Price |
| --- | --- | --- | --- | --- | --- | --- |
| MINISFORUM AtomMan G7 PT | AMD Ryzen 9 7940HS | 32-64 GB DDR5 | 2 TB NVMe | Radeon RX 7600M XT (dGPU) | BT 5.2 | ~$650 |
| Minisforum HX99G | Ryzen 9 6900HX | 32 GB DDR5 | 1 TB NVMe | Radeon RX 6600M (dGPU) | BT 5.2 | ~$750 |

### Capability Matrix

| Feature | Rating | Notes |
| --- | --- | --- |
| All Tier 1-4 | excellent | flawless |
| PS3 (RPCS3) | excellent | Strong coverage, most titles full speed |
| PS4 (experimental) | poor-fair | **EXPERIMENTAL** - select titles only |
| Xbox 360 (Xenia) | poor | **EXPERIMENTAL** - very limited |
| Power draw | 65-150W | high power requirements |
| Noise | moderate-high | active cooling required |

### Notes

- **Experimental tier** - PS4 emulation is explicitly experimental
- Only for enthusiasts who understand emulation limitations
- Discrete GPU provides significant advantage for demanding emulation
- 2 TB storage recommended for large libraries
- Not recommended for casual users

---

## ARM STB — "Retro Edition" (Raspberry Pi)

For non-smart TVs and low-cost deployments, Raspberry Pi provides a dedicated nTV appliance experience.

### Supported Models

| Model | Tier | RAM | Emulation Capability | Approx. Price |
| --- | --- | --- | --- | --- |
| Raspberry Pi 4 | 1 | 4-8 GB | PS1 and below (NES, SNES, Genesis, GB/GBA, PS1) reliably | ~$55-75 (board only) |
| Raspberry Pi 5 | 1+ to 1.5 | 8 GB | PS1 + some N64/PSP/Dreamcast improvements | ~$80 (board only) |

### Complete Kit Requirements

| Component | Requirement | Notes |
| --- | --- | --- |
| Power Supply | Official Pi PSU (Pi 4: 3A, Pi 5: 5A/27W) | Essential for stability |
| Storage | USB SSD boot (128-512 GB) | SD cards NOT recommended (failure-prone) |
| Cooling | Pi 4: Heatsink, Pi 5: Active fan | Prevents thermal throttling |
| Case | Ventilated case with cooling | Necessary for reliability |
| HDMI Cable | Micro HDMI to HDMI | Pi uses micro-HDMI ports |

**Complete Kit Price:** ~$120-150 (Pi board + PSU + SSD + cooling + case)

### Capability Matrix

| Feature | Pi 4 | Pi 5 | Notes |
| --- | --- | --- | --- |
| 4K video decode | good | excellent | Hardware decode for media streaming |
| NES/SNES/Genesis/GB/GBA | excellent | excellent | Full speed, no issues |
| PS1 | good | excellent | Full compatibility |
| N64 | fair | good | Pi 5 improved, still game-dependent |
| PSP | poor | fair | Pi 5 can handle lighter titles |
| Dreamcast | poor | fair | Pi 5 improved but limited |
| PS2/GameCube | not supported | not supported | No Tier 2+ on ARM |

### ARM STB Notes

- **Product positioning:** "STB Retro Edition" for non-smart TVs
- **USB SSD boot strongly recommended** - SD cards fail frequently
- **Proper cooling essential** - Pi 5 throttles without active cooling
- **No PS2 promises** - ARM cannot reliably emulate PS2
- **Media streaming excellent** - Full nTV media experience works perfectly
- **Low power consumption** - 5-15W typical, ideal for 24/7 operation

---

## Alternative: Android TV Device + nTV APK

For users who do not want a full nTV OS mini-PC, recommend:

| Device | Emulation Tier | Price | Notes |
| --- | --- | --- | --- |
| NVIDIA SHIELD TV Pro | Tier 1 + light Tier 2 | ~$200 | best Android TV emulation device |
| Chromecast with Google TV 4K | Tier 1 only | ~$50 | media only, very limited game emulation |
| Amazon Fire TV Stick 4K Max | Tier 1 only | ~$60 | media only, basic retro games |

These run the nTV Android TV APK (not nTV OS).

---

## Controller Recommendations

### Primary Recommendation: 2.4 GHz USB Dongle Controllers

Lower latency and more reliable pairing than Bluetooth for gaming.

| Controller | Connection | Price | Notes |
| --- | --- | --- | --- |
| 8BitDo Pro 2 | 2.4G dongle + BT | ~$50 | excellent all-rounder |
| 8BitDo Ultimate | 2.4G dongle + BT | ~$60 | premium build |
| SN30 Pro+ | 2.4G dongle + BT | ~$45 | retro-style layout |

### Bluetooth Controllers

| Controller | Price | Notes |
| --- | --- | --- |
| Xbox Wireless Controller | ~$60 | excellent compatibility |
| PlayStation DualSense | ~$70 | excellent, gyro support |
| 8BitDo Lite 2 | ~$30 | budget option |

### IR Remotes (Media Navigation)

For non-gaming navigation, HDMI-CEC passthrough from the TV's own remote is the simplest option. For dedicated remotes:

| Remote | Price | Notes |
| --- | --- | --- |
| FLIRC USB + any IR remote | ~$25 | universal IR-to-USB, works with any remote |
| Rii MX3 Air Mouse | ~$15 | gyro air mouse + keyboard + IR |

---

## Storage Sizing Guide

| Use Case | Recommended Storage | Rationale |
| --- | --- | --- |
| Media streaming only | 128 GB | OS + config + minimal cache |
| Media + retro games (Tier 1) | 256 GB | OS + ~100 GB ROM cache |
| Media + full games (Tier 1-3) | 512 GB - 1 TB | PS2/GC ISOs are 1-4 GB each |
| Media + games + podcasts + offline | 1-2 TB | comfortable for large libraries |

### Storage Budget Breakdown (512 GB example)

```
nTV OS rootfs (A+B):     8 GB
System services/logs:    2 GB
nTV app + emulators:     1 GB
ROM cache:             300 GB
Game saves:             10 GB
Podcast downloads:      20 GB
Media cache:            50 GB
Reserve/free:          121 GB
```

---

## Thermal and Power Considerations

### Always-On Appliance Mode

- Tier 1 devices (N100): 6-15W idle, suitable for 24/7 operation
- Tier 2 devices (7840HS): 15-25W idle, 54W under load — adequate cooling required
- Tier 3 devices: not recommended for 24/7 always-on due to power draw

### Recommended Power Settings

- wake-on-LAN enabled (for remote power-on via backend admin)
- HDMI-CEC standby (TV off -> STB enters low-power suspend)
- resume from suspend < 3 seconds
- BIOS: restore power state after power loss = "Last State"
