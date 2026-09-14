# Angular component structure

## Component convention

Each canonical UI component is colocated:

```
feature/pages/example/
├── example.component.ts
├── example.component.html
├── example.component.scss
└── example.component.spec.ts
```

## Ownership

- `core/`: singleton application concerns, authentication, interceptors, global services.
- `shared/`: reusable UI components and primitives with no feature ownership.
- `layout/`: application shells and navigation layout.
- `features/`: domain-owned pages, models, data-access, and feature-specific UI.
- Root-level legacy entry points are compatibility boundaries and must not own new behavior.

## Rules

1. Keep templates out of large page TypeScript files.
2. Keep component styling colocated in the component SCSS file.
3. Keep new tests next to the implementation.
4. Prefer feature-local services/models; promote only truly cross-cutting concerns to `core`.
5. Do not import legacy root compatibility files from new code.
6. Preserve route URLs and public APIs during cleanup.
