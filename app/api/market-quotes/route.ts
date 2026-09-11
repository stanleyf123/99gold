import { NextResponse } from "next/server";

type CoinGeckoResponse = { "pax-gold"?: { usd?: number; usd_24h_change?: number } };
type ExchangeResponse = { rates?: Record<string, number> };

function taipeiTimestamp() {
  return new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Taipei" }).format(new Date()).replace(/\//g, ".");
}

export async function GET() {
  try {
    const [goldResponse, fxResponse] = await Promise.all([
      fetch("https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=usd&include_24hr_change=true", { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) }),
      fetch("https://open.er-api.com/v6/latest/USD", { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) }),
    ]);
    if (!goldResponse.ok || !fxResponse.ok) throw new Error("quote source unavailable");
    const gold = await goldResponse.json() as CoinGeckoResponse;
    const fx = await fxResponse.json() as ExchangeResponse;
    const goldUsd = gold["pax-gold"]?.usd;
    const usdTwd = fx.rates?.TWD;
    if (!goldUsd || !usdTwd) throw new Error("quote data missing");
    const goldChange = gold["pax-gold"]?.usd_24h_change ?? 0;
    const twdPerQian = goldUsd * usdTwd * 3.75 / 31.1034768;
    return NextResponse.json({
      items: [
        { label: "國際黃金參考", code: "PAXG / USD", price: goldUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), unit: "美元／金衡盎司", change: `${goldChange >= 0 ? "+" : ""}${goldChange.toFixed(2)}%`, up: goldChange >= 0 },
        { label: "台灣理論金價", code: "依國際金價換算", price: Math.round(twdPerQian).toLocaleString("en-US"), unit: "台幣／錢", change: "即時換算", up: goldChange >= 0 },
        { label: "黃金每公克", code: "國際金價換算", price: Math.round(goldUsd * usdTwd / 31.1034768).toLocaleString("en-US"), unit: "新台幣／公克", change: "即時換算", up: goldChange >= 0 },
        { label: "美元匯率", code: "USD / TWD", price: usdTwd.toFixed(4), unit: "新台幣", change: "市場參考", up: true },
      ],
      updatedAt: taipeiTimestamp(),
      source: "PAXG 與公開匯率資料",
    }, { headers: { "Cache-Control": "public, max-age=600, s-maxage=600" } });
  } catch {
    return NextResponse.json({ items: [], updatedAt: "報價來源暫時無法連線" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
