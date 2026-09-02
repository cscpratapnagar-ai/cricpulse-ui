# CricPulse UI production sign-off matrix

## Automated refactor and quality work completed

- [x] Feature-based Angular architecture
- [x] `core/`, `shared/`, `layout/`, `features/` boundaries
- [x] Canonical feature route ownership
- [x] Canonical component TS/HTML/SCSS/spec colocation
- [x] Route duplication reduced to a canonical protected-child inventory
- [x] Formatting quality gate
- [x] TypeScript quality gate
- [x] Canonical component structure audit
- [x] Route integrity audit
- [x] Critical test inventory audit
- [x] Legacy compatibility shim audit command
- [x] Production build gate
- [x] CI quality stage before production build
- [x] Formatter workflow changed from branch mutation to verification-only
- [x] Critical core behavior specs strengthened for loading, current-user, theme, auth and scorecard flows
- [x] Regression checklist documented
- [x] API origin centralized and runtime-configurable
- [x] Local API/WebSocket development proxy added
- [x] API requests restricted to `/api` paths before attaching bearer tokens
- [x] Centralized 401 session invalidation and login redirect
- [x] Security/API boundary audit enforced in CI
- [x] Feature integration audit enforced in CI
- [x] High-severity dependency audit enforced in CI

## Production Runtime Hardening matrix

| Issue | Risk | Solution | Final Solution | Who provides / controls it |
|---|---|---|---|---|
| API endpoint was environment-bound in frontend source | Wrong backend target or unsafe environment-specific builds | Centralize endpoint configuration | Same-origin `/api` by default, runtime override supported, local development uses Angular proxy | Frontend + deployment/reverse-proxy owner |
| Bearer token could be attached outside the API boundary | Credential leakage to third-party origins/assets | Restrict auth interceptor to API requests | `isApiRequest()` accepts `/api` paths and API-origin `/api/*` URLs only | Frontend |
| Expired JWT/session returned 401 without one centralized recovery path | Stale UI state and repeated unauthorized requests | Handle authenticated API 401 centrally | Session/token/user state is cleared and the user is routed to login | Frontend |
| Local development required hardcoded backend URLs | Inconsistent developer setup and production coupling | Use a dev proxy | `/api/**` and `/ws` proxy to the local Spring Boot backend | Frontend/dev environment |
| Automatic retry of scoring mutations can duplicate deliveries | Duplicate score events / corrupt match state | Do not auto-retry non-idempotent scoring writes | REST scoring writes remain server-authoritative; live socket reconnect is handled separately | Frontend + backend |
| JWT remains browser-readable in local storage | XSS can expose bearer credentials | Move authentication to secure HttpOnly cookies | **OPEN / EXTERNAL INTEGRATION** — requires coordinated Spring Security/backend cookie, CSRF, SameSite and session-policy changes | Backend/security owner |
| Realtime broker availability cannot be proven by static compilation | Missed live updates or stale scorer state | Reconnect and REST reconciliation | Socket reconnect/stale-session handling is implemented; executable realtime regression is still required | Frontend + backend/runtime infrastructure |

## Release evidence still required outside static repository audits

These checks require an executable browser/device/backend environment and must not be fabricated from a green compile:

- [x] Angular unit-test target and headless CI command configured (execution result is CI-gated)
- [ ] End-to-end regression for login and protected routes
- [ ] CRUD workflow regression against a running backend
- [ ] Live-scoring edge-case regression against realtime infrastructure
- [ ] Dark/light visual regression
- [ ] Desktop/tablet/mobile regression
- [ ] Accessibility and performance review
- [x] Dependency/security review gate added to CI (`npm audit --audit-level=high`)
- [ ] Evidence-based removal of unused legacy compatibility files

## Deployment contract

Production should serve the Angular application and backend API under the same origin when possible, with `/api/**` routed to the backend and `/ws` routed as a WebSocket upgrade. This keeps the browser configuration environment-neutral and avoids embedding deployment-specific API URLs into the bundle.

If a separate API origin is required, deployment may provide `globalThis.__CRICPULSE_CONFIG__` before the Angular application bootstraps:

```ts
{
  apiOrigin: 'https://api.example.com',
  wsOrigin: 'wss://api.example.com',
}
```

Do not put secrets in this runtime configuration; it is client-visible configuration.

## Completion rule

The automated repository-quality/refactor task is complete when CI is green for the current commit. Full release sign-off additionally requires the executable browser/device/backend evidence above. A green production build alone must never be presented as proof of full behavioral production readiness.
