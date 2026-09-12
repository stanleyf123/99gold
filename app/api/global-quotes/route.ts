import { NextResponse } from "next/server";

type FxResponse = { rates?: Record<string, number> };
type YahooResponse = { chart?: { result?: Array<{ meta?: { regularMarketPrice?: number; previousClose?: number; regularMarketTime?: number } }> } };

const instruments = [
  ["gold", "GC=F", "黃金", "Gold"],
  ["silver", "SI=F", "白銀", "Silver"],
  ["platinum", "PL=F", "鉑金", "Platinum"],
  ["palladium", "PA=F", "鈀金", "Palladium"],
] as const;

export async function GET() {
  try {
    const [fxResult, ...metalResults] = await Promise.all([
      fetch("https://open.er-api.com/v6/latest/USD", { headers: { Accept: "application/json" } }),
      ...instruments.map(([, symbol]) => fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=5m&range=1d`, { headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" } })),
    ]);
    const fx = await fxResult.json() as FxResponse;
    const currencies = ["USD", "TWD", "HKD", "CNY", "JPY", "EUR"].reduce<Record<string, number>>((all, code) => ({ ...all, [code]: code === "USD" ? 1 : fx.rates?.[code] ?? Number.NaN }), {});
    const metals = await Promise.all(metalResults.map(async (response, index) => {
      const data = response.ok ? await response.json() as YahooResponse : undefined;
      const meta = data?.chart?.result?.[0]?.meta;
      const price = meta?.regularMarketPrice;
      if (!price || !Number.isFinite(price) || !meta?.regularMarketTime) throw new Error("Quote missing");
      const previous = meta?.previousClose ?? price;
      return { quotedAt: new Date(meta.regularMarketTime * 1000).toISOString(), id: instruments[index][0], symbol: instruments[index][1], name: instruments[index][2] + "期貨", englishName: instruments[index][3], price, changePercent: previous ? ((price - previous) / previous) * 100 : 0 };
    }));
    return NextResponse.json({ metals, currencies, updatedAt: metals[0].quotedAt, source: "Yahoo Finance futures; exchange-rate conversions are not retail prices", retrievedAt: new Date().toISOString() }, { headers: { "Cache-Control": "public, max-age=180, s-maxage=180" } });
  } catch {
    return NextResponse.json({ error: "global quotes unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
