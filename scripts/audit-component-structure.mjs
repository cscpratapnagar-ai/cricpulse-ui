import { access, readdir } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const roots = [
  'src/app/features',
  'src/app/layout',
  'src/app/shared/components',
].map(resolve);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith('.component.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

const components = (await Promise.all(roots.map(walk))).flat();
const failures = [];

for (const component of components) {
  const base = component.slice(0, -'.ts'.length);
  const required = [
    `${base}.html`,
    `${base}.scss`,
    `${base}.spec.ts`,
  ];

  for (const file of required) {
    try {
      await access(file);
    } catch {
      failures.push(`${relative(process.cwd(), component)} is missing ${relative(process.cwd(), file)}`);
    }
  }
}

if (failures.length > 0) {
  console.error('Canonical component structure audit failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Canonical component structure audit passed for ${components.length} components.`);
