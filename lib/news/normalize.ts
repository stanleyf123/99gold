export type FeedItem = {
  externalId: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
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

export function parseFeed(xml: string): FeedItem[] {
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? [];
  return blocks.flatMap((block) => {
    const title = tagValue(block, ["title"]);
    const url = linkValue(block);
    const rawDate = tagValue(block, ["pubDate", "published", "updated", "dc:date"]);
    const timestamp = Date.parse(rawDate);
    if (!title || !url || !Number.isFinite(timestamp)) return [];
    return [{
      externalId: tagValue(block, ["guid", "id"]) || url,
      title,
      summary: tagValue(block, ["description", "summary", "content:encoded", "content"]).slice(0, 800),
      url,
      publishedAt: new Date(timestamp).toISOString(),
    }];
  });
}

export function canonicalizeUrl(value: string, allowedHosts: string[]) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    const originalHost = url.hostname.toLowerCase();
    const host = originalHost.replace(/^www\./, "");
    const allowed = allowedHosts.some((entry) => host === entry || host.endsWith(`.${entry}`));
    if (!allowed) return null;
    url.hostname = originalHost;
    url.hash = "";
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
