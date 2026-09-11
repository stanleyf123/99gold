import { NextResponse } from "next/server";

type FxResponse = { rates?: Record<string, number> };
type YahooResponse = { chart?: { result?: Array<{ meta?: { regularMarketPrice?: number; previousClose?: number } }> } };

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
    const currencies = ["USD", "TWD", "HKD", "CNY", "JPY", "EUR"].reduce<Record<string, number>>((all, code) => ({ ...all, [code]: code === "USD" ? 1 : fx.rates?.[code] ?? 1 }), {});
    const metals = await Promise.all(metalResults.map(async (response, index) => {
      const data = response.ok ? await response.json() as YahooResponse : undefined;
      const meta = data?.chart?.result?.[0]?.meta;
      const price = meta?.regularMarketPrice ?? [4408.8, 54.31, 1856, 1347][index];
      const previous = meta?.previousClose ?? price;
      return { id: instruments[index][0], symbol: instruments[index][1], name: instruments[index][2], englishName: instruments[index][3], price, changePercent: previous ? ((price - previous) / previous) * 100 : 0 };
    }));
    return NextResponse.json({ metals, currencies, updatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "public, max-age=180, s-maxage=180" } });
  } catch {
    return NextResponse.json({ error: "global quotes unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
