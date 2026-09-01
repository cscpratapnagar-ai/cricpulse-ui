import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const appRoot = resolve('src/app');
const requiredSpecs = [
  'src/app/core/auth/auth.spec.ts',
  'src/app/core/interceptors/loading.interceptor.spec.ts',
  'src/app/core/services/current-user.service.spec.ts',
  'src/app/core/services/live-score.service.spec.ts',
  'src/app/core/services/loading.service.spec.ts',
  'src/app/core/services/theme.service.spec.ts',
  'src/app/features/scoring/data-access/scorecard.service.spec.ts',
];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(fullPath)));
    else if (entry.isFile() && entry.name.endsWith('.spec.ts')) files.push(fullPath);
  }

  return files;
}

const specs = await walk(appRoot);
const failures = [];

if (specs.length < 20) failures.push(`expected at least 20 specs, found ${specs.length}`);

for (const spec of requiredSpecs) {
  try {
    const source = await readFile(spec, 'utf8');
    const testCount = (source.match(/\bit\s*\(/g) ?? []).length;

    if (testCount < 2) failures.push(`${spec} needs at least two assertions/examples`);
    if (/expect\([^)]*Component\)\.toBeTruthy\(\)/.test(source)) {
      failures.push(`${spec} contains only class-existence style component coverage`);
    }
  } catch {
    failures.push(`missing critical spec: ${spec}`);
  }
}

if (failures.length > 0) {
  console.error('Test inventory audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Test inventory audit passed: ${specs.length} specs with all critical coverage files present.`,
);
