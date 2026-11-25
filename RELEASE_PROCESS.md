# CricPulse UI Release Process

## Branches
- Development branch: `develop`
- Deployment branch: `release`

Vercel Git deployments are allowed only from the exact `release` branch. All other branches are blocked by `vercel.json`.

## Release promotion
1. Complete development and merge changes into `develop`.
2. Confirm required GitHub Actions checks are green.
3. Open a pull request from `develop` into `release`.
4. Merge only after review and green CI.
5. Confirm Vercel has built the new `release` commit successfully and run UI/API smoke tests.
6. Create the matching semantic version tag (for example, `v1.0.0`) on the deployed release commit. Never tag an unverified build.
7. For rollback, promote the last known-good commit back to `release`.

## Production container publishing
The `Publish Production Container` workflow runs only for pushes to `release` or a manual dispatch selecting `release`. Its publish job enforces the same exact-branch guard. Development branches (`develop` and any feature branch) must not publish production images or update the `latest` image tag.

## Version tags
Use semantic versioning: `vMAJOR.MINOR.PATCH`. Tags are immutable release records, not the deployment trigger. Vercel Git deployment is triggered by a push/merge to `release`.

## Important
- Set `release` as the Vercel production branch in the project.
- Preserve the existing `/api/:path*` rewrite to the backend.
- Keep payment checkout disabled until its separately approved final release.
- A green GitHub CI run is not proof of a successful Vercel deployment; verify Vercel status and application health separately.
