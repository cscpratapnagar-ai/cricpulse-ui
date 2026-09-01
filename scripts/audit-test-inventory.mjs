import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const appRoot = resolve('src/app');

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

for (const spec of specs) {
  const source = await readFile(spec, 'utf8');
  const testCount = (source.match(/\bit\s*\(/g) ?? []).length;
  const expectCount = (source.match(/\bexpect\s*\(/g) ?? []).length;
  const trivialExistence =
    /describe\([^]*?\{\s*it\([^]*?expect\([^)]*(?:Component|component)\)\.toBeTruthy\(\)[^]*?\}\s*\);?\s*\}/m.test(
      source,
    ) && testCount === 1;

  if (testCount < 1) failures.push(`${spec} has no executable test`);
  if (expectCount < 1) failures.push(`${spec} has no assertion`);
  if (trivialExistence) failures.push(`${spec} contains only class-existence coverage`);
}

if (failures.length > 0) {
  console.error('Test quality audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Test quality audit passed: ${specs.length} specs audited.`);
