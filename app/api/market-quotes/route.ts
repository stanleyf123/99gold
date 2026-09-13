import { NextResponse } from "next/server";
import { GET as getGlobalQuotes } from "../global-quotes/route";

type GoldQuote = {
  id: string;
  price: number;
  changePercent: number;
  quotedAt: string;
};

export async function GET() {
  try {
    const response = await getGlobalQuotes();
    if (!response.ok) throw new Error("Source unavailable");
    const data = await response.json() as {
      metals?: GoldQuote[];
      currencies?: Record<string, number>;
    };
    const gold = data.metals?.find((metal) => metal.id === "gold");
    const usdTwd = data.currencies?.TWD;
    if (!gold || !Number.isFinite(gold.price) || !gold.quotedAt) throw new Error("Gold unavailable");
    if (!Number.isFinite(usdTwd) || !usdTwd || usdTwd <= 0) throw new Error("FX unavailable");

    const twdPerGram = gold.price * usdTwd / 31.1034768;
    const twdPerQian = twdPerGram * 3.75;
    const direction = gold.changePercent >= 0 ? "+" : "−";
    const changeLabel = `${direction}${Math.abs(gold.changePercent).toFixed(2)}%`;
    const up = gold.changePercent >= 0;

    return NextResponse.json({
      items: [
        { label: "COMEX 黃金期貨參考", code: "GC=F · Yahoo Finance", price: gold.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), unit: "美元／金衡盎司", change: `${changeLabel} · 期貨參考`, up },
        { label: "台灣理論金價", code: "GC=F × USD/TWD", price: Math.round(twdPerQian).toLocaleString("en-US"), unit: "新台幣／錢", change: "參考換算", up },
        { label: "黃金每公克", code: "GC=F × USD/TWD", price: Math.round(twdPerGram).toLocaleString("en-US"), unit: "新台幣／公克", change: "參考換算", up },
        { label: "美元參考匯率", code: "USD / TWD · ExchangeRate-API", price: usdTwd.toFixed(4), unit: "新台幣", change: "非銀行即期牌告", up: false },
      ],
      updatedAt: new Date(gold.quotedAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }),
      source: "Yahoo Finance GC futures; ExchangeRate-API",
    }, { headers: { "Cache-Control": "public, max-age=180, s-maxage=180" } });
  } catch {
    return NextResponse.json(
      { items: [], updatedAt: "資料暫不可用" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
