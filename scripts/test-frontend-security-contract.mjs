import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const routesText = read('../src/app/app.routes.ts');
const authText = read('../src/app/auth.ts');
const source = ts.createSourceFile('app.routes.ts', routesText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

function property(object, name) {
  return object.properties.find((item) =>
    ts.isPropertyAssignment(item) &&
    ((ts.isIdentifier(item.name) && item.name.text === name) ||
      (ts.isStringLiteral(item.name) && item.name.text === name))
  );
}

const declaration = source.statements
  .filter(ts.isVariableStatement)
  .flatMap((statement) => [...statement.declarationList.declarations])
  .find((item) => ts.isIdentifier(item.name) && item.name.text === 'routes');

assert.ok(declaration && declaration.initializer && ts.isArrayLiteralExpression(declaration.initializer),
  'app.routes.ts must export a statically declared routes array');

const publicPaths = new Set(['', 'login', 'signup', 'live/:id']);
let protectedRouteCount = 0;

function inspectRoute(route, inheritedGuard = false) {
  assert.ok(ts.isObjectLiteralExpression(route), 'Every route entry must be an object literal');
  const pathProperty = property(route, 'path');
  const path = pathProperty && ts.isStringLiteral(pathProperty.initializer)
    ? pathProperty.initializer.text
    : null;

  const guardProperty = property(route, 'canActivate');
  const hasAuthGuard = Boolean(guardProperty &&
    ts.isArrayLiteralExpression(guardProperty.initializer) &&
    guardProperty.initializer.elements.some((item) =>
      ts.isIdentifier(item) && item.text === 'authGuard'
    ));
  const guarded = inheritedGuard || hasAuthGuard;

  if (path !== null && path !== '**' && !publicPaths.has(path)) {
    assert.ok(guarded, `Private route "${path}" must be protected by authGuard`);
    protectedRouteCount += 1;
  }

  const childrenProperty = property(route, 'children');
  if (childrenProperty && ts.isArrayLiteralExpression(childrenProperty.initializer)) {
    for (const child of childrenProperty.initializer.elements) {
      inspectRoute(child, guarded);
    }
  }
}

for (const route of declaration.initializer.elements) inspectRoute(route);
assert.ok(protectedRouteCount >= 25,
  `Expected broad protected route coverage; found only ${protectedRouteCount} guarded routes`);

// Session cookies and CSRF must remain enabled for every API mutation.
assert.match(authText, /withCredentials:\s*true/,
  'API requests must include cross-device session cookies');
assert.match(authText, /headers:\s*request\.headers\.delete\(['"]Authorization['"]\)/,
  'Browser API requests must not fall back to local bearer-token authentication');
assert.match(authText, /SAFE_METHODS[\s\S]*?request\.url\.includes\(['"]\/auth\/csrf['"]\)/,
  'Safe methods and CSRF bootstrap must be handled explicitly');
assert.match(authText, /\$\{API_BASE\}\/auth\/csrf/,
  'Mutating API calls must bootstrap a CSRF token when the cookie is not readable');
assert.match(authText, /X-XSRF-TOKEN/,
  'Mutating API calls must send the CSRF header');
assert.match(authText, /\$\{API_BASE\}\/auth\/me/,
  'Protected-route guard must validate the server-side session');
assert.match(authText, /catchError\(\(\) => \{[\s\S]*?clearSession\(\)/,
  'Failed session validation must clear stale client session state');
assert.match(authText, /:\s*'\/api'/,
  'Production must use the same-origin API path by default');

console.log(`PASS: ${protectedRouteCount} protected routes inherit or declare authGuard; session-cookie, CSRF, server validation, and same-origin API contracts are present.`);
