# TV Deployment Notes

## Runtime Dependencies

- backend catalog and policy APIs
- media CDN/object storage origin
- live ingest endpoints for active events

## Operational Risk Areas

- manifest/signature mismatch
- playback startup latency spikes
- live stream discontinuity

## Required Runbooks

- playback outage triage
- live event fallback strategy
- stream-limit policy incident handling
