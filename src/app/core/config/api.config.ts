export const API_ORIGIN = 'http://localhost:8080';
export const API_BASE_URL = `${API_ORIGIN}/api`;
export const WS_ORIGIN = API_ORIGIN.replace(/^http/, 'ws');

export function isApiRequest(url: string): boolean {
  return url === API_ORIGIN || url.startsWith(`${API_ORIGIN}/`);
}
