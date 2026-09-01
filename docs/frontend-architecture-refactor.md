# Frontend architecture refactor

## Goal
Refactor the Angular application without changing public URLs, user flows, API contracts, or runtime behaviour.

## Target boundaries
- `core/`: application-wide singleton services, guards, interceptors, infrastructure
- `shared/`: reusable presentational UI, directives, pipes, utilities
- `layout/`: shell, navigation and persistent application chrome
- `features/`: domain-owned screens and feature-local code

## Current migration inventory

### Core candidates
- auth.ts
- current-user.service.ts
- loading.service.ts
- loading.interceptor.ts
- live-score.service.ts

### Shared UI candidates
- state-view.component.ts
- cp-dropdown.component.ts
- cp-calendar.component.ts
- date-time-field.component.ts
- select-field.component.ts
- ui-primitives.component.ts
- theme.service.ts

### Feature domains
- auth: login, signup
- dashboard
- account
- teams: list, detail, create, bulk players
- players: list, profile, statistics, comparison, onboarding
- tournaments: list, detail, create, analytics, schedule, qualification
- matches: list, detail, create, result, statistics, scorecard
- scoring: scorer, toss, playing XI, live scoring, live viewer
- public: landing, home, public live score
- system: notifications, settings, not found, state gallery

## Safety rules
1. Move one boundary/domain at a time.
2. Preserve route paths and component behaviour.
3. Update every import atomically with the move.
4. Do not mix visual redesign with structural migration.
5. Keep reusable primitives framework-agnostic where practical.
6. Remove duplicate V1/V2 implementations only after route and dependency verification.
7. Build after each migration batch before continuing.

## Migration order
1. Audit and dependency map
2. Core + shared foundations
3. Auth + public pages
4. Layout + dashboard
5. Teams + players
6. Tournaments
7. Matches + scoring
8. System pages
9. Duplicate cleanup
10. Final route, import and build verification


## Migration status

### Completed in current branch
- Core authentication, loading, and current-user infrastructure moved to canonical `core/` locations.
- Theme ownership moved to `core/services`.
- Reusable state, dropdown, calendar, date-time, select, and primitive UI moved under `shared/components/`.
- Route entry points migrated into domain-owned `features/` folders.
- Dashboard shell moved to `layout/dashboard/`.
- Realtime score infrastructure moved to `core/services/`.
- Scoring models and data-access services moved into the scoring feature.
- `app.routes.ts` now consumes canonical feature entry points.
- Legacy root entry files for migrated code are compatibility re-export shims, leaving one canonical implementation.

### Verification completed
- Every relative import in `app.routes.ts` resolves to a tracked source file.
- All migrated route entry points have canonical feature or layout locations.
- Public route URLs and route declarations were preserved during migration.

### Final hardening status
- Canonical feature, layout, shared UI and app-shell components use colocated `.component.ts`, `.component.html`, `.component.scss`, and `.component.spec.ts` files.
- Source formatting is enforced with Prettier through the `format` and `format:check` scripts and the UI branch formatter workflow.
- Core services and interceptors remain under `core/`; scoring data access and models remain feature-owned.
- Root legacy files remain compatibility boundaries and are intentionally not treated as canonical implementations.
- Final Angular production build is verified in CI on the formatted UI branch head.


## Safe duplicate cleanup audit

The following legacy root files are now compatibility boundaries and are intentionally retained until a repository-wide production build is green:
- bulk-team-players.component.ts
- bulk-team-players-v2.component.ts
- live-scoring.component.ts
- live-scoring-v2.component.ts
- playing-xi.component.ts
- playing-xi-v2.component.ts

Canonical route imports already point directly to the feature-owned implementations. This keeps existing external/legacy imports working while preventing duplicate implementation ownership.

### Live viewer

live-viewer.component.ts remains an independent component for now. It is not a route entry point in app.routes.ts, so it must not be deleted until a broader repository usage audit and production build confirm it is unused.


## Final Angular File Conventions

The canonical application structure follows these rules:

- Feature pages and reusable components use colocated .component.ts, .component.html, .component.scss, and .component.spec.ts files.
- Component templates and styles are externalized; large inline template and styles blocks are not used for canonical feature components.
- Root-level legacy files are compatibility re-export shims only and are not duplicate implementations.
- Cross-cutting services, guards and interceptors remain under core; reusable UI remains under shared; domain code remains feature-owned.
- Application and production build verification is performed after structural migration.


## Completion checklist

- [x] Architecture boundaries established
- [x] Feature migration completed
- [x] Canonical TS → HTML/SCSS separation completed
- [x] Canonical component spec structure completed
- [x] Core service/interceptor ownership audited
- [x] Feature data-access/model ownership audited
- [x] Prettier formatting workflow enabled and applied
- [x] Final Angular production build verified on `ui`
