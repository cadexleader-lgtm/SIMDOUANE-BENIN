/**
 * Destinations after sign-in / sign-up. Only paths inside this application
 * are accepted (never another site: no open redirect).
 *
 * "App path" = path as wouter sees it, without the BASE_PATH prefix.
 */

// Pages that must never be used as a destination (they would loop).
const EXCLUDED = [
  /^\/sign-in(\/|$)/,
  /^\/sign-up(\/|$)/,
  /^\/onboarding(\/|$)/,
  /^\/mot-de-passe-oublie(\/|$)/,
  /^\/nouveau-mot-de-passe(\/|$)/,
  /^\/auth\/confirmation(\/|$)/,
];

function stripBase(path: string, basePath: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

/**
 * Returns the safe app path for a destination taken from the URL
 * (`redirect_url`, `next`), or null if it points outside the application.
 */
export function safeAppPath(raw: string | null | undefined, basePath: string, origin: string): string | null {
  if (!raw) return null;
  if (/[\u0000-\u001f\\]/.test(raw)) return null;
  let url: URL;
  try {
    url = new URL(raw, origin);
  } catch {
    return null;
  }
  if (url.origin !== new URL(origin).origin) return null;
  if (!raw.startsWith("/") && !raw.startsWith(origin)) return null; // relative paths like "evil" or "//host"
  if (raw.startsWith("//")) return null;
  const pathname = stripBase(url.pathname, basePath);
  if (!pathname.startsWith("/") || EXCLUDED.some((re) => re.test(pathname))) return null;
  return pathname + url.search + url.hash;
}

/** Onboarding, then back to `destination` when there is one. */
export function onboardingUrl(destination: string | null, basePath: string): string {
  return `${basePath}/onboarding${destination ? `?next=${encodeURIComponent(destination)}` : ""}`;
}

/** Sign-in page (wouter path) remembering the page the visitor wanted. */
export function signInPathFor(appPath: string, search: string, basePath: string): string {
  const destination = `${basePath}${appPath}${search}`;
  return `/sign-in?redirect_url=${encodeURIComponent(destination)}`;
}
