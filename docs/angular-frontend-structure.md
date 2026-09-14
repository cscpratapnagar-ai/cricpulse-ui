# CricPulse UI Angular Structure

## Architecture

```text
src/app/
├── core/
│   ├── auth/
│   ├── interceptors/
│   └── services/
├── shared/
│   └── components/
│       ├── calendar/
│       ├── date-time-field/
│       ├── dropdown/
│       ├── primitives/
│       ├── select-field/
│       └── state-view/
├── layout/
│   └── dashboard/
├── features/
│   ├── account/
│   ├── analytics/
│   ├── auth/
│   ├── live/
│   ├── matches/
│   ├── players/
│   ├── public/
│   ├── scoring/
│   ├── settings/
│   ├── system/
│   ├── teams/
│   └── tournaments/
├── app.component.ts
├── app.component.html
├── app.component.scss
├── app.config.ts
└── app.routes.ts
```

## Component convention

Each feature-owned component uses colocated files:

```text
feature/pages/example/
├── example.component.ts
├── example.component.html
├── example.component.scss
└── example.component.spec.ts
```

A small number of existing components keep `.css` where that stylesheet was already canonical.

## Ownership rules

- **core**: application-wide singleton services, authentication and interceptors.
- **shared**: reusable UI primitives with no feature ownership.
- **layout**: application shell and dashboard composition.
- **features**: route/page and domain-specific implementation.
- **data-access**: feature API/state access.
- **models**: feature domain types.

## Compatibility policy

Legacy root-level TypeScript entry points are retained only as compatibility re-exports during the migration. New code and routes must import canonical feature/core/shared locations.

Do not add new inline `template` or `styles` blocks for migrated feature components. Keep presentation in the colocated HTML/SCSS files and behavior in the component TypeScript file.
