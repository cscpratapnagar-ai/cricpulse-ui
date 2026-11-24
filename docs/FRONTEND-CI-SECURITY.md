# Frontend CI security and reproducibility

The frontend validation workflow is intentionally read-only.

## Dependency installation

Both CI jobs use `npm ci --no-audit --no-fund`. The committed `package-lock.json` is the dependency source of truth; CI must fail when package metadata and the lockfile are inconsistent. The production Docker build also uses `npm ci`.

## GitHub token permissions

The workflow grants only `contents: read`. Both checkout steps set `persist-credentials: false`, so the checkout token is not left in the local Git configuration. The CI workflow must not create commits, push branches, or rewrite contributor branches.

Image publication remains a separate workflow with its own narrowly scoped package, OIDC, and attestation permissions.

## Formatting

CI runs `npm run format:check` as a validation gate. Contributors should run `npm run format` locally and commit the resulting formatting changes before opening a pull request. CI never modifies the pull request branch to make formatting pass.

The `npm run ci:policy:audit` regression check enforces the read-only permission, non-persisted checkout credentials, lockfile-based install commands, and absence of branch-mutating Git commands.
