# Offline-first scoring implementation plan

## Status

First frontend implementation slice is committed on `develop`. Automated CI and manual browser acceptance are still required before production sign-off.

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

## Implemented in the first frontend slice

- IndexedDB stores pending delivery commands, confirmed innings snapshots, and match/innings session metadata.
- Queue insertion assigns a strictly increasing per-innings timestamp inside one IndexedDB read-write transaction, preserving replay order.
- The primary Live Scoring route projects offline runs, extras, wickets, batter/bowler figures, overs, partnership, fall of wickets, and recent-ball state.
- The scorer can restore the last saved session and replay its pending queue after a reload while offline.
- On reconnection, pending commands are sent sequentially with their original `X-Command-Id`; successful commands are removed only after the server response.
- Offline undo cancels only the latest unsent local command. It refuses to undo a server-confirmed delivery without connectivity.
- Pending queue count and sync state are shown in the scorer UI.
- Reducer unit tests cover boundaries, wides, wicket replacement, stale batting state, and innings-over completion.

## Remaining safety requirements

- Backend row locking plus current striker/non-striker and expected over/ball validation reject stale or duplicate scoring positions. A conflict pauses replay and preserves the queued command; it is not silently merged.
- A dedicated server-issued scorer lease and explicit event-sourced online undo/correction event are not included in this frontend slice.
- The local reducer must continue to be checked against backend scoring fixtures for all competition-specific rules before production sign-off.

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

1. Review CI output and resolve any type, formatting, or unit-test failures.
2. Expand backend/frontend parity fixtures for all extras, wicket variants, strike rotation, and innings lifecycle transitions.
3. Add a server-issued scorer lease or stronger state-version precondition for explicit single-writer ownership.
4. Add immutable correction/undo events for online undo.
5. Perform manual browser tests with network disabled/enabled, page reload, browser restart, interrupted replay, and two scorers.

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

The first frontend slice is implemented but not yet production-signed. Automated CI and manual browser verification are still required for airplane-mode/network toggling, reloads, browser restarts, IndexedDB persistence, interrupted replay, and multi-scorer conflicts. Do not describe offline scoring as production-complete until these checks pass.
