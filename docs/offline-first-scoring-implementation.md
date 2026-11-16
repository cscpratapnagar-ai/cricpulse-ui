# Offline-first scoring implementation plan

## Status

Design/audit complete; implementation not yet started. This document records the verified current architecture and the safety requirements for the first offline-scoring release.

## Verified current behavior

- The primary scorer route is `src/app/features/live/pages/live-scoring/live-scoring.component.ts`.
- The component listens to browser online/offline events and shows connection state, but delivery writes still use HTTP. There is no durable local delivery outbox.
- A pending delivery payload and its command UUID are held only in component fields (`lastDeliveryPayload` and `pendingDeliveryCommandId`). A reload or tab/browser restart loses them.
- The delivery request carries `X-Command-Id`; the frontend interceptor also adds one to delivery mutations when absent.
- The backend records immutable delivery events and uses a unique command ID constraint. `EventFirstDeliveryService` locks the innings row, checks for an existing command, then allocates sequence/version.
- `EventFirstProjectionService` writes the event and updates the existing delivery/statistics projection in one transaction.
- The existing innings lock serializes simultaneous requests, but it is not a scorer ownership lease. A row lock alone does not decide which disconnected scorer is authoritative.
- Undo deletes the latest row from the mutable `deliveries` projection. It does not currently append an explicit undo/tombstone event to the immutable `delivery_events` stream. This must be addressed before treating that stream as a complete offline reconciliation log.
- The current scorer UI can retry a failed delivery with the same command UUID while the component remains alive. That is useful online idempotency, not durable offline queuing.

## Release 1 architecture

### Browser persistence

Use IndexedDB (not localStorage) with a versioned database and stores:

- `pendingCommands`: command UUID, match ID, innings ID, local sequence, command type, normalized intent, creation timestamp, state, attempt count, last error, and expected server state version.
- `inningsSnapshots`: last authoritative score snapshot and its server state version, keyed by innings ID.
- `metadata`: schema version and per-innings next local sequence.

Persist a command in a read-write IndexedDB transaction before presenting it as safely queued. Handle quota errors and unavailable/private-browsing IndexedDB explicitly; never silently fall back to memory and claim the command is saved.

Do not persist access tokens or other authentication secrets.

### Command model and replay

- Every scorer action receives one UUID before it is persisted. Every retry/replay reuses that exact UUID.
- Keep commands ordered per innings; never replay later commands ahead of an earlier pending command.
- Use explicit states: pending, sending, confirmed, blocked/conflict.
- Replay only when authenticated connectivity is restored.
- A successful response marks that exact command confirmed and stores the returned authoritative snapshot/version in the same local transaction where practical.
- A transport failure leaves the command pending. A definitive validation/permission/conflict response blocks the queue and asks the scorer to reconcile; it must not be retried forever.
- Server-side unique command IDs remain the final duplicate-prevention boundary.

### Offline score projection

A queue alone is not sufficient to let a scorer continue entering balls offline. The client must apply the same cricket rules as the server for legal-ball progression, extras, strike rotation, wickets, incoming batter, bowler changes, innings completion and scorecard summaries.

The local projection must be deterministic and tested against backend fixtures. It must clearly distinguish the last server-confirmed score from the locally projected score and pending command count.

If a command cannot be projected safely (unsupported wicket/extra combination, incomplete player state, unknown rule), block further offline scoring rather than guess.

### Multi-scorer conflict policy

The backend innings row lock serializes writes but does not grant exclusive scorer ownership. Release 1 must prevent silent multi-writer merging.

Use a server-issued scoring session/lease or an explicit compare-and-set precondition based on the expected innings state version. When replaying, the backend must reject a command based on stale state with a structured conflict response. The client then pauses the queue and requires an authoritative refresh plus an explicit correction/re-entry decision.

Never auto-merge two independent scoring histories.

### Undo and audit

- Undo of a command that is still pending locally may cancel that local command only if it has not been sent.
- Undo of a server-confirmed delivery must use the server correction/undo flow.
- The immutable event log needs an explicit correction/undo event linked to the original delivery/command. Do not delete immutable events or silently reuse an old command ID.
- Rebuild/verify the mutable score projection from the event history or retain a reliable correction record before claiming audit completeness.

## Implementation sequence

1. Add IndexedDB repository and queue state model, including schema upgrades and storage-failure handling.
2. Add deterministic client scoring reducer with shared rule fixtures and parity tests against backend behavior.
3. Add server-side expected-state-version conflict protection and explicit correction/undo events.
4. Integrate queue/replay with the primary Live Scoring route; show confirmed score, local score, pending count and conflict state.
5. Add recovery on startup, reconnect, tab close/reopen and interrupted replay.
6. Run frontend and backend CI; then perform manual browser tests with network disabled/enabled and reload/restart scenarios.

## Acceptance tests

- A delivery is durably stored before the UI says it is queued.
- Reloading the page/browser does not lose pending commands.
- Replaying the same command UUID repeatedly creates one delivery only.
- Pending commands replay in strict local order.
- A failed network request is retried with the same command UUID.
- A definitive validation/permission/conflict response pauses replay and preserves the pending command for review.
- Offline local score and ball state match the backend for runs, boundaries, wides, no-balls, byes, leg-byes, wickets, strike changes and over transitions.
- Offline undo cancels only unsent commands; confirmed delivery correction remains auditable.
- Two scorers submitting from stale snapshots cannot silently overwrite or merge scoring histories.
- IndexedDB unavailable/quota-exceeded conditions are visible and never represented as safely persisted.
- CI is green for both repositories before release sign-off.

## Sign-off boundary

Automated tests can verify persistence/replay logic, but manual browser verification is still required for airplane-mode/network toggling, reloads, browser restarts, IndexedDB persistence, and real multi-tab behavior. Do not describe offline scoring as complete until both automated and manual acceptance checks pass.
