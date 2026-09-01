# CricPulse UI regression checklist

## Automated gates

Run before merge:

1. `npm run format:check`
2. `npm run typecheck`
3. `npm run component:audit`
4. `npm run route:audit`
5. `npm run test:inventory`
6. `npm run legacy:audit`
7. `npm run build -- --configuration production`

## Critical functional regression

### Authentication

- Login route renders without an authenticated session.
- Protected routes redirect to login when no access token exists.
- Invalid current-user verification clears the local session.
- Authenticated requests include the bearer token except login requests.

### Core application state

- Loading indicator handles overlapping requests without negative counts.
- Theme preference persists across reloads.
- System theme changes only affect the UI when preference is `system`.
- Current user storage is restored safely and corrupt storage does not crash the app.

### Live scoring

- Empty innings identifiers are rejected.
- Initial public score loads before realtime updates.
- Realtime messages for a different innings are ignored.
- Invalid realtime payloads surface a controlled error.
- Unsubscribe deactivates the realtime client.

### Routing

- Dashboard child routes remain protected.
- Legacy/top-level compatibility routes resolve to the canonical feature screen.
- Public live score remains public.
- Unknown routes resolve to the not-found screen.

### Responsive and visual checks

Verify at desktop, tablet and mobile widths:

- Sidebar navigation
- Header actions
- Dropdowns
- Date/time controls
- Forms
- Tables and scorecards
- Live scoring controls
- Dark and light themes

## Completion evidence

Record the commit SHA and CI run URL for automated checks. Browser/device regression should be signed off with screenshots or test-run evidence before release.
