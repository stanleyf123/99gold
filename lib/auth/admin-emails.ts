const DEFAULT_ADMIN_EMAIL = "stanleys1225@gmail.com";

function splitEmails(value: string | null | undefined) {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

/** Primary operator email used for ADMIN_TOKEN sessions. */
export function primaryAdminEmail(
  adminEmail = process.env.ADMIN_EMAIL,
  fallback = DEFAULT_ADMIN_EMAIL,
) {
  return (adminEmail?.trim() || fallback).toLowerCase();
}

/**
 * Google emails that receive `admin` on OAuth login.
 * Combines `ADMIN_EMAIL` with comma-separated `ADMIN_EMAILS`.
 */
export function parseAdminEmails(
  adminEmail = process.env.ADMIN_EMAIL,
  adminEmails = process.env.ADMIN_EMAILS,
  fallback = DEFAULT_ADMIN_EMAIL,
) {
  const primary = primaryAdminEmail(adminEmail, fallback);
  return [...new Set([primary, ...splitEmails(adminEmails)])];
}

export function emailHasAdminRole(
  email: string | null | undefined,
  adminEmail = process.env.ADMIN_EMAIL,
  adminEmails = process.env.ADMIN_EMAILS,
  fallback = DEFAULT_ADMIN_EMAIL,
) {
  const normalized = email?.trim().toLowerCase() ?? "";
  if (!normalized) return false;
  return parseAdminEmails(adminEmail, adminEmails, fallback).includes(normalized);
}
