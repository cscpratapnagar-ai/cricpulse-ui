import { readFile, readdir } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

const appRoot = resolve('src/app');

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(fullPath)));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

const files = await walk(appRoot);
const sourceFiles = files.filter((file) => /\.(ts|html)$/.test(file));
const rootTs = files.filter((file) => {
  const relative = file.slice(appRoot.length + 1);
  return !relative.includes('/') && relative.endsWith('.ts') && !relative.startsWith('app.');
});

const failures = [];

for (const shim of rootTs) {
  const name = basename(shim, '.ts');
  const patterns = [
    `from './${name}'`,
    `from '../${name}'`,
    `from '../../${name}'`,
    `src/app/${name}`,
  ];

  const consumers = [];
  for (const file of sourceFiles) {
    if (file === shim) continue;
    const source = await readFile(file, 'utf8');
    if (patterns.some((pattern) => source.includes(pattern))) consumers.push(file);
  }

  if (consumers.length > 0) {
    failures.push(`${name}.ts still has ${consumers.length} non-root consumer(s): ${consumers.join(', ')}`);
  }
}

if (failures.length > 0) {
  console.error('Legacy shim migration audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Legacy shim migration audit passed: ${rootTs.length} root compatibility files have no source consumers.`);
