import { readFile, readdir } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';

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

function resolveImport(fromFile, specifier) {
  if (specifier.startsWith('src/app/')) {
    return resolve(specifier);
  }

  if (specifier.startsWith('.')) {
    return resolve(dirname(fromFile), specifier);
  }

  return null;
}

function matchesShim(resolvedImport, shim) {
  if (!resolvedImport) return false;

  const normalized = resolvedImport.replace(/\\/g, '/');
  const normalizedShim = shim.replace(/\\/g, '/').replace(/\.ts$/, '');

  return (
    normalized === normalizedShim ||
    normalized === `${normalizedShim}.ts` ||
    normalized === `${normalizedShim}/index`
  );
}

const files = await walk(appRoot);
const sourceFiles = files.filter((file) => file.endsWith('.ts'));
const rootShims = files.filter((file) => {
  const fileRelative = relative(appRoot, file);
  return (
    !fileRelative.includes('/') && fileRelative.endsWith('.ts') && !fileRelative.startsWith('app.')
  );
});

const failures = [];

for (const shim of rootShims) {
  const consumers = [];

  for (const file of sourceFiles) {
    if (file === shim) continue;

    const source = await readFile(file, 'utf8');
    const imports = [
      ...source.matchAll(/from\s+['"]([^'"]+)['"]/g),
      ...source.matchAll(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g),
    ];

    for (const match of imports) {
      if (matchesShim(resolveImport(file, match[1]), shim)) {
        consumers.push(relative(process.cwd(), file));
        break;
      }
    }
  }

  if (consumers.length > 0) {
    failures.push(
      `${relative(appRoot, shim)} still has ${consumers.length} direct consumer(s): ${consumers.join(', ')}`,
    );
  }
}

if (failures.length > 0) {
  console.error('Legacy shim migration audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Legacy shim migration audit passed: ${rootShims.length} root compatibility files have no direct source consumers.`,
);
