# AntServer Event Lifecycle

## State Machine

- `scheduled`
- `preparing`
- `live`
- `finalizing`
- `archived`
- `failed`

## Lifecycle Steps

1. Ingest event schedule from sports/guide sources.
2. Select target antbox and reserve resources.
3. Start ingest and monitor quality.
4. Finalize recording and emit processing job.
5. Publish media metadata and archive references.

## Failure Handling

- retry with backoff for transient failures
- failover to alternate antbox when possible
- explicit operator alerts for unrecoverable failures
