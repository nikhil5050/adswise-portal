/**
 * Shared-password login. The session cookie holds an HMAC of a fixed label keyed
 * by PORTAL_PASSWORD, so changing the password logs everyone out.
 * Uses Web Crypto so it runs in both the proxy and route handlers.
 */
export const SESSION_COOKIE = 'adswise_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function sessionToken(password: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode('adswise-portal-session-v1'));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function isValidSession(token: string | undefined): Promise<boolean> {
  const password = process.env.PORTAL_PASSWORD;
  if (!password || !token) return false;
  return safeEqual(token, await sessionToken(password));
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
