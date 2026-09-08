import { NextResponse } from "next/server";

const feedUrl = "https://news.google.com/rss/search?q=%E9%BB%83%E9%87%91%20when%3A1d&hl=zh-TW&gl=TW&ceid=TW:zh-Hant";

function textFrom(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match?.[1]?.replace(/^<!\[CDATA\[|\]\]>$/g, "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim() ?? "";
}

export async function GET() {
  try {
    // Add a timestamp so the upstream CDN is asked for a fresh feed on every
    // request.  The page itself polls this endpoint, so cached responses make
    // the "latest news" panel look frozen.
    const response = await fetch(`${feedUrl}&_=${Date.now()}`, {
      cache: "no-store",
      headers: { "User-Agent": "GoldenTideNews/1.0" },
    });
    if (!response.ok) throw new Error("News feed unavailable");
    const xml = await response.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 3).map((match) => {
      const item = match[1];
      const date = new Date(textFrom(item, "pubDate"));
      return { title: textFrom(item, "title"), url: textFrom(item, "link"), date: Number.isNaN(date.getTime()) ? "今日" : new Intl.DateTimeFormat("zh-TW", { month: "numeric", day: "numeric" }).format(date) };
    }).filter((item) => item.title && item.url);
    return NextResponse.json(
      {
        items,
        updatedAt: `新聞更新：${new Intl.DateTimeFormat("zh-TW", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZone: "Asia/Taipei",
        }).format(new Date())}`,
      },
      { headers: { "Cache-Control": "no-store, max-age=0", "CDN-Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ items: [], updatedAt: "新聞來源暫時無法連線" }, { status: 503 });
  }
}
