import { readFile, readdir } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';

const appRoot = resolve('src/app');

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

const files = await walk(appRoot);
const sources = await Promise.all(
  files.map(async (file) => ({ file, source: await readFile(file, 'utf8') })),
);

const shims = sources.filter(({ file, source }) => {
  const rootLevel = relative(appRoot, file).split('/').length === 1;
  const reExportOnly = /^export\s+(?:\*|\{[^}]+\})\s+from\s+['"][^'"]+['"];?$/.test(
    source.trim(),
  );

  return rootLevel && reExportOnly;
});

if (shims.length === 0) {
  console.log('Legacy shim audit: no root-level re-export shims found.');
  process.exit(0);
}

console.log(`Legacy shim audit: ${shims.length} compatibility shims detected.`);

for (const shim of shims) {
  const fileName = basename(shim.file, '.ts');
  const consumers = sources
    .filter(({ file, source }) => file !== shim.file && source.includes(fileName))
    .map(({ file }) => relative(process.cwd(), file));

  console.log(
    `- ${relative(process.cwd(), shim.file)}: ${consumers.length} potential source consumer(s)`,
  );

  for (const consumer of consumers) {
    console.log(`  -> ${consumer}`);
  }
}

console.log('Legacy files are reported only; this audit does not delete compatibility boundaries.');
