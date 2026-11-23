import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const workflow = readFileSync('.github/workflows/publish-production-container.yml', 'utf8');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

assert.match(workflow, /permissions:\s*[\s\S]*?contents:\s*read/, 'workflow must use read-only source access');
assert.match(workflow, /packages:\s*write/, 'workflow must be allowed to publish GHCR images');
assert.match(workflow, /id-token:\s*write/, 'workflow must enable OIDC identity for signed provenance');
assert.match(workflow, /attestations:\s*write/, 'workflow must be allowed to publish attestations');
assert.match(workflow, /docker\/build-push-action@v6/, 'workflow must build using Buildx');
assert.match(workflow, /push:\s*true/, 'workflow must publish the image');
assert.match(workflow, /sbom:\s*true/, 'workflow must attach an SBOM');
assert.match(workflow, /provenance:\s*mode=max/, 'workflow must emit maximal BuildKit provenance');
assert.match(workflow, /type=sha/, 'workflow must publish immutable commit-SHA tags');
assert.match(workflow, /subject-digest:\s*\$\{\{\s*steps\.build\.outputs\.digest\s*\}\}/, 'attestation must bind to the pushed image digest');
assert.match(workflow, /actions\/attest-build-provenance@v2/, 'workflow must create a signed GitHub build provenance attestation');
assert.match(workflow, /push-to-registry:\s*true/, 'signed attestation must be published');
assert.doesNotMatch(workflow, /load:\s*true/, 'release workflow must not rely on a local-only image build');
assert.equal(pkg.scripts['release:provenance:audit'], 'node scripts/audit-production-image-provenance.mjs', 'package script must expose the provenance audit');

console.log('PASS: UI release workflow publishes immutable image tags, SBOM, BuildKit provenance, and digest-bound signed GitHub attestation');
