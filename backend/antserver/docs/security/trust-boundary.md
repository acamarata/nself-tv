# AntServer Trust Boundary

## Boundary Rules

- only enrolled antbox devices can submit ingest and receive control commands
- ingest command and control paths must be authenticated and signed
- service-to-service auth enforced between antserver and backend

## Security Baseline

- TLS on all public and private service endpoints
- credential rotation and revocation support
- audit trail for all control-plane actions

## Abuse Scenarios to Defend

- unauthorized ingest endpoint usage
- command spoofing against edge devices
- replay of stale control messages
