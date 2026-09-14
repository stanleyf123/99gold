/**
 * Historical USD/TWD pairing for Taiwan theoretical gold.
 *
 * Prefer Bank of Taiwan USD sight-sell (本行即期賣出) for the same Taipei
 * calendar day, else the nearest prior BOT trading day. Yahoo TWD=X and
 * FRED DEXTAUS are documented public fallbacks when BOT history is missing
 * — never interpolate or invent a rate.
 */

export const BOT_HISTORY_CSV_BASE = "https://rate.bot.com.tw/xrt/flcsv/0";
export const BOT_HISTORY_HTML_BASE = "https://rate.bot.com.tw/xrt/quote";
export const YAHOO_TWD_SYMBOL = "TWD=X";
export const FRED_DEXTAUS_CSV_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DEXTAUS";
export const MAX_FX_LOOKBACK_DAYS = 10;
export const BOT_QUOTE_USER_AGENT = "99gold.net quote-monitor/1.0 (+https://99gold.net)";

export type HistoricalFxSource = "bot-sight-sell" | "yahoo-twd" | "fred-dextaus";

export type DailyFxRate = {
  date: string;
  usdTwd: number;
  source: HistoricalFxSource;
};

export type HistoricalFxSeries = {
  rates: DailyFxRate[];
  basis: "bot-sight-sell" | "mixed" | "market-reference";
  sources: HistoricalFxSource[];
  fromDate: string;
  toDate: string;
  retrievedAt: string;
};

const FX_FETCH_INIT = {
  redirect: "follow" as const,
  headers: {
    Accept: "text/csv,text/html,application/json;q=0.9,*/*;q=0.8",
    "User-Agent": BOT_QUOTE_USER_AGENT,
  },
};

export function taipeiCalendarDate(timestampSec: number): string {
  if (!Number.isFinite(timestampSec)) return "";
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestampSec * 1000));
  return /^\d{4}-\d{2}-\d{2}$/.test(formatted) ? formatted : "";
}

export function calendarDateFromYyyymmdd(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (!/^\d{8}$/.test(digits)) return null;
  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  if (year < 1990 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

export function calendarDaysBetween(earlier: string, later: string): number {
  const start = Date.parse(`${earlier}T00:00:00Z`);
  const end = Date.parse(`${later}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return Number.POSITIVE_INFINITY;
  return Math.round((end - start) / 86_400_000);
}

export function isPlausibleUsdTwd(value: number): boolean {
  return Number.isFinite(value) && value >= 20 && value <= 50;
}

export function monthsInclusive(fromDate: string, toDate: string): string[] {
  const from = fromDate.match(/^(\d{4})-(\d{2})/);
  const to = toDate.match(/^(\d{4})-(\d{2})/);
  if (!from || !to) return [];
  let year = Number(from[1]);
  let month = Number(from[2]);
  const endYear = Number(to[1]);
  const endMonth = Number(to[2]);
  const months: string[] = [];
  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    if (months.length > 72) break;
  }
  return months;
}

export function parseBotHistoryCsv(text: string, source: HistoricalFxSource = "bot-sight-sell"): DailyFxRate[] {
  if (!text || text.length > 2_000_000) return [];
  if (text.includes("找不到任何一筆")) return [];
  const rates: DailyFxRate[] = [];
  const seen = new Set<string>();
  for (const rawLine of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const cols = rawLine.split(",").map((cell) => cell.trim());
    if (cols.length < 8) continue;
    const date = calendarDateFromYyyymmdd(cols[0]);
    if (!date || seen.has(date)) continue;
    if (!/USD/i.test(cols[1] ?? "") && cols[0] === "資料日期") continue;
    if (cols[0] === "資料日期" || /幣別/.test(cols[0])) continue;
    const sellIdx = cols.findIndex((cell) => cell.includes("本行賣出"));
    if (sellIdx < 0 || sellIdx + 2 >= cols.length) continue;
    const spotSell = Number(cols[sellIdx + 2].replace(/,/g, ""));
    if (!isPlausibleUsdTwd(spotSell)) continue;
    seen.add(date);
    rates.push({ date, usdTwd: spotSell, source });
  }
  return rates.sort((left, right) => left.date.localeCompare(right.date));
}

export function parseBotHistoryHtml(html: string, source: HistoricalFxSource = "bot-sight-sell"): DailyFxRate[] {
  if (!html || html.length > 2_000_000) return [];
  const rates: DailyFxRate[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)) {
    const cells = [...match[0].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)]
      .map((cell) => cell[1].replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/\s+/g, " ").trim());
    const dateCell = cells.find((cell) => /^\d{4}\/\d{2}\/\d{2}$/.test(cell));
    if (!dateCell) continue;
    const date = calendarDateFromYyyymmdd(dateCell);
    if (!date || seen.has(date)) continue;
    const nums = cells
      .map((cell) => Number(cell.replace(/,/g, "")))
      .filter((value) => isPlausibleUsdTwd(value));
    if (nums.length < 4) continue;
    const spotSell = nums[3];
    seen.add(date);
    rates.push({ date, usdTwd: spotSell, source });
  }
  return rates.sort((left, right) => left.date.localeCompare(right.date));
}

export function parseYahooTwdHistory(payload: unknown): DailyFxRate[] {
  const chart = payload as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: { quote?: Array<{ close?: Array<number | null> }> };
      }>;
    };
  };
  const result = chart.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];
  const rates: DailyFxRate[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < timestamps.length; index += 1) {
    const close = closes[index];
    if (!isPlausibleUsdTwd(close as number)) continue;
    const date = taipeiCalendarDate(timestamps[index]);
    if (!date || seen.has(date)) continue;
    seen.add(date);
    rates.push({ date, usdTwd: close as number, source: "yahoo-twd" });
  }
  return rates.sort((left, right) => left.date.localeCompare(right.date));
}

export function parseFredDextausCsv(text: string): DailyFxRate[] {
  if (!text || text.length > 4_000_000) return [];
  const rates: DailyFxRate[] = [];
  const seen = new Set<string>();
  for (const rawLine of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const [dateRaw, valueRaw] = rawLine.split(",");
    const date = (dateRaw ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || seen.has(date)) continue;
    const usdTwd = Number((valueRaw ?? "").trim());
    if (!isPlausibleUsdTwd(usdTwd)) continue;
    seen.add(date);
    rates.push({ date, usdTwd, source: "fred-dextaus" });
  }
  return rates.sort((left, right) => left.date.localeCompare(right.date));
}

export function mergeDailyFxRates(seriesList: DailyFxRate[][]): DailyFxRate[] {
  const rank: Record<HistoricalFxSource, number> = {
    "bot-sight-sell": 0,
    "yahoo-twd": 1,
    "fred-dextaus": 2,
  };
  const byDate = new Map<string, DailyFxRate>();
  for (const series of seriesList) {
    for (const rate of series) {
      if (!rate.date || !isPlausibleUsdTwd(rate.usdTwd)) continue;
      const current = byDate.get(rate.date);
      if (!current || rank[rate.source] < rank[current.source]) byDate.set(rate.date, rate);
    }
  }
  return [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date));
}

export function pairFxRate(
  date: string,
  rates: readonly DailyFxRate[],
  maxLookbackDays = MAX_FX_LOOKBACK_DAYS,
): DailyFxRate | null {
  if (!date || rates.length === 0) return null;
  const eligible = rates.filter((rate) => rate.date <= date && calendarDaysBetween(rate.date, date) <= maxLookbackDays);
  if (eligible.length === 0) return null;
  const bots = eligible.filter((rate) => rate.source === "bot-sight-sell");
  const pool = bots.length > 0 ? bots : eligible;
  return pool.reduce((best, rate) => (rate.date >= best.date ? rate : best));
}

export function pairFxForTimestamp(
  timestampSec: number,
  rates: readonly DailyFxRate[],
  maxLookbackDays = MAX_FX_LOOKBACK_DAYS,
): DailyFxRate | null {
  const date = taipeiCalendarDate(timestampSec);
  return date ? pairFxRate(date, rates, maxLookbackDays) : null;
}

export function fxHonestyLabel(
  locale: "zh" | "en" | "ja",
  basis: HistoricalFxSeries["basis"],
): string {
  if (locale === "en") {
    if (basis === "bot-sight-sell") {
      return "Historical FX reference: each session uses Bank of Taiwan USD sight-sell for that Taipei day, or the nearest prior BOT business day.";
    }
    if (basis === "mixed") {
      return "Historical FX reference: Bank of Taiwan USD sight-sell when available; gaps use Yahoo TWD=X / FRED DEXTAUS. Missing FX is omitted, never invented.";
    }
    return "Historical FX reference: Yahoo TWD=X / FRED DEXTAUS (public mid-market), not Bank of Taiwan sight-sell. Missing FX is omitted.";
  }
  if (locale === "ja") {
    if (basis === "bot-sight-sell") {
      return "歴史的為替の参考：各時点は台湾銀行の米ドル直物売り（台北カレンダー当日、なければ直前営業日）。";
    }
    if (basis === "mixed") {
      return "歴史的為替の参考：台湾銀行直物売りを優先し、欠落は Yahoo TWD=X / FRED DEXTAUS。為替がない日は省略し、補間しません。";
    }
    return "歴史的為替の参考：Yahoo TWD=X / FRED DEXTAUS（市場仲値）であり、台湾銀行の直物売りではありません。欠落は省略します。";
  }
  if (basis === "bot-sight-sell") {
    return "歷史匯率換算參考：各交易日採用臺銀美元即期賣出（台北日曆當日，若無則最近前一營業日）。";
  }
  if (basis === "mixed") {
    return "歷史匯率換算參考：優先臺銀美元即期賣出；缺口改用 Yahoo TWD=X／FRED DEXTAUS。缺匯率的日子會略過，絕不編造。";
  }
  return "歷史匯率換算參考：Yahoo TWD=X／FRED DEXTAUS 市場匯率（非臺銀即期賣出）。缺匯率的日子會略過。";
}

export function fxSourceSummary(basis: HistoricalFxSeries["basis"], sources: HistoricalFxSource[]): string {
  if (basis === "bot-sight-sell") return "臺灣銀行美元即期賣出（歷史牌告）";
  if (basis === "mixed") {
    const extras = sources.filter((source) => source !== "bot-sight-sell").join(" / ");
    return `臺灣銀行美元即期賣出為主，缺口 ${extras || "公開市場匯率"}`;
  }
  if (sources.includes("yahoo-twd") && sources.includes("fred-dextaus")) return "Yahoo TWD=X / FRED DEXTAUS";
  if (sources.includes("yahoo-twd")) return "Yahoo Finance TWD=X";
  if (sources.includes("fred-dextaus")) return "FRED DEXTAUS";
  return "公開市場歷史匯率";
}

function seriesBasis(rates: DailyFxRate[]): HistoricalFxSeries["basis"] {
  const sources = new Set(rates.map((rate) => rate.source));
  if (sources.size === 0) return "market-reference";
  if (sources.size === 1 && sources.has("bot-sight-sell")) return "bot-sight-sell";
  if (sources.has("bot-sight-sell")) return "mixed";
  return "market-reference";
}

function botCsvUrl(yearMonth: string): string {
  return `${BOT_HISTORY_CSV_BASE}/${yearMonth}/USD`;
}

function botHtmlUrl(yearMonth: string): string {
  return `${BOT_HISTORY_HTML_BASE}/${yearMonth}/USD`;
}

async function readLimitedText(response: Response, maxBytes: number): Promise<string | null> {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) return null;
  const text = await response.text();
  return text.length > maxBytes ? null : text;
}

async function fetchBotMonth(yearMonth: string): Promise<DailyFxRate[]> {
  try {
    const csvResponse = await fetch(botCsvUrl(yearMonth), {
      ...FX_FETCH_INIT,
      signal: AbortSignal.timeout(12_000),
      next: { revalidate: 6 * 3600 },
    });
    if (csvResponse.ok) {
      const csv = await readLimitedText(csvResponse, 500_000);
      const parsed = csv ? parseBotHistoryCsv(csv) : [];
      if (parsed.length > 0) return parsed;
    }
  } catch {
    /* fall through to HTML */
  }
  try {
    const htmlResponse = await fetch(botHtmlUrl(yearMonth), {
      ...FX_FETCH_INIT,
      headers: { ...FX_FETCH_INIT.headers, Accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(12_000),
      next: { revalidate: 6 * 3600 },
    });
    if (!htmlResponse.ok) return [];
    const html = await readLimitedText(htmlResponse, 2_000_000);
    return html ? parseBotHistoryHtml(html) : [];
  } catch {
    return [];
  }
}

async function fetchYahooTwd(fromSec: number, toSec: number): Promise<DailyFxRate[]> {
  const period1 = Math.max(0, Math.floor(fromSec) - 14 * 86_400);
  const period2 = Math.floor(toSec) + 86_400;
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(YAHOO_TWD_SYMBOL)}?interval=1d&period1=${period1}&period2=${period2}`,
      {
        headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(12_000),
        next: { revalidate: 3600 },
      },
    );
    if (!response.ok) return [];
    return parseYahooTwdHistory(await response.json());
  } catch {
    return [];
  }
}

async function fetchFredDextaus(fromDate: string, toDate: string): Promise<DailyFxRate[]> {
  try {
    const response = await fetch(FRED_DEXTAUS_CSV_URL, {
      ...FX_FETCH_INIT,
      signal: AbortSignal.timeout(15_000),
      next: { revalidate: 24 * 3600 },
    });
    if (!response.ok) return [];
    const text = await readLimitedText(response, 4_000_000);
    if (!text) return [];
    return parseFredDextausCsv(text).filter((rate) => rate.date >= fromDate && rate.date <= toDate);
  } catch {
    return [];
  }
}

async function mapPool<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let index = 0; index < items.length; index += limit) {
    const chunk = await Promise.all(items.slice(index, index + limit).map(mapper));
    results.push(...chunk);
  }
  return results;
}

export async function getHistoricalUsdTwd(
  fromTimestampSec: number,
  toTimestampSec: number,
): Promise<HistoricalFxSeries> {
  const fromDate = taipeiCalendarDate(fromTimestampSec - 14 * 86_400) || taipeiCalendarDate(fromTimestampSec);
  const toDate = taipeiCalendarDate(toTimestampSec) || new Date().toISOString().slice(0, 10);
  const months = monthsInclusive(fromDate, toDate);
  const [botMonths, yahoo, fred] = await Promise.all([
    mapPool(months, 4, fetchBotMonth),
    fetchYahooTwd(fromTimestampSec, toTimestampSec),
    fetchFredDextaus(fromDate, toDate),
  ]);
  const bot = botMonths.flat();
  const rates = mergeDailyFxRates([bot, yahoo, fred]);
  return {
    rates,
    basis: seriesBasis(rates),
    sources: [...new Set(rates.map((rate) => rate.source))],
    fromDate,
    toDate,
    retrievedAt: new Date().toISOString(),
  };
}

export async function getHistoricalUsdTwdOrEmpty(
  fromTimestampSec: number,
  toTimestampSec: number,
): Promise<HistoricalFxSeries> {
  try {
    return await getHistoricalUsdTwd(fromTimestampSec, toTimestampSec);
  } catch {
    return {
      rates: [],
      basis: "market-reference",
      sources: [],
      fromDate: taipeiCalendarDate(fromTimestampSec),
      toDate: taipeiCalendarDate(toTimestampSec),
      retrievedAt: new Date().toISOString(),
    };
  }
}
