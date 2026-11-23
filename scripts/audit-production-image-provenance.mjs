import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const workflow = readFileSync('.github/workflows/publish-production-container.yml', 'utf8');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const mustInclude = (value, message) => assert.ok(workflow.includes(value), message);

mustInclude('contents: read', 'source access must be read-only');
mustInclude('packages: write', 'GHCR publishing permission is required');
mustInclude('id-token: write', 'OIDC signing permission is required');
mustInclude('attestations: write', 'attestation permission is required');
mustInclude('docker/build-push-action@v6', 'Buildx action is required');
mustInclude('push: true', 'image must be pushed');
mustInclude('sbom: true', 'SBOM generation is required');
mustInclude('provenance: mode=max', 'BuildKit provenance is required');
mustInclude('type=sha', 'immutable commit tags are required');
mustInclude(
  'IMAGE_NAME: cscpratapnagar-ai/cricpulse-ui',
  'attestation subject must identify the frontend image',
);
mustInclude(
  'subject-digest: ${{ steps.build.outputs.digest }}',
  'attestation must bind to the pushed digest',
);
mustInclude('actions/attest-build-provenance@v2', 'signed GitHub provenance is required');
mustInclude('push-to-registry: true', 'attestation must be published');
assert.ok(!workflow.includes('load: true'), 'local-only builds are forbidden');
assert.equal(
  pkg.scripts['release:provenance:audit'],
  'node scripts/audit-production-image-provenance.mjs',
  'package script must expose the provenance audit',
);

console.log('PASS: frontend image provenance configuration');
