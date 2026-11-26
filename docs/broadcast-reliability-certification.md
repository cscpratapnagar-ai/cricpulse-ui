# Broadcast Reliability Certification

This change set consolidates the six broadcast workstreams into one frontend PR. It complements the backend PR in `cricpulse-backend`.

## Scope and acceptance criteria

1. **OBS automatic recovery** — OBS WebSocket reconnects after an unexpected close, reloads scene state, and does not reconnect after an intentional disconnect. The existing Task 1 recovery implementation remains the baseline.
2. **Broadcast Studio reliability** — connection and feed failures must be visible to the operator; recovery must restore scene and feed state without requiring a page reload.
3. **Overlay state synchronization** — accept only the current innings and strictly newer authoritative `eventVersion` values; REST, local relay, and WebSocket updates must not regress the displayed score.
4. **Live broadcast E2E** — verify the public broadcast-state endpoint, score updates, overlay rendering, and result/innings transitions against a running backend.
5. **Multi-device certification** — run scorer and OBS/overlay on separate devices or browser profiles; verify that a committed score reaches both public and authenticated consumers and that a reconnect catches up.
6. **Performance and network-failure certification** — interrupt and restore the network, restart the backend, and verify stale-data indication, reconnect, and score reconciliation. Record latency and recovery observations during a real match rehearsal.

## Implemented frontend safeguards

- Live score socket now exposes connection state, reconnect-attempt count, and the timestamp of the last accepted score event.
- A dropped WebSocket is represented as `RECONNECTING`; a successful STOMP reconnect resets the retry counter.
- Overlay health is explicitly represented as connecting, live, local-feed, stale, or error.
- A failed refresh after a previously loaded match is surfaced as stale data instead of silently presenting old scores as current.
- Overlay stream validation rejects duplicate/out-of-order `eventVersion` values before rendering; once a versioned snapshot is accepted, an unversioned legacy snapshot cannot overwrite it.
- Legacy feeds without event versions use strictly increasing `sequenceNo` values when available; innings changes establish a fresh comparison baseline.

## OBS scene-snapshot recovery regression coverage

The automated OBS WebSocket suite also verifies both failure boundaries:
- An initial connection that completes the WebSocket identification handshake but cannot load `GetSceneList` closes the partial socket and ends in `DISCONNECTED`; it must not leave a ghost connected session or schedule an automatic retry.
- A reconnect that identifies successfully but cannot load `GetSceneList` closes that partial socket, remains in `RECONNECTING`, and schedules another capped-backoff retry. Recovery is not announced until a valid scene snapshot is received.

These are simulated WebSocket contract tests. They do not replace a real OBS/vMix workstation and network-interruption rehearsal.

## Automated checks

Run from the frontend repository:

```bash
npm ci
npm run format:check
npm run typecheck
npm run test
npm run build
```

The CI run on this PR is the authoritative automated result. Do not treat the manual scenarios below as passed until someone runs and records them against a deployed/staging environment.

## Manual certification matrix

| Scenario | Procedure | Expected result |
|---|---|---|
| OBS reconnect | Disconnect OBS network briefly, then restore it | Controller shows reconnecting, then restores scenes and current scene |
| Intentional disconnect | Click Disconnect in OBS controller | No automatic reconnect; credentials/config remain intentionally cleared according to existing behavior |
| Score version ordering | Deliver a newer score, then replay a duplicate, older, and unversioned snapshot | Duplicate/older/unverifiable snapshots are ignored before rendering |
| Legacy sequence ordering | Deliver sequence 10, then 10, 9, and 11 | Duplicate/older sequence snapshots are ignored; sequence 11 is rendered |
| Overlay API outage | Stop backend after overlay has loaded a score | Overlay shows STALE DATA, not a false LIVE state |
| API recovery | Restart backend | Next successful poll restores LIVE DATA and current score |
| Two-device scoring | Score from device A; observe overlay on device B | Same committed score and version appear without manual refresh |
| Offline scorer | Disconnect scorer network, enter supported offline actions, reconnect | Pending actions reconcile without duplicate deliveries or score regression |
| Latency/load rehearsal | Run a representative match with OBS and at least two viewers | Record event-to-overlay latency, reconnect time, CPU/memory, and any missed/duplicate events |

## Certification record

- Automated CI: pending until GitHub Actions completes for the final PR head SHA.
- Manual multi-device / live-network scenarios: operator sign-off required.
- Production release: do not promote until the manual certification matrix is completed on the target deployment.


## OBS request-timeout and late-response regression coverage

The OBS WebSocket suite now verifies request lifecycle isolation:
- A request that receives no response is rejected after the configured eight-second timeout, while the identified WebSocket remains connected and can serve a subsequent request.
- A response arriving after its request timed out is ignored because its correlation entry has been removed; it cannot resolve or overwrite a newer in-flight request.

These tests use a simulated WebSocket and a controlled clock. They validate client-side request correlation and timeout handling, not real OBS availability or end-to-end broadcast latency.


## Legacy live-score event ordering

The scorer's STOMP socket now applies the same monotonic ordering contract to legacy feeds:
- Versioned events must have a strictly newer `eventVersion`; after a versioned event is accepted, unversioned frames are ignored because they cannot prove freshness.
- Before versioned events are available, legacy events with `sequenceNo` must be strictly increasing. Duplicate and older sequence numbers are ignored.
- Once sequence ordering is observed, unsequenced legacy frames are ignored rather than being allowed to overwrite the latest known state.
- Both ordering baselines reset when the scorer switches innings.

The regression suite exercises duplicate, out-of-order, missing-sequence, versioned-to-legacy downgrade, and innings-reset cases. These are deterministic client-side contract tests; they do not replace the real two-device broadcast rehearsal.


## Public broadcast reconciliation contract regression coverage

The public live-score service regression suite exercises critical cross-consumer delivery boundaries:
- Public viewers subscribe to the public innings destination, separate from the authenticated scorer destination.
- A REST recovery response already in flight cannot overwrite a newer WebSocket event when it returns late.
- Multiple version gaps received during one in-flight recovery are coalesced into a follow-up authoritative snapshot, avoiding parallel recovery storms while still catching up to the newest version.
- Existing multi-viewer coverage verifies independent public viewers receive the same authoritative event and reject stale versions.

These are deterministic Angular HTTP/STOMP contract tests. They validate client-side public broadcast synchronization and recovery, but are not a deployed-backend/browser/OBS multi-device E2E rehearsal. The manual certification matrix above remains required for production sign-off.


## Chromium broadcast browser regression suite

The frontend CI now runs a real Chromium browser against the Angular development server with deterministic public API fixtures:
- Public match centre loads the match, discovers its current innings, and renders the authoritative score snapshot.
- OBS broadcast overlay loads the broadcast-state endpoint and renders the same innings score, batting team, and over in its strip graphic.
- Public match centre recovers and renders the score when the first innings snapshot request returns HTTP 503 and the subsequent retry succeeds.

The Playwright suite is intentionally isolated from the application dependency lockfile: CI installs a pinned test runner without modifying the product dependency manifest. API responses are mocked, so this suite validates browser routing, Angular rendering, and client retry behavior, not backend scoring writes, authenticated scorer sessions, a live STOMP server, two physical devices, or an actual OBS/vMix capture session. Those remain separate integration/manual certification requirements.
