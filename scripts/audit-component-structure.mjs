import { access, readdir } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const appRoot = resolve('src/app');
const auditedRoots = new Set(['features', 'layout', 'shared/components']);

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

function isCanonicalComponent(file) {
  const path = relative(appRoot, file).replaceAll('\\\\', '/');

  return [...auditedRoots].some((root) => path === root || path.startsWith(`${root}/`));
}

const files = await walk(appRoot);
const components = files.filter(isCanonicalComponent);
const failures = [];

for (const component of components) {
  const expected = [
    component.replace(/\.ts$/, '.html'),
    component.replace(/\.ts$/, '.scss'),
    component.replace(/\.ts$/, '.spec.ts'),
  ];

  for (const file of expected) {
    try {
      await access(file);
    } catch {
      failures.push(
        `${relative(process.cwd(), component)} is missing ${relative(process.cwd(), file)}`,
      );
    }
  }
}

if (components.length === 0) {
  console.error('Canonical component structure audit found no components.');
  process.exit(1);
}

if (failures.length > 0) {
  console.error('Canonical component structure audit failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Canonical component structure audit passed for ${components.length} components.`);
