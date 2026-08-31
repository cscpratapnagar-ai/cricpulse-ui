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
