const COVER_FETCH_TIMEOUT_MS = 8_000;
const COVER_HTML_LIMIT = 200_000;
const COVER_USER_AGENT = "Mozilla/5.0 (compatible; 99gold.net-news/1.0; +https://99gold.net)";
const SKIP_PATH = /favicon|sprite|pixel|tracking|1x1|logo[-_]?small|icon[-_]?32|icon[-_]?16/i;
const IMAGE_EXT = /\.(?:jpe?g|png|webp|gif|avif)(?:$|[?#])/i;
const IMAGE_PATH = /\/(?:wp-content\/uploads|uploads\/|images?\/|img\/|photos?\/|media\/|covers?\/|thumbs?\/|article\/)/i;

type CoverOptions = { declaredImage?: boolean };

function decodeXml(value: string) {
  const named: Record<string, string> = { amp: "&", apos: "'", gt: ">", lt: "<", quot: '"' };
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&([a-z]+);/gi, (entity, name: string) => named[name.toLowerCase()] ?? entity);
}

export function looksLikeCoverUrl(value: string, options: CoverOptions = {}) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const pathAndQuery = `${url.pathname}${url.search}`;
    if (SKIP_PATH.test(pathAndQuery)) return false;
    if (options.declaredImage) return true;
    return IMAGE_EXT.test(url.pathname) || IMAGE_EXT.test(url.search) || IMAGE_PATH.test(url.pathname);
  } catch {
    return false;
  }
}

export function canonicalizeCoverUrl(value: string, baseUrl?: string, options: CoverOptions = {}) {
  try {
    const url = new URL(value.trim(), baseUrl);
    if (url.protocol === "http:") url.protocol = "https:";
    if (url.protocol !== "https:") return null;
    const href = url.toString();
    if (!looksLikeCoverUrl(href, options)) return null;
    return href;
  } catch {
    return null;
  }
}

function firstUrl(candidates: Array<string | undefined | null>, baseUrl?: string, options: CoverOptions = {}) {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const url = canonicalizeCoverUrl(decodeXml(candidate), baseUrl, options);
    if (url) return url;
  }
  return null;
}

function looksLikeImageTag(tag: string) {
  return /(?:type|medium)\s*=\s*["'][^"']*(?:image|jpe?g|png|webp|gif|avif)/i.test(tag)
    || IMAGE_EXT.test(tag);
}

function attr(tag: string, name: string) {
  return tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`, "i"))?.[1];
}

function nestedTagUrl(inner: string) {
  const urlTag = inner.match(/<url(?:\s[^>]*)?>([\s\S]*?)<\/url>/i)?.[1];
  if (urlTag) return decodeXml(urlTag).replace(/<[^>]*>/g, "").trim();
  return attr(inner, "url") || attr(inner, "href") || "";
}

function skipTinyDimensions(markup: string) {
  const width = Number(markup.match(/<(?:media:)?width(?:\s[^>]*)?>(\d+)<\/(?:media:)?width>/i)?.[1]
    ?? markup.match(/\bwidth=["'](\d+)["']/i)?.[1]
    ?? 0);
  const height = Number(markup.match(/<(?:media:)?height(?:\s[^>]*)?>(\d+)<\/(?:media:)?height>/i)?.[1]
    ?? markup.match(/\bheight=["'](\d+)["']/i)?.[1]
    ?? 0);
  return (width > 0 && width < 80) || (height > 0 && height < 80);
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

/** RSS/Atom enclosure, media:*, itunes:image, post-thumbnail, or first usable <img>. */
export function extractFeedCover(block: string, baseUrl?: string) {
  const enclosure = block.match(/<enclosure\b[^>]*>/i)?.[0];
  if (enclosure && looksLikeImageTag(enclosure)) {
    const url = firstUrl([attr(enclosure, "url")], baseUrl, { declaredImage: true });
    if (url) return url;
  }

  const mediaTags = block.match(/<media:(?:content|thumbnail)\b[^>]*\/?>/gi) ?? [];
  for (const tag of mediaTags) {
    const declared = looksLikeImageTag(tag);
    const url = firstUrl([attr(tag, "url"), attr(tag, "href")], baseUrl, { declaredImage: declared });
    if (url) return url;
  }

  const itunes = block.match(/<itunes:image\b[^>]*>/i)?.[0];
  if (itunes) {
    const url = firstUrl([attr(itunes, "href"), attr(itunes, "url")], baseUrl, { declaredImage: true });
    if (url) return url;
  }

  const nestedBlocks = block.matchAll(
    /<(post-thumbnail|featured[-_]?image|media:thumbnail|image)\b([^>]*)>([\s\S]*?)<\/\1>/gi,
  );
  for (const match of nestedBlocks) {
    const markup = `${match[2] ?? ""} ${match[3] ?? ""}`;
    if (skipTinyDimensions(markup)) continue;
    const url = firstUrl([nestedTagUrl(markup), attr(match[0], "url"), attr(match[0], "href")], baseUrl);
    if (url) return url;
  }

  const imgs = block.match(/<img\b[^>]*>/gi) ?? [];
  for (const tag of imgs) {
    if (skipTinyDimensions(tag)) continue;
    const url = firstUrl([attr(tag, "src"), attr(tag, "data-src")], baseUrl);
    if (url) return url;
  }
  return null;
}

export function extractHtmlCover(html: string, baseUrl: string) {
  const og = firstUrl([
    metaContent(html, "og:image"),
    metaContent(html, "og:image:url"),
    metaContent(html, "og:image:secure_url"),
    metaContent(html, "twitter:image"),
    metaContent(html, "twitter:image:src"),
  ], baseUrl, { declaredImage: true });
  if (og) return og;
  const linkImage = html.match(/<link\b[^>]*rel=["']image_src["'][^>]*>/i)?.[0];
  if (linkImage) {
    const url = firstUrl([attr(linkImage, "href")], baseUrl, { declaredImage: true });
    if (url) return url;
  }
  const imgs = html.match(/<img\b[^>]*>/gi) ?? [];
  for (const tag of imgs) {
    if (skipTinyDimensions(tag)) continue;
    const url = firstUrl([attr(tag, "src"), attr(tag, "data-src")], baseUrl);
    if (url) return url;
  }
  return null;
}

export async function resolveArticleCover(
  articleUrl: string,
  feedImage: string | null | undefined,
  fetcher: typeof fetch = fetch,
) {
  const fromFeed = feedImage ? canonicalizeCoverUrl(feedImage, articleUrl, { declaredImage: true }) : null;
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
