import { readFile } from 'node:fs/promises';

const source = await readFile('src/app/app.routes.ts', 'utf8');
const failures = [];

if (!source.includes('export const routes: Routes = [')) {
  failures.push('routes export was not found');
}

if (!source.includes('const dashboardChildren: Routes = [')) {
  failures.push('canonical dashboardChildren inventory was not found');
}

if (!source.includes('canActivate: [authGuard]')) {
  failures.push('protected dashboard route guard was not found');
}

const childBlock = source.match(/const dashboardChildren: Routes = \[([\s\S]*?)\n\];/)?.[1] ?? '';
const childPaths = [...childBlock.matchAll(/path:\s*'([^']+)'/g)].map((match) => match[1]);
const duplicates = childPaths.filter((path, index) => childPaths.indexOf(path) !== index);

if (duplicates.length > 0) {
  failures.push(`duplicate canonical child paths: ${[...new Set(duplicates)].join(', ')}`);
}

const emptyHomeCount = (childBlock.match(/path:\s*''/g) ?? []).length;
if (emptyHomeCount !== 1) {
  failures.push(`expected one dashboard home route, found ${emptyHomeCount}`);
}

if (!source.trim().endsWith("{ path: '**', component: NotFoundComponent },\n];")) {
  failures.push('wildcard fallback route must be the final route');
}

const derivedCompatibilityRoutes =
  source.includes('.filter((route) => route.path)') &&
  source.includes('.map((route) => ({') &&
  source.includes("...dashboardRoute([{ ...route, path: '' }])");

if (!derivedCompatibilityRoutes) {
  failures.push('top-level compatibility routes are not derived from canonical inventory');
}

const lifecycleRequirements = [
  ['matches/:id/playing-xi', 'canonical Playing XI route'],
  ['matches/:id/toss', 'canonical Toss route'],
  ['matches/:id/opening-players', 'canonical Opening Players route'],
  ['matches/:id/live-scoring', 'canonical Live Scoring route'],
  ["canActivate: [canAccessMatchToss]", 'Toss lifecycle guard'],
  ["canActivate: [canAccessMatchOpening]", 'Opening Players lifecycle guard'],
  ["canActivate: [canAccessLiveScoring]", 'Live Scoring lifecycle guard'],
  ["path: 'live-scoring/:id', redirectTo: 'matches/:id/live-scoring'", 'legacy live-scoring redirect'],
  ["path: 'scoring/:id', redirectTo: 'matches/:id/live-scoring'", 'legacy scoring redirect'],
];

for (const [needle, label] of lifecycleRequirements) {
  if (!source.includes(needle)) failures.push(`missing ${label}`);
}

if (failures.length > 0) {
  console.error('Route integrity audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Route integrity audit passed for ${childPaths.length} canonical dashboard paths.`);
