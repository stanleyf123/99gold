import { NextResponse } from "next/server";

type CoinbaseResponse = { data?: { amount?: string } };
type ExchangeResponse = { rates?: Record<string, number> };

function taipeiTimestamp() {
  return new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Taipei" }).format(new Date()).replace(/\//g, ".");
}

export async function GET() {
  try {
    const [goldResult, fxResult] = await Promise.allSettled([
      fetch("https://api.coinbase.com/v2/prices/PAXG-USD/spot", { headers: { Accept: "application/json" } }),
      fetch("https://open.er-api.com/v6/latest/USD", { headers: { Accept: "application/json" } }),
    ]);
    if (goldResult.status !== "fulfilled" || !goldResult.value.ok) throw new Error("gold quote unavailable");
    const goldResponse = goldResult.value;
    const fxResponse = fxResult.status === "fulfilled" && fxResult.value.ok ? fxResult.value : null;
    const gold = await goldResponse.json() as CoinbaseResponse;
    const fx = fxResponse ? await fxResponse.json() as ExchangeResponse : undefined;
    const goldUsd = Number(gold.data?.amount);
    const usdTwd = fx?.rates?.TWD ?? 31.7;
    if (!goldUsd) throw new Error("gold quote data missing");
    const goldChange = 0;
    const twdPerQian = goldUsd * usdTwd * 3.75 / 31.1034768;
    return NextResponse.json({
      items: [
        { label: "國際黃金參考", code: "PAXG / USD", price: goldUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), unit: "美元／金衡盎司", change: "即時報價", up: true },
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
