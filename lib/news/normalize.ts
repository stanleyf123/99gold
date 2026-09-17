export type FeedItem = {
  externalId: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  imageUrl: string | null;
};

function decodeXml(value: string) {
  const named: Record<string, string> = { amp: "&", apos: "'", gt: ">", lt: "<", quot: '"' };
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&([a-z]+);/gi, (entity, name: string) => named[name.toLowerCase()] ?? entity);
}

function plainText(value: string) {
  return decodeXml(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function tagValue(block: string, names: string[]) {
  for (const name of names) {
    const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
    if (match?.[1]) return plainText(match[1]);
  }
  return "";
}

function linkValue(block: string) {
  const textLink = tagValue(block, ["link"]);
  if (textLink) return textLink;
  const attributeLink = block.match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/i)?.[1];
  return attributeLink ? decodeXml(attributeLink).trim() : "";
}

function looksLikeImageTag(tag: string) {
  return /(?:type|medium)\s*=\s*["'][^"']*(?:image|jpe?g|png|webp|gif|avif)/i.test(tag)
    || /\.(?:jpe?g|png|webp|gif|avif)(?:\?|$)/i.test(tag);
}

export function canonicalizeCoverUrl(value: string, baseUrl?: string) {
  try {
    const url = new URL(value.trim(), baseUrl);
    if (url.protocol === "http:") url.protocol = "https:";
    if (url.protocol !== "https:") return null;
    if (/favicon|sprite|pixel|tracking|1x1|logo[-_]?small|icon[-_]?32/i.test(url.pathname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** RSS/Atom enclosure, media:content/thumbnail, or first <img> in the item block. */
export function extractFeedCover(block: string, baseUrl?: string) {
  const enclosure = block.match(/<enclosure\b[^>]*>/i)?.[0];
  if (enclosure && looksLikeImageTag(enclosure)) {
    const href = enclosure.match(/\burl=["']([^"']+)["']/i)?.[1];
    const url = href ? canonicalizeCoverUrl(decodeXml(href), baseUrl) : null;
    if (url) return url;
  }
  const mediaTags = block.match(/<media:(?:content|thumbnail)\b[^>]*>/gi) ?? [];
  for (const tag of mediaTags) {
    const href = tag.match(/\burl=["']([^"']+)["']/i)?.[1];
    const url = href ? canonicalizeCoverUrl(decodeXml(href), baseUrl) : null;
    if (url) return url;
  }
  const img = block.match(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i)?.[1];
  return img ? canonicalizeCoverUrl(decodeXml(img), baseUrl) : null;
}

/** RSS dates are usually RFC 2822; some publishers append an IANA zone (e.g. America/Chicago). */
export function parseFeedDate(rawDate: string) {
  const trimmed = rawDate.trim();
  if (!trimmed) return NaN;
  const direct = Date.parse(trimmed);
  if (Number.isFinite(direct)) return direct;
  const withoutIana = trimmed.replace(/\s+[A-Za-z_]+(?:\/[A-Za-z_+\-]+)+$/, " GMT");
  const fallback = Date.parse(withoutIana);
  return Number.isFinite(fallback) ? fallback : NaN;
}

export function parseFeed(xml: string): FeedItem[] {
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? [];
  return blocks.flatMap((block) => {
    const title = tagValue(block, ["title"]);
    const url = linkValue(block);
    const rawDate = tagValue(block, ["pubDate", "published", "updated", "dc:date"]);
    const timestamp = parseFeedDate(rawDate);
    if (!title || !url || !Number.isFinite(timestamp)) return [];
    return [{
      externalId: tagValue(block, ["guid", "id"]) || url,
      title,
      summary: tagValue(block, ["description", "summary", "content:encoded", "content"]).slice(0, 800),
      url,
      publishedAt: new Date(timestamp).toISOString(),
      imageUrl: extractFeedCover(block, url),
    }];
  });
}

export function canonicalizeUrl(value: string, allowedHosts: string[]) {
  try {
    const url = new URL(value);
    if (url.protocol === "http:") url.protocol = "https:";
    if (url.protocol !== "https:") return null;
    const originalHost = url.hostname.toLowerCase();
    const host = originalHost.replace(/^www\./, "");
    const allowed = allowedHosts.some((entry) => host === entry || host.endsWith(`.${entry}`));
    if (!allowed) return null;
    url.hostname = originalHost;
    url.hash = "";
    url.pathname = url.pathname.replace(/\/{2,}/g, "/");
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|mc_)/i.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizedTitle(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("en-US").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
