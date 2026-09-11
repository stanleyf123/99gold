import { env } from "cloudflare:workers";

export type NewsItem = { id?: number; title: string; date: string; url: string; image?: string };

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

const newsMarkets = {
  zh: { query: "(黃金 OR 美元 OR 聯準會) (site:cna.com.tw OR site:money.udn.com OR site:ctee.com.tw OR site:reuters.com OR site:bloomberg.com) when:1d", hl: "zh-TW", gl: "TW", ceid: "TW:zh-Hant" },
  en: { query: "(gold OR Federal Reserve OR dollar) (site:reuters.com OR site:apnews.com OR site:cnbc.com OR site:wsj.com OR site:bloomberg.com) when:1d", hl: "en-US", gl: "US", ceid: "US:en" },
  ja: { query: "(金価格 OR FRB OR ドル) (site:nhk.or.jp OR site:nikkei.com OR site:jiji.com OR site:reuters.com OR site:bloomberg.co.jp) when:1d", hl: "ja", gl: "JP", ceid: "JP:ja" },
} as const;

const simplifiedChinese = /[这国们为从个们后发经济市场货币银行证监会国务院新华社中新网人民网黄金价格联储数据时钟]/;

async function fetchLatestTen(locale: keyof typeof newsMarkets) {
  const market = newsMarkets[locale];
  const sourceResults = await Promise.allSettled([fetchRss(`https://news.google.com/rss/search?q=${encodeURIComponent(market.query)}&hl=${market.hl}&gl=${market.gl}&ceid=${market.ceid}`)]);
  const seen = new Set<string>();
  return sourceResults.flatMap((result) => result.status === "fulfilled" ? result.value : []).filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return Boolean(item.image) && !(locale === "zh" && simplifiedChinese.test(item.title));
  }).slice(0, 10);
}

async function initialize() {
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS daily_news (id INTEGER PRIMARY KEY AUTOINCREMENT, news_day TEXT NOT NULL, position INTEGER NOT NULL, title TEXT NOT NULL, url TEXT NOT NULL, article_date TEXT NOT NULL, image TEXT, fetched_at TEXT NOT NULL)"),
    env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS daily_news_day_position ON daily_news(news_day, position)"),
  ]);
}

export async function getDailyGoldNews(inputLocale = "zh") {
  await initialize();
  const locale = inputLocale === "en" || inputLocale === "ja" ? inputLocale : "zh";
  const newsDay = `${taipeiDay()}-${locale}`;
  const existing = await env.DB.prepare("SELECT id, title, url, article_date, image, fetched_at FROM daily_news WHERE news_day = ? ORDER BY position ASC LIMIT 10").bind(newsDay).all<{ id: number; title: string; url: string; article_date: string; image: string | null; fetched_at: string }>();
  const validExisting = existing.results.filter((item) => Boolean(item.image) && !(locale === "zh" && simplifiedChinese.test(item.title)));
  if (validExisting.length === 10) return { items: validExisting.map((item) => ({ id: item.id, title: item.title, url: item.url, date: item.article_date, image: item.image ?? undefined })), updatedAt: validExisting[0].fetched_at };
  if (existing.results.length) await env.DB.prepare("DELETE FROM daily_news WHERE news_day = ?").bind(newsDay).run();

  const items = await fetchLatestTen(locale);
  if (!items.length) return { items: [], updatedAt: "" };
  const fetchedAt = new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Taipei", hour12: false }).format(new Date());
  await env.DB.batch(items.map((item, position) => env.DB.prepare("INSERT INTO daily_news (news_day, position, title, url, article_date, image, fetched_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(newsDay, position + 1, item.title, item.url, item.date, item.image || null, fetchedAt)));
  const saved = await env.DB.prepare("SELECT id, title, url, article_date, image FROM daily_news WHERE news_day = ? ORDER BY position ASC LIMIT 10").bind(newsDay).all<{ id: number; title: string; url: string; article_date: string; image: string | null }>();
  return { items: saved.results.map((item) => ({ id: item.id, title: item.title, url: item.url, date: item.article_date, image: item.image ?? undefined })), updatedAt: fetchedAt };
}
