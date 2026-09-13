import { NextResponse } from "next/server";
import { GET as getGlobalQuotes } from "../global-quotes/route";

type GoldQuote = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  changePercent: number | null;
  quotedAt: string;
  basis: "futures" | "spot";
  source: string;
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
    const changeAvailable = Number.isFinite(gold.changePercent);
    const numericChange = changeAvailable ? gold.changePercent as number : 0;
    const direction = numericChange >= 0 ? "+" : "−";
    const changeLabel = changeAvailable ? `${direction}${Math.abs(numericChange).toFixed(2)}%` : "有效參考價";
    const up = changeAvailable && numericChange >= 0;
    const referenceLabel = gold.basis === "futures" ? "COMEX 黃金期貨參考" : "國際黃金現貨參考";
    const referenceCode = `${gold.symbol} · ${gold.basis === "futures" ? "Yahoo Finance" : "Gold API"}`;
    const conversionCode = `${gold.symbol} × USD/TWD`;

    return NextResponse.json({
      items: [
        { label: referenceLabel, code: referenceCode, price: gold.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), unit: "美元／金衡盎司", change: `${changeLabel} · ${gold.basis === "futures" ? "期貨參考" : "現貨參考"}`, up },
        { label: "台灣理論金價", code: conversionCode, price: Math.round(twdPerQian).toLocaleString("en-US"), unit: "新台幣／錢", change: "參考換算", up },
        { label: "黃金每公克", code: conversionCode, price: Math.round(twdPerGram).toLocaleString("en-US"), unit: "新台幣／公克", change: "參考換算", up },
        { label: "美元參考匯率", code: "USD / TWD · ExchangeRate-API", price: usdTwd.toFixed(4), unit: "新台幣", change: "非銀行即期牌告", up: false },
      ],
      updatedAt: new Date(gold.quotedAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }),
      source: `${gold.source}; ExchangeRate-API`,
    }, { headers: { "Cache-Control": "public, max-age=180, s-maxage=180" } });
  } catch {
    return NextResponse.json(
      { items: [], updatedAt: "資料暫不可用" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
