import { env } from "cloudflare:workers";

export type NewsItem = {
  id?: number;
  title: string;
  originalTitle?: string;
  summary?: string;
  date: string;
  url: string;
  image?: string;
  sourceName?: string;
  sourceUrl?: string;
  sourceLanguage?: string;
  translated?: boolean;
};

function dateLabel(value?: string) {
  if (!value) return "今日";
  const normalized = /^\d{8}T\d{6}Z$/.test(value)
    ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}Z`
    : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? "今日" : new Intl.DateTimeFormat("zh-TW", { month: "numeric", day: "numeric", timeZone: "Asia/Taipei" }).format(date);
}

function taipeiDay() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function crawlWindow() {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Taipei", hour: "2-digit", hour12: false }).format(new Date()));
  return `${taipeiDay()}-${Math.floor(hour / 3)}`;
}

function decode(value: string) {
  return value.replace(/^<!\[CDATA\[|\]\]>$/g, "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#x2F;/g, "/").trim();
}

function tag(xml: string, name: string) {
  return decode(xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"))?.[1] ?? "");
}

function rssImage(xml: string) {
  const media = xml.match(/<(?:media:content|media:thumbnail|enclosure)[^>]+url=["']([^"']+)["']/i)?.[1];
  if (media) return decode(media);
  const description = xml.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] ?? "";
  return decode(description.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? "");
}

function rssSummary(xml: string) {
  const description = xml.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] ?? "";
  return decode(description).replace(/\s+-\s+[^-]{2,60}$/i, "").trim();
}

function usefulSummary(value?: string) {
  if (!value) return "";
  if (/comprehensive up-to-date news coverage|aggregated from sources all over the world/i.test(value)) return "";
  return value;
}

function directArticleUrl(value: string) {
  try {
    const url = new URL(value);
    const target = url.hostname.includes("bing.com") ? url.searchParams.get("url") : null;
    return target && /^https?:\/\//i.test(target) ? target : value;
  } catch { return value; }
}

function publisherLabel(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "").split(".")[0].replace(/^./, (letter) => letter.toUpperCase());
  } catch { return "International News"; }
}

async function articleMetadata(url: string) {
  try {
    const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; 99gold.net news crawler/1.0)" }, redirect: "follow", signal: AbortSignal.timeout(3500) });
    if (!response.ok) return { image: "", summary: "" };
    const html = await response.text();
    const description = html.match(/<meta[^>]+(?:property|name)=["'](?:og:description|description|twitter:description)["'][^>]+content=["']([^"']+)["']/i)
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:description|description|twitter:description)["']/i);
    const articlePhotos = [...html.matchAll(/<(?:img|source)[^>]+src=["']([^"']+)["']/gi)]
      .map((match) => match[1])
      .filter((image) => /(?:webphotos|upload|media|image|photo)/i.test(image) && !/(?:pic_fb|logo|icon|ad-)/i.test(image));
    const articlePhoto = articlePhotos.reverse().find((image) => /(?:WebCover|webphotos)/i.test(image)) ?? articlePhotos[0];
    const paragraphs = [...html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, "").matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((match) => decode(match[1]))
      .filter((text) => text.length >= 60)
      .slice(0, 2)
      .join(" ")
      .slice(0, 900);
    const articleSummary = decode(description?.[1] ?? "") || paragraphs;
    if (articlePhoto) return { image: articlePhoto.replace(/&amp;/g, "&").replace(/^http:\/\//i, "https://"), summary: articleSummary };
    const match = html.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/i)
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i);
    return { image: match?.[1]?.replace(/&amp;/g, "&").replace(/^http:\/\//i, "https://") ?? "", summary: articleSummary };
  } catch { return { image: "", summary: "" }; }
}

async function fetchRss(url: string): Promise<NewsItem[]> {
  const response = await fetch(url, { headers: { "User-Agent": "99gold.net market-news" } });
  if (!response.ok) throw new Error(`RSS ${response.status}`);
  const xml = await response.text();
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => {
    const url = directArticleUrl(tag(match[1], "link"));
    const sourceUrl = match[1].match(/<source[^>]+url=["']([^"']+)["']/i)?.[1] ?? url;
    const sourceName = tag(match[1], "source") || publisherLabel(sourceUrl);
    const rawTitle = tag(match[1], "title");
    const title = rawTitle.replace(new RegExp(`\\s+-\\s+${sourceName.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}$`, "i"), "").trim();
    return {
      title,
      originalTitle: title,
      url,
      date: dateLabel(tag(match[1], "pubDate")),
      image: rssImage(match[1]).replace(/^http:\/\//i, "https://"),
      summary: rssSummary(match[1]),
      sourceName,
      sourceUrl,
      sourceLanguage: "en",
    };
  }).filter((item) => item.title && item.url);
  return items;
}

const crawlerFeed = {
  query: "(gold price OR Federal Reserve OR US dollar OR precious metals) (site:reuters.com OR site:apnews.com OR site:cnbc.com OR site:wsj.com OR site:bloomberg.com) when:2d",
  hl: "en-US",
  gl: "US",
  ceid: "US:en",
} as const;

const simplifiedChinese = /[这国们为从个们后发经济市场货币银行证监会国务院新华社中新网人民网黄金价格联储数据时钟]/;
const allowedSourceHosts = ["reuters.com", "apnews.com", "cnbc.com", "wsj.com", "bloomberg.com"] as const;

function isAllowedSource(url: string | undefined) {
  try {
    const host = new URL(url || "").hostname.replace(/^www\./, "");
    return allowedSourceHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch { return false; }
}

async function translateText(value: string, locale: "zh" | "en" | "ja") {
  if (!value || locale === "en") return value;
  const target = locale === "zh" ? "zh-TW" : "ja";
  try {
    const endpoint = new URL("https://translate.googleapis.com/translate_a/single");
    endpoint.search = new URLSearchParams({ client: "gtx", sl: "en", tl: target, dt: "t", q: value.slice(0, 1200) }).toString();
    const response = await fetch(endpoint, { headers: { "User-Agent": "99gold.net translation service" }, signal: AbortSignal.timeout(3500) });
    if (!response.ok) return value;
    const data = await response.json() as Array<Array<Array<string>>>;
    return data?.[0]?.map((part) => part?.[0] ?? "").join("").trim() || value;
  } catch { return value; }
}

async function localizeItem(item: NewsItem, locale: "zh" | "en" | "ja") {
  const originalTitle = item.originalTitle || item.title;
  const rawSummary = usefulSummary(item.summary && item.summary !== originalTitle ? item.summary : "");
  const [title, summary] = await Promise.all([translateText(originalTitle, locale), translateText(rawSummary, locale)]);
  return { ...item, originalTitle, title, summary, translated: locale !== "en" && title !== originalTitle };
}

async function fetchLatestTen(locale: "zh" | "en" | "ja") {
  const market = crawlerFeed;
  const sourceResults = await Promise.allSettled([
    fetchRss(`https://www.bing.com/news/search?q=${encodeURIComponent("gold price Federal Reserve US dollar Reuters CNBC Bloomberg AP")}&format=rss&mkt=en-US`),
    fetchRss(`https://news.google.com/rss/search?q=${encodeURIComponent(market.query)}&hl=${market.hl}&gl=${market.gl}&ceid=${market.ceid}`),
  ]);
  const seen = new Set<string>();
  const selected = sourceResults.flatMap((result) => result.status === "fulfilled" ? result.value : []).filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return isAllowedSource(item.sourceUrl);
  }).slice(0, 6);
  const enriched = await Promise.all(selected.map(async (item) => {
    const metadata = await articleMetadata(item.url);
    const rssSummary = item.summary && item.summary !== item.title ? item.summary : "";
    return { ...item, image: item.image || metadata.image, summary: usefulSummary(metadata.summary) || usefulSummary(rssSummary) };
  }));
  return Promise.all(enriched.map((item) => localizeItem(item, locale)));
}

export async function getDailyGoldNews(inputLocale = "zh") {
  const locale = inputLocale === "en" || inputLocale === "ja" ? inputLocale : "zh";
  type NewsRow = { id: number; title: string; original_title: string | null; summary: string | null; url: string; source_name: string | null; source_url: string | null; source_language: string | null; article_date: string; image: string | null; fetched_at: string };
  const newsDay = `${crawlWindow()}-${locale}-translated-v3`;
  const existing = await env.DB.prepare("SELECT id, title, original_title, summary, url, source_name, source_url, source_language, article_date, image, fetched_at FROM daily_news WHERE news_day = ? ORDER BY position ASC LIMIT 10").bind(newsDay).all<NewsRow>();
  const existingRows = existing.results as NewsRow[];
  const validExisting = existingRows.filter((item) => !(locale === "zh" && simplifiedChinese.test(item.title)));
  if (validExisting.length >= 3) return { items: validExisting.map((item) => ({ id: item.id, title: item.title, originalTitle: item.original_title ?? undefined, summary: item.summary ?? undefined, url: item.url, sourceName: item.source_name ?? undefined, sourceUrl: item.source_url ?? undefined, sourceLanguage: item.source_language ?? undefined, date: item.article_date, image: item.image ?? undefined, translated: locale !== "en" && item.original_title !== item.title })), updatedAt: validExisting[0].fetched_at };
  if (existingRows.length) await env.DB.prepare("DELETE FROM daily_news WHERE news_day = ?").bind(newsDay).run();

  const items = await fetchLatestTen(locale);
  let localizedItems = items;
  if (!localizedItems.length && locale !== "en") {
    const fallback = await env.DB.prepare("SELECT id, title, original_title, summary, url, source_name, source_url, source_language, article_date, image, fetched_at FROM daily_news WHERE source_language = 'en' AND original_title IS NOT NULL ORDER BY id DESC LIMIT 6").all<NewsRow>();
    localizedItems = await Promise.all((fallback.results as NewsRow[]).reverse().map((item) => localizeItem({ title: item.original_title || item.title, originalTitle: item.original_title || item.title, summary: usefulSummary(item.summary ?? ""), url: item.url, sourceName: item.source_name ?? undefined, sourceUrl: item.source_url ?? undefined, sourceLanguage: "en", date: item.article_date, image: item.image ?? undefined }, locale)));
  }
  if (!localizedItems.length) return { items: [], updatedAt: "" };
  const fetchedAt = new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Taipei", hour12: false }).format(new Date());
  await env.DB.batch(localizedItems.map((item, position) => env.DB.prepare("INSERT OR REPLACE INTO daily_news (news_day, position, title, original_title, summary, url, source_name, source_url, source_language, article_date, image, fetched_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(newsDay, position + 1, item.title, item.originalTitle || item.title, item.summary || null, item.url, item.sourceName || null, item.sourceUrl || null, item.sourceLanguage || "en", item.date, item.image || null, fetchedAt)));
  const saved = await env.DB.prepare("SELECT id, title, original_title, summary, url, source_name, source_url, source_language, article_date, image, fetched_at FROM daily_news WHERE news_day = ? ORDER BY position ASC LIMIT 10").bind(newsDay).all<NewsRow>();
  return { items: (saved.results as NewsRow[]).map((item) => ({ id: item.id, title: item.title, originalTitle: item.original_title ?? undefined, summary: item.summary ?? undefined, url: item.url, sourceName: item.source_name ?? undefined, sourceUrl: item.source_url ?? undefined, sourceLanguage: item.source_language ?? undefined, date: item.article_date, image: item.image ?? undefined, translated: locale !== "en" && item.original_title !== item.title })), updatedAt: fetchedAt };
}
