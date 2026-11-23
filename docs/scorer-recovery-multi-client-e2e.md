# Scorer Recovery and Multi-Client E2E Certification

This certification joins the existing scorer lease, idempotent command, offline queue, authoritative REST recovery, and public WebSocket delivery guarantees.

## Automated coverage added

The backend CI scoring E2E now starts two independent public STOMP viewers before the first scoring command. Both viewers must receive the same four committed transitions, in order:

1. First delivery: 1 run, 1 legal ball.
2. Exactly one of two competing commands for ball 0.2: the winner's 2-run or 4-run delivery.
3. Undo of the winning second delivery: score returns to 1/1.
4. Undo of the first delivery: score returns to the original 0/0 snapshot.

The E2E also verifies:
- A second authorized scorer cannot take an active innings lease.
- A stale lease token is rejected.
- Two simultaneous retries with the same command ID are both acknowledged but persist one delivery.
- Two different command IDs racing for the same ball position produce exactly one success and one client error.
- Replaying the same command ID does not change the score.
- Reusing a command ID with a different payload is rejected without mutation.
- An empty undo is a no-op and does not advance the authoritative event version.
- Both public viewers receive identical event IDs, strictly increasing event versions, and the expected score snapshots.

## Frontend regression coverage

The live-score service test opens two independent watchers for the same innings, feeds both the same authoritative version, and verifies:
- Both viewers receive the current score.
- A stale event version is ignored by both viewers.
- Each watcher can unsubscribe independently.

Existing tests continue to cover reconnect lifecycle, version-gap REST reconciliation, stale REST snapshot rejection, IndexedDB queue persistence, offline queue restoration, command-ID reuse, and scorer lease token isolation.

## CI execution

Backend CI executes `scripts/e2e-scoring-idempotency-retry.sh` against the CI PostgreSQL-backed application and runs the two STOMP viewers using Node 22's WebSocket runtime. Script syntax is validated before the application E2E begins.

Frontend CI runs the Angular unit suite and production build.

## Manual production-like certification still required

Automated CI does not replace a real multi-device rehearsal. Before production promotion, an operator must:
- Open the scorer on device A and the public live-score/overlay on device B.
- Confirm committed deliveries appear on both viewers without manual refresh.
- Attempt a second scorer session and confirm it is read-only/blocked while the lease is held.
- Interrupt and restore network connectivity and confirm pending commands reconcile without duplicates or score regression.
- Verify undo, innings completion, match result, and OBS/vMix scene behavior during a real staging match.

Record the environment, device/browser versions, match ID, recovery time, and any observed event-to-overlay latency with the release sign-off.
