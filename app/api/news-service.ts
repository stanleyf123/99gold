export type NewsItem = { title: string; date: string; url: string; image?: string };

const liveSearchItems: NewsItem[] = [
  { title: "查看最新黃金市場消息", date: "即時", url: "https://news.google.com/search?q=%E9%BB%83%E9%87%91&hl=zh-TW&gl=TW&ceid=TW%3Azh-Hant" },
  { title: "查看美元指數最新消息", date: "即時", url: "https://news.google.com/search?q=%E7%BE%8E%E5%85%83%E6%8C%87%E6%95%B8&hl=zh-TW&gl=TW&ceid=TW%3Azh-Hant" },
  { title: "查看聯準會利率決策消息", date: "即時", url: "https://news.google.com/search?q=%E8%81%AF%E6%BA%96%E6%9C%83%20%E5%88%A9%E7%8E%87&hl=zh-TW&gl=TW&ceid=TW%3Azh-Hant" },
];

function dateLabel(value?: string) {
  if (!value) return "今日";
  const normalized = /^\d{8}T\d{6}Z$/.test(value)
    ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}Z`
    : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? "今日" : new Intl.DateTimeFormat("zh-TW", { month: "numeric", day: "numeric", timeZone: "Asia/Taipei" }).format(date);
}

async function fetchGdelt(): Promise<NewsItem[]> {
  const query = encodeURIComponent('(gold OR "Federal Reserve" OR "dollar index") sourcelang:chinese');
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&maxrecords=12&sort=datedesc&format=json`;
  const response = await fetch(url, { signal: AbortSignal.timeout(7000), headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`GDELT ${response.status}`);
  const data = await response.json() as { articles?: Array<{ title?: string; url?: string; seendate?: string; socialimage?: string }> };
  return (data.articles ?? []).map((article) => ({
    title: article.title?.trim() ?? "",
    url: article.url ?? "",
    date: dateLabel(article.seendate),
    image: article.socialimage ?? "",
  })).filter((item) => item.title && item.url).slice(0, 3);
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
  const newsImage = tag(xml, "News:Image") || tag(xml, "image");
  if (/^https?:\/\//i.test(newsImage)) return newsImage;
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

function secureImage(value?: string) {
  return value?.replace(/^http:\/\//i, "https://") ?? "";
}

async function articleImage(item: NewsItem): Promise<NewsItem> {
  if (item.image || !/^https?:\/\//i.test(item.url)) return { ...item, image: secureImage(item.image) };
  try {
    const response = await fetch(item.url, { redirect: "follow", signal: AbortSignal.timeout(2500), headers: { "User-Agent": "Mozilla/5.0 (compatible; GoldenTide/1.0)" } });
    if (!response.ok) return item;
    const html = await response.text();
    const image = html.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/i)?.[1]
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i)?.[1];
    return image ? { ...item, image: secureImage(new URL(decode(image), response.url).href) } : item;
  } catch { return item; }
}

async function fetchRss(url: string): Promise<NewsItem[]> {
  const response = await fetch(url, { signal: AbortSignal.timeout(4000), headers: { "User-Agent": "GoldenTide/1.0" } });
  if (!response.ok) throw new Error(`RSS ${response.status}`);
  const xml = await response.text();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => ({
    title: tag(match[1], "title"),
    url: directArticleUrl(tag(match[1], "link")),
    date: dateLabel(tag(match[1], "pubDate")),
    image: rssImage(match[1]),
  })).filter((item) => item.title && item.url).slice(0, 3);
}

export async function getGoldNews() {
  const sources = [
    fetchRss("https://www.gold.org/rss.xml"),
    fetchRss("https://www.bing.com/news/search?q=%E9%BB%83%E9%87%91%20OR%20%E7%BE%8E%E5%85%83%E6%8C%87%E6%95%B8%20OR%20%E8%81%AF%E6%BA%96%E6%9C%83&format=rss&setlang=zh-tw"),
    fetchGdelt(),
    fetchRss("https://www.kitco.com/rss/KitcoNews.xml"),
    fetchRss("https://news.google.com/rss/search?q=%E9%BB%83%E9%87%91%20OR%20%E7%BE%8E%E5%85%83%E6%8C%87%E6%95%B8%20OR%20%E8%81%AF%E6%BA%96%E6%9C%83%20when%3A1d&hl=zh-TW&gl=TW&ceid=TW%3Azh-Hant"),
  ];
  const settled = await Promise.allSettled(sources);
  const candidates = [...new Map(settled.flatMap((result) => result.status === "fulfilled" ? result.value : []).map((item) => [item.url, item])).values()];
  const enriched = await Promise.all(candidates.slice(0, 9).map(articleImage));
  const withImages = enriched.filter((item) => item.image);
  const selected = [...withImages, ...enriched.filter((item) => !item.image)].slice(0, 3);
  return { items: selected.length ? selected : liveSearchItems, isFallback: selected.length === 0 };
}

export function updatedAt(isFallback: boolean) {
  const time = new Intl.DateTimeFormat("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Taipei" }).format(new Date());
  return isFallback ? `即時新聞入口 · ${time} 更新` : `新聞更新：${time}`;
}
