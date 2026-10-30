/**
 * Links from Supabase Auth e-mails come back with either a session in the
 * address (read by supabase-js) or an error, e.g.
 * `#error=access_denied&error_code=otp_expired&error_description=...`.
 * Returns the error code, or null when the address carries no error.
 */
export function linkError(location: { hash: string; search: string }): string | null {
  for (const part of [location.hash.replace(/^#/, ""), location.search.replace(/^\?/, "")]) {
    const params = new URLSearchParams(part);
    const code = params.get("error_code") || params.get("error");
    if (code) return code;
  }
  return null;
}
