const COVER_FETCH_TIMEOUT_MS = 8_000;
const COVER_HTML_LIMIT = 200_000;
const COVER_USER_AGENT = "Mozilla/5.0 (compatible; 99gold.net-news/1.0; +https://99gold.net)";
const SKIP_PATH = /favicon|sprite|pixel|tracking|1x1|logo[-_]?small|icon[-_]?32/i;

function decodeXml(value: string) {
  const named: Record<string, string> = { amp: "&", apos: "'", gt: ">", lt: "<", quot: '"' };
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&([a-z]+);/gi, (entity, name: string) => named[name.toLowerCase()] ?? entity);
}

export function canonicalizeCoverUrl(value: string, baseUrl?: string) {
  try {
    const url = new URL(value.trim(), baseUrl);
    if (url.protocol === "http:") url.protocol = "https:";
    if (url.protocol !== "https:") return null;
    if (SKIP_PATH.test(url.pathname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function firstUrl(candidates: Array<string | undefined | null>, baseUrl?: string) {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const url = canonicalizeCoverUrl(decodeXml(candidate), baseUrl);
    if (url) return url;
  }
  return null;
}

function metaContent(html: string, property: string) {
  const named = new RegExp(
    `<meta\\b[^>]*(?:property|name)=["']${property}["'][^>]*\\bcontent=["']([^"']+)["'][^>]*>`,
    "i",
  );
  const reversed = new RegExp(
    `<meta\\b[^>]*\\bcontent=["']([^"']+)["'][^>]*(?:property|name)=["']${property}["'][^>]*>`,
    "i",
  );
  return html.match(named)?.[1] ?? html.match(reversed)?.[1] ?? "";
}

export function extractHtmlCover(html: string, baseUrl: string) {
  const og = firstUrl([
    metaContent(html, "og:image"),
    metaContent(html, "og:image:url"),
    metaContent(html, "twitter:image"),
    metaContent(html, "twitter:image:src"),
  ], baseUrl);
  if (og) return og;
  const imgs = html.match(/<img\b[^>]*>/gi) ?? [];
  for (const tag of imgs) {
    const width = Number(tag.match(/\bwidth=["'](\d+)["']/i)?.[1] ?? 0);
    const height = Number(tag.match(/\bheight=["'](\d+)["']/i)?.[1] ?? 0);
    if ((width > 0 && width < 80) || (height > 0 && height < 80)) continue;
    const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1];
    const url = firstUrl([src], baseUrl);
    if (url) return url;
  }
  return null;
}

export async function resolveArticleCover(
  articleUrl: string,
  feedImage: string | null | undefined,
  fetcher: typeof fetch = fetch,
) {
  const fromFeed = feedImage ? canonicalizeCoverUrl(feedImage, articleUrl) : null;
  if (fromFeed) return fromFeed;
  try {
    const response = await fetcher(articleUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "User-Agent": COVER_USER_AGENT,
      },
      redirect: "follow",
      signal: AbortSignal.timeout(COVER_FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType && !/html|xml|text\/plain/i.test(contentType)) return null;
    const html = (await response.text()).slice(0, COVER_HTML_LIMIT);
    return extractHtmlCover(html, articleUrl);
  } catch {
    return null;
  }
}
