# Frontend architecture refactor

## Goal

Refactor the Angular application without changing public URLs, user flows, API contracts or runtime behaviour.

## Verified structural completion

- `core/`, `shared/`, `layout/` and `features/` boundaries are established.
- Route entry points use domain-owned feature folders.
- Dashboard shell is under `layout/dashboard/`.
- Realtime score infrastructure is under `core/services/`.
- Scoring models and data access are feature-owned.
- Canonical components use colocated `.component.ts`, `.component.html`, `.component.scss` and `.component.spec.ts` files.
- Root legacy files are compatibility boundaries, not canonical implementations.

## Route hardening

The route table now has one canonical protected-child inventory. Top-level compatibility URLs are derived from that inventory instead of manually duplicating declarations, reducing route drift while preserving deep links.

## Quality gates

The repository exposes:

- `npm run format:check`
- `npm run typecheck`
- `npm run legacy:audit`
- `npm run quality`
- `npm run build -- --configuration production`

CI runs formatting, TypeScript checking, legacy-shim auditing and the production build as separate gates. The formatter workflow is verification-only and no longer mutates the branch.

## Legacy compatibility policy

Legacy root files remain until:

1. Repository-wide import/usage audit identifies no required consumers.
2. Canonical feature implementation is the only runtime owner.
3. TypeScript and production build are green after removal.
4. Critical workflow regression has been completed.

The audit script reports compatibility shims without deleting them. Removal is a separate evidence-based change.

## Production sign-off

Structural completion is not behavioral completion. Final production sign-off still requires meaningful component, service, guard, interceptor and route tests, plus end-to-end regression for authentication, protected routes, CRUD, live scoring, dark/light mode, responsive UI and reusable controls.

See `docs/production-signoff.md` for the current matrix.
