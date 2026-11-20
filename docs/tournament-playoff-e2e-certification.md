# Tournament Qualification & Playoff Lifecycle E2E Certification

## Purpose

This document defines the release certification sequence for a four-team playoff and the frontend contract coverage that runs in ordinary UI CI. The backend remains authoritative for standings, persisted fixtures, progression, permissions, match results and champion declaration.

## Repository boundaries

- Frontend changes target `cricpulse-ui:develop`.
- The backend remains on `cricpulse-backend:main`; this certification does not modify backend code or database state.
- UI tests use deterministic HTTP fixtures. They must never fabricate persisted playoff fixtures or call progression outside the explicit organiser action.

## Backend lifecycle certification

Run against an isolated disposable test database and a dedicated test tournament only:

```bash
EMAIL=... PASSWORD=... TOURNAMENT_ID=... \
  ./scripts/e2e-tournament-playoff-progression.sh
```

The backend script validates league completion, initial Q1/Eliminator creation, repeated-progression idempotency, Q1 loser + Eliminator winner into Q2, Q1 winner + Q2 winner into Final, champion declaration, and stable repeated champion response. It directly updates disposable match rows through `psql`; never point it at production data.

Additional backend lifecycle/permission suites available on `main` include:

- `scripts/e2e-tournament-flow.sh`
- `scripts/e2e-tournament-manager-access.sh`
- `scripts/e2e-tournament-hardening.sh`

The manager-access suite verifies scoped tournament access, forbidden manager escalation, owner-only manager administration and immediate revocation. Execute it with dedicated owner/manager test identities and isolated fixtures.

## Frontend certification matrix

The Angular test suite exercises the real component with Angular's HTTP testing backend and covers:

1. Read tournament status, qualification preview and persisted fixtures.
2. Keep progression disabled until an eligible, ACTIVE tournament has at least one league fixture and all league fixtures are COMPLETED.
3. POST progression only after the organiser invokes the action; then reload fixtures from the backend.
4. Prevent a second progression request while the first is pending.
5. Render all four stages from persisted fixture records and show winner/champion only from confirmed match-result winner IDs.
6. Refresh/recovery reloads current fixtures and result records after navigation/reload.
7. Surface HTTP 403/409 errors without exposing server internals or inventing bracket state.
8. Keep empty qualification and no-playoff-fixture states explicit and non-actionable.
9. Display a backend-confirmed Super Over winner from the match result API; never calculate the Super Over winner in the browser.

## Super Over and result interpretation

The bracket does not infer winners from score totals, match status, or a local Super Over calculation. A completed match winner is displayed only when `GET /matches/{matchId}/result` returns a `winningTeamId` matching one of the persisted fixture participants. Super Over outcome calculation and result finalization remain backend responsibilities; the frontend regression fixture represents the final, backend-confirmed winner ID.

## Public viewer journey

- Public route: `/tournament/{tournamentId}` (no login required).
- Read-only API: `GET /api/public/tournaments/{tournamentId}`.
- The response exposes tournament summary, league standings, persisted fixture stages/statuses, scheduled times and a winner name only when the stored winner ID matches one of the fixture participants.
- The public payload deliberately omits owner IDs, manager assignments, staff records, player account details and mutation capabilities.
- Organizer workspace links to the public page using the `Public view` action. Organizer and delegated-manager routes remain behind the authenticated dashboard and existing backend tournament-scoped authorization.

## Limits of CI

Frontend GitHub Actions CI validates static quality, Angular unit tests, production build and Docker image build. It does not have the dedicated backend database, credentials or disposable tournament needed to execute the database-mutating backend certification script. Report backend live E2E as not run unless it has actually been executed in the isolated environment.
