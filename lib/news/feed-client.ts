export const NEWS_FEED_USER_AGENT =
  "Mozilla/5.0 (compatible; 99gold.net-news/1.0; +https://99gold.net)";
export const NEWS_FEED_ACCEPT =
  "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.1";

/** systemd `99gold-news.timer` on the VPS. */
export const NEWS_PIPELINE_INTERVAL_MS = 3 * 60 * 60 * 1000;
/** Homepage/admin “delayed” after one missed 3-hour run plus 90 minutes of slack. */
export const NEWS_SCHEDULE_STALE_AFTER_MS = NEWS_PIPELINE_INTERVAL_MS + 90 * 60 * 1000;
export const MAX_FEED_BYTES = 2_000_000;

export type FeedRequestState = {
  etag?: string | null;
  lastModified?: string | null;
};

export function newsFeedHeaders(state: FeedRequestState = {}): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: NEWS_FEED_ACCEPT,
    "User-Agent": NEWS_FEED_USER_AGENT,
    "Accept-Language": "en-US,en;q=0.9",
  };
  if (state.etag) headers["If-None-Match"] = state.etag;
  if (state.lastModified) headers["If-Modified-Since"] = state.lastModified;
  return headers;
}

export function feedHttpErrorMessage(status: number, statusText = "") {
  const reason = statusText.trim() || (status === 403 ? "Forbidden" : "");
  const prefix = reason ? `HTTP ${status} ${reason}` : `HTTP ${status}`;
  if (status === 403) return `${prefix} — source blocked or unavailable (not an empty feed)`;
  return `${prefix} — feed request failed`;
}

export function looksLikeFeedXml(xml: string) {
  const head = xml.replace(/^\uFEFF/, "").slice(0, 8_000);
  return /<(?:rss|feed|rdf:RDF)\b/i.test(head) || /<(?:item|entry)\b/i.test(head);
}

export function inspectFeedResponse(status: number, statusText: string, xml: string) {
  if (status === 304) return { kind: "not-modified" as const };
  if (status < 200 || status >= 300) throw new Error(feedHttpErrorMessage(status, statusText));
  if (!xml || xml.length > MAX_FEED_BYTES) throw new Error("Feed size invalid");
  if (!looksLikeFeedXml(xml)) throw new Error("Response was not a parseable RSS/Atom feed");
  return { kind: "ok" as const };
}
