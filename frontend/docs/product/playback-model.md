# TV Playback Model

## Playback Modes

- VOD
- live
- catch-up DVR (time-shifted live)

## Policy Gates Before Playback

1. authenticated session
2. role and content policy check
3. stream concurrency check
4. signed URL issuance and playback token constraints

## UX Requirements

- resilient start and resume behavior
- explicit error states for policy/limit failures
- per-user watch progress synchronization
