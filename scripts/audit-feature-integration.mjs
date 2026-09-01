import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const featureRoot = 'src/app/features';
const routes = await readFile('src/app/app.routes.ts', 'utf8');

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else if (entry.isFile()) files.push(path);
  }

  return files;
}

const failures = [];
const featureEntries = await readdir(featureRoot, { withFileTypes: true });

for (const entry of featureEntries.filter((item) => item.isDirectory())) {
  const feature = entry.name;
  const files = await walk(join(featureRoot, feature));
  const components = files.filter((file) => file.endsWith('.component.ts'));

  if (!components.length) {
    failures.push(`feature "${feature}" has no components`);
    continue;
  }

  const routed = components.filter((file) => {
    const className = file.split('/').at(-1).replace('.component.ts', '');
    return routes.includes(className) || routes.includes(className.split('-').map((part) => part[0]?.toUpperCase() + part.slice(1)).join(''));
  });

  if (!routed.length) {
    failures.push(`feature "${feature}" has no component discoverable from route definitions`);
  }
}

if (failures.length) {
  console.error('Feature integration audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Feature integration audit passed.');
