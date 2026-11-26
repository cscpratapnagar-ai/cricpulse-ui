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
