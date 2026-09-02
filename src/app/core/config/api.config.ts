export interface CricPulseRuntimeConfig {
  apiOrigin?: string;
  wsOrigin?: string;
}

function getRuntimeConfig(): CricPulseRuntimeConfig {
  if (typeof globalThis === 'undefined') {
    return {};
  }

  return (
    globalThis as typeof globalThis & {
      __CRICPULSE_CONFIG__?: CricPulseRuntimeConfig;
    }
  ).__CRICPULSE_CONFIG__ ?? {};
}

function getBrowserOrigin(): string {
  if (typeof globalThis === 'undefined' || !('location' in globalThis)) {
    return '';
  }

  return globalThis.location.origin;
}

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/$/, '');
}

function toWebSocketOrigin(origin: string): string {
  return origin.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
}

const runtimeConfig = getRuntimeConfig();
const browserOrigin = getBrowserOrigin();

export const API_ORIGIN = normalizeOrigin(
  runtimeConfig.apiOrigin ?? browserOrigin,
);
export const API_BASE_URL = `${API_ORIGIN}/api`;
export const WS_ORIGIN = normalizeOrigin(
  runtimeConfig.wsOrigin ?? toWebSocketOrigin(API_ORIGIN),
);

export function isApiRequest(url: string): boolean {
  if (url === '/api' || url.startsWith('/api/')) {
    return true;
  }

  if (!API_ORIGIN) {
    return false;
  }

  try {
    const requestUrl = new URL(url, browserOrigin || undefined);
    const apiOrigin = new URL(API_ORIGIN, browserOrigin || undefined);

    return (
      requestUrl.origin === apiOrigin.origin &&
      requestUrl.pathname.startsWith('/api/')
    );
  } catch {
    return false;
  }
}
