# AntBox Hardware Reference Design

## Baseline Components

- compact x86 edge compute with hardware video encode support
- network tuner device and OTA antenna system
- stable wired network path to ingest endpoint

## Design Priorities

- capture stability under long-running loads
- thermal and power resilience
- easy replacement and reprovisioning

## Provisioning Checklist

1. OS hardened and auto-update policy set.
2. FFmpeg and required drivers validated.
3. tuner discovery and channel scan validated.
4. daemon service configured and heartbeat verified.
