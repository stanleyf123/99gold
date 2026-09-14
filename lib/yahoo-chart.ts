export type ChartClose = { timestamp: number; close: number };

export type YahooChartResult = {
  points: ChartClose[];
  currency: string | null;
  exchangeName: string | null;
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: { currency?: string; exchangeName?: string };
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }>;
  };
};

const chartFetchInit = { next: { revalidate: 900 } } as const;

export async function fetchYahooChartCloses(
  symbol: string,
  range: string,
  interval: string,
): Promise<YahooChartResult | null> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`,
      { headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" }, ...chartFetchInit },
    );
    if (!response.ok) return null;
    const data = await response.json() as YahooChartResponse;
    const result = data.chart?.result?.[0];
    const timestamps = result?.timestamp ?? [];
    const closes = result?.indicators?.quote?.[0]?.close ?? [];
    const points = timestamps
      .map((timestamp, index) => ({ timestamp, close: closes[index] }))
      .filter((point): point is ChartClose => typeof point.close === "number" && Number.isFinite(point.close) && point.close > 0);
    if (!points.length) return null;
    return {
      points,
      currency: result?.meta?.currency ?? null,
      exchangeName: result?.meta?.exchangeName ?? null,
    };
  } catch {
    return null;
  }
}
