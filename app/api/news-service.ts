import { env } from "cloudflare:workers";

export type NewsItem = { title: string; date: string; url: string; image?: string };

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

function directArticleUrl(value: string) {
  try {
    const url = new URL(value);
    const target = url.hostname.includes("bing.com") ? url.searchParams.get("url") : null;
    return target && /^https?:\/\//i.test(target) ? target : value;
  } catch { return value; }
}

async function fetchRss(url: string): Promise<NewsItem[]> {
  const response = await fetch(url, { signal: AbortSignal.timeout(7000), headers: { "User-Agent": "GoldenTide/1.0" } });
  if (!response.ok) throw new Error(`RSS ${response.status}`);
  const xml = await response.text();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => ({
    title: tag(match[1], "title"),
    url: directArticleUrl(tag(match[1], "link")),
    date: dateLabel(tag(match[1], "pubDate")),
    image: rssImage(match[1]).replace(/^http:\/\//i, "https://"),
  })).filter((item) => item.title && item.url);
}

async function fetchGdelt(): Promise<NewsItem[]> {
  const query = encodeURIComponent('(gold OR "Federal Reserve" OR "dollar index") sourcelang:chinese');
  const response = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&maxrecords=20&sort=datedesc&format=json`, { signal: AbortSignal.timeout(7000), headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`GDELT ${response.status}`);
  const data = await response.json() as { articles?: Array<{ title?: string; url?: string; seendate?: string; socialimage?: string }> };
  return (data.articles ?? []).map((article) => ({ title: article.title?.trim() ?? "", url: article.url ?? "", date: dateLabel(article.seendate), image: article.socialimage?.replace(/^http:\/\//i, "https://") ?? "" })).filter((item) => item.title && item.url);
}

async function fetchLatestTen() {
  const sourceResults = await Promise.allSettled([
    fetchRss("https://www.bing.com/news/search?q=%E9%BB%83%E9%87%91%20OR%20%E7%BE%8E%E5%85%83%E6%8C%87%E6%95%B8%20OR%20%E8%81%AF%E6%BA%96%E6%9C%83&format=rss&setlang=zh-tw"),
    fetchGdelt(),
    fetchRss("https://news.google.com/rss/search?q=%E9%BB%83%E9%87%91%20OR%20%E7%BE%8E%E5%85%83%E6%8C%87%E6%95%B8%20OR%20%E8%81%AF%E6%BA%96%E6%9C%83%20when%3A1d&hl=zh-TW&gl=TW&ceid=TW%3Azh-Hant"),
  ]);
  const seen = new Set<string>();
  return sourceResults.flatMap((result) => result.status === "fulfilled" ? result.value : []).filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  }).slice(0, 10);
}

async function initialize() {
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS daily_news (id INTEGER PRIMARY KEY AUTOINCREMENT, news_day TEXT NOT NULL, position INTEGER NOT NULL, title TEXT NOT NULL, url TEXT NOT NULL, article_date TEXT NOT NULL, image TEXT, fetched_at TEXT NOT NULL)"),
    env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS daily_news_day_position ON daily_news(news_day, position)"),
  ]);
}

export async function getDailyGoldNews() {
  await initialize();
  const newsDay = taipeiDay();
  const existing = await env.DB.prepare("SELECT title, url, article_date, image, fetched_at FROM daily_news WHERE news_day = ? ORDER BY position ASC LIMIT 10").bind(newsDay).all<{ title: string; url: string; article_date: string; image: string | null; fetched_at: string }>();
  if (existing.results.length) return { items: existing.results.map((item) => ({ title: item.title, url: item.url, date: item.article_date, image: item.image ?? undefined })), updatedAt: existing.results[0].fetched_at };

  const items = await fetchLatestTen();
  if (!items.length) return { items: [], updatedAt: "" };
  const fetchedAt = new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Taipei", hour12: false }).format(new Date());
  await env.DB.batch(items.map((item, position) => env.DB.prepare("INSERT INTO daily_news (news_day, position, title, url, article_date, image, fetched_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(newsDay, position + 1, item.title, item.url, item.date, item.image || null, fetchedAt)));
  return { items, updatedAt: fetchedAt };
}
