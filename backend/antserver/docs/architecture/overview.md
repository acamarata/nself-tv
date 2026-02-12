# AntServer Architecture Overview

## Core Services

- ingest endpoint and stream validation
- scheduler and event coordinator
- DVR lifecycle controller
- metadata enricher and indexer

## Integration Points

- antbox command channel
- backend event and media records
- object storage for archived media artifacts

## Design Goals

- deterministic event execution
- graceful recovery from stream interruptions
- traceable ingest-to-archive lifecycle
