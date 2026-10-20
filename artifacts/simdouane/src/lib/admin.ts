/**
 * Which accounts see the "Administration" links. Display only: the API checks
 * its own ADMIN_EMAILS list on every /api/admin request.
 * VITE_ADMIN_EMAILS: comma-separated list, defaults to the historical admin.
 */
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || "hazoumeclarence@gmail.com")
  .split(",")
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}
