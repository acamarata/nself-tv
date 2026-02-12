# AntBox Device Trust and Security

## Trust Model

- device enrollment required before accepting commands
- scoped device credentials with rotation support
- heartbeat authenticity checks

## Hardening Baseline

- minimal open ports
- locked service account for daemon process
- secret material protected at rest

## Security Events to Audit

- first-time enrollment
- credential rotation
- repeated auth failures
- unexpected command signatures
