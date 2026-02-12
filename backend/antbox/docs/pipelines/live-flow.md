# AntBox Live Flow

## Runtime Sequence

1. Receive schedule/start command from antserver.
2. Reserve tuner and tune channel.
3. Start live encode and upload pipeline.
4. Report telemetry and pipeline state.
5. Handle stop command and finalize recording handoff.

## Recovery Behavior

- auto-retry tuner acquisition
- reconnect on upload transport interruption
- watchdog restart on daemon crash

## Pipeline Outputs

- live ingest stream
- recording artifact references
- periodic health and progress telemetry
