import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else if (entry.isFile() && path.endsWith('.ts')) files.push(path);
  }
  return files;
}

const failures = [];
const auth = await readFile('src/app/core/auth/auth.ts', 'utf8');
const routes = await readFile('src/app/app.routes.ts', 'utf8');
const config = await readFile('src/app/core/config/api.config.ts', 'utf8');

if (!auth.includes('isApiRequest(request.url)')) failures.push('auth interceptor is not restricted to API-origin requests');
if (!auth.includes('clearSession();') || !auth.includes('currentUser.clear();')) failures.push('invalid sessions do not fully clear client auth state');
if (!routes.includes('canActivate: [authGuard]')) failures.push('protected dashboard routes are missing authGuard');
if (!config.includes('API_BASE_URL')) failures.push('central API configuration is missing');

for (const file of await walk('src/app')) {
  if (file === 'src/app/core/config/api.config.ts') continue;
  const source = await readFile(file, 'utf8');
  if (/https?:\\/\\/localhost:8080/.test(source)) failures.push(`hardcoded local API endpoint: ${file}`);
}

if (failures.length) {
  console.error('Security/API audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Security/API audit passed.');
