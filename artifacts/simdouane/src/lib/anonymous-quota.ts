/**
 * Free estimates without an account (2 per browser, then an account is
 * required). The server keeps the counter (see the API route
 * anonymous-estimates); the browser only keeps its random identifier and a
 * copy of the counter, used when the server cannot be reached.
 */
export const ANONYMOUS_FREE_ESTIMATES = 2;

const ID_KEY = "simdouane_device_id";
const USED_KEY = "simdouane_anon_used";
const COOKIE_DAYS = 400;

export interface AnonymousQuota {
  used: number;
  limit: number;
  remaining: number;
}

const quota = (used: number, limit = ANONYMOUS_FREE_ESTIMATES): AnonymousQuota => ({
  used, limit, remaining: Math.max(0, limit - used),
});

function readCookie(name: string): string | null {
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${COOKIE_DAYS * 86400}; path=/; SameSite=Lax`;
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key) ?? readCookie(key);
  } catch {
    return readCookie(key);
  }
}

/** Written in two places, so that clearing only one of them does not reset the counter. */
function write(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* private mode */ }
  writeCookie(key, value);
}

/** Random identifier of this browser (created at first use). */
export function getDeviceId(): string {
  let id = read(ID_KEY);
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) id = crypto.randomUUID();
  write(ID_KEY, id);
  return id;
}

function localUsed(): number {
  const n = Number(read(USED_KEY));
  return Number.isInteger(n) && n > 0 ? n : 0;
}

/** Never lowers the local copy: the highest known count wins. */
function remember(q: AnonymousQuota): AnonymousQuota {
  const used = Math.max(q.used, localUsed());
  write(USED_KEY, String(used));
  return quota(used, q.limit);
}

const api = (path = "") => `${import.meta.env.BASE_URL}api/anonymous-estimates${path}`;

/** Current counter (server, or the local copy when it cannot be reached). */
export async function fetchAnonymousQuota(): Promise<AnonymousQuota> {
  try {
    const res = await fetch(api(`/${getDeviceId()}`));
    if (res.ok) return remember(await res.json());
  } catch { /* offline */ }
  return quota(localUsed());
}

/** Uses one free estimate. `allowed: false` once the limit is reached. */
export async function consumeAnonymousEstimate(): Promise<AnonymousQuota & { allowed: boolean }> {
  try {
    const res = await fetch(api(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deviceId: getDeviceId() }),
    });
    if (res.ok) return { ...remember(await res.json()), allowed: true };
    if (res.status === 403) return { ...remember(quota(ANONYMOUS_FREE_ESTIMATES)), allowed: false };
  } catch { /* offline: fall through to the local copy */ }
  const used = localUsed();
  if (used >= ANONYMOUS_FREE_ESTIMATES) return { ...quota(used), allowed: false };
  write(USED_KEY, String(used + 1));
  return { ...quota(used + 1), allowed: true };
}
