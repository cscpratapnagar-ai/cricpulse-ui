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

### Remaining hardening
- Run the Angular production build in CI/local workspace after the structural batch.
- Audit unused legacy V1/V2 screens that are not route entry points before deletion.
- Convert compatibility shims to temporary deprecation boundaries and remove them only after repository-wide import migration.
