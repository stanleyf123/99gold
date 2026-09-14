/**
 * Public site origin for absolute redirects.
 *
 * Behind nginx → 127.0.0.1:3000, Next.js `request.url` is the upstream
 * address even when nginx forwards Host / X-Forwarded-*. Prefer SITE_URL
 * (trailing slash stripped) whenever it is set.
 */
export function publicOrigin(requestUrl: string, siteUrl = process.env.SITE_URL): string {
  const configured = (siteUrl ?? "").trim().replace(/\/+$/, "");
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Invalid SITE_URL — fall back to the inbound request origin.
    }
  }
  return new URL(requestUrl).origin;
}

export function publicAbsoluteUrl(path: string, requestUrl: string, siteUrl = process.env.SITE_URL): URL {
  return new URL(path, publicOrigin(requestUrl, siteUrl));
}
