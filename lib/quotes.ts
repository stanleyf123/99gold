import { BANK_OF_TAIWAN_RATE_URL, parseBankOfTaiwanUsdSpotRate, type BankOfTaiwanUsdSpotRate } from "../app/api/bank-of-taiwan-fx";
import { getGoldMarketStatus, type GoldMarketStatus } from "../app/api/quote-timing";

type FxResponse = {
  rates?: Record<string, number>;
  time_last_update_unix?: number;
};
type GoldApiResponse = {
  currency?: string;
  name?: string;
  price?: number;
  symbol?: string;
  updatedAt?: string;
};
type YahooResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        previousClose?: number;
        regularMarketDayHigh?: number;
        regularMarketDayLow?: number;
        regularMarketTime?: number;
        currency?: string;
        exchangeName?: string;
      };
      timestamp?: number[];
      indicators?: { quote?: Array<{ open?: Array<number | null>; close?: Array<number | null> }> };
    }>;
  };
};

const instruments = [
  ["gold", "GC=F", "XAU", "黃金期貨", "Gold Futures", "黃金現貨參考", "Gold Spot Reference"],
  ["silver", "SI=F", "XAG", "白銀期貨", "Silver Futures", "白銀現貨參考", "Silver Spot Reference"],
  ["platinum", "PL=F", "XPT", "鉑金期貨", "Platinum Futures", "鉑金現貨參考", "Platinum Spot Reference"],
  ["palladium", "PA=F", "XPD", "鈀金期貨", "Palladium Futures", "鈀金現貨參考", "Palladium Spot Reference"],
] as const;

type Instrument = (typeof instruments)[number];
export type MetalQuote = {
  id: Instrument[0];
  symbol: string;
  name: string;
  englishName: string;
  price: number;
  previousClose: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string;
  venue: string;
  quotedAt: string;
  series: Array<{ timestamp: number; close: number }>;
  basis: "futures" | "spot";
  source: string;
};

export type MarketQuoteItem = {
  id: "gold-reference" | "taiwan-qian" | "taiwan-gram" | "usd-twd";
  label: string;
  code: string;
  price: string;
  unit: string;
  change: string;
  up: boolean | null;
};

export type GlobalQuotes = {
  metals: MetalQuote[];
  currencies: Record<string, number>;
  items: MarketQuoteItem[];
  quotedAt: string;
  updatedAt: string;
  retrievedAt: string;
  fxQuotedAt: string | null;
  fxSource: string | null;
  fxBasis: "bank-sight-sell" | "market-reference" | null;
  bankOfTaiwan: BankOfTaiwanUsdSpotRate | null;
  marketFxQuotedAt: string | null;
  marketStatus: GoldMarketStatus;
  quoteSource: string;
  source: string;
};

const quoteFetchInit = { next: { revalidate: 180 } } as const;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

async function getMarketCurrencies() {
  const currencies: Record<string, number> = { USD: 1 };
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", {
      headers: { Accept: "application/json" },
      ...quoteFetchInit,
    });
    if (!response.ok) return { currencies, quotedAt: null as string | null };
    const data = await response.json() as FxResponse;
    for (const code of ["TWD", "HKD", "CNY", "JPY", "EUR"]) {
      const rate = data.rates?.[code];
      if (isFiniteNumber(rate) && rate > 0) currencies[code] = rate;
    }
    const quotedAt = isFiniteNumber(data.time_last_update_unix)
      ? new Date(data.time_last_update_unix * 1000).toISOString()
      : null;
    return { currencies, quotedAt };
  } catch {
    // FX is optional for the international quote. Taiwan conversions fail closed downstream.
    return { currencies, quotedAt: null as string | null };
  }
}

async function getBankOfTaiwanUsdRate(): Promise<BankOfTaiwanUsdSpotRate | null> {
  try {
    const response = await fetch(BANK_OF_TAIWAN_RATE_URL, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "99gold.net quote-monitor/1.0 (+https://99gold.net)",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
      ...quoteFetchInit,
    });
    if (!response.ok) return null;
    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > 2_000_000) return null;
    return parseBankOfTaiwanUsdSpotRate(await response.text());
  } catch {
    return null;
  }
}

async function getCurrencies() {
  const [marketFx, bankOfTaiwan] = await Promise.all([getMarketCurrencies(), getBankOfTaiwanUsdRate()]);
  const marketUsdTwd = isFiniteNumber(marketFx.currencies.TWD) && marketFx.currencies.TWD > 0
    ? marketFx.currencies.TWD
    : null;
  const selectedUsdTwd = bankOfTaiwan?.bankSellsUsd ?? marketUsdTwd;
  const currencies = { ...marketFx.currencies };
  if (selectedUsdTwd !== null) currencies.TWD = selectedUsdTwd;
  else delete currencies.TWD;

  return {
    currencies,
    marketQuotedAt: marketFx.quotedAt,
    bankOfTaiwan,
    selectedUsdTwd,
    fxQuotedAt: bankOfTaiwan?.quotedAt ?? marketFx.quotedAt,
    fxSource: bankOfTaiwan ? "臺灣銀行美元即期賣出" : marketUsdTwd !== null ? "open.er-api.com 市場參考匯率（備援）" : null,
    fxBasis: bankOfTaiwan ? "bank-sight-sell" as const : marketUsdTwd !== null ? "market-reference" as const : null,
  };
}

function buildMarketItems(gold: MetalQuote, fx: Awaited<ReturnType<typeof getCurrencies>>): MarketQuoteItem[] {
  const changeAvailable = isFiniteNumber(gold.changePercent);
  const numericChange = changeAvailable ? gold.changePercent as number : 0;
  const direction = numericChange >= 0 ? "+" : "−";
  const changeLabel = changeAvailable ? `${direction}${Math.abs(numericChange).toFixed(2)}%` : "有效參考價";
  const up = changeAvailable ? (numericChange > 0 ? true : numericChange < 0 ? false : null) : null;
  const referenceLabel = gold.basis === "futures" ? "COMEX 黃金期貨參考" : "國際黃金現貨參考";
  const referenceCode = `${gold.symbol} · ${gold.basis === "futures" ? "Yahoo Finance" : "Gold API"}`;
  const conversionCode = fx.bankOfTaiwan
    ? `${gold.symbol} × 臺銀美元即期賣出`
    : `${gold.symbol} × USD/TWD 市場備援`;

  const items: MarketQuoteItem[] = [
    { id: "gold-reference", label: referenceLabel, code: referenceCode, price: gold.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), unit: "美元／金衡盎司", change: `${changeLabel} · ${gold.basis === "futures" ? "期貨參考" : "現貨參考"}`, up },
  ];
  if (fx.selectedUsdTwd === null) return items;

  const twdPerGram = gold.price * fx.selectedUsdTwd / 31.1034768;
  const twdPerQian = twdPerGram * 3.75;
  const rateItem: MarketQuoteItem = fx.bankOfTaiwan
    ? {
        id: "usd-twd",
        label: "臺銀美元即期",
        code: "USD / TWD · 臺灣銀行",
        price: `${fx.bankOfTaiwan.bankBuysUsd.toFixed(4)}–${fx.bankOfTaiwan.bankSellsUsd.toFixed(4)}`,
        unit: "新台幣／美元",
        change: `買入 ${fx.bankOfTaiwan.bankBuysUsd.toFixed(4)} · 賣出 ${fx.bankOfTaiwan.bankSellsUsd.toFixed(4)} · 換算採賣出`,
        up: null,
      }
    : {
        id: "usd-twd",
        label: "美元市場參考匯率",
        code: "USD / TWD · open.er-api.com",
        price: fx.selectedUsdTwd.toFixed(4),
        unit: "新台幣／美元",
        change: "臺銀暫不可用 · 備援換算",
        up: null,
      };
  return [...items,
    { id: "taiwan-qian", label: "台灣理論買進成本", code: conversionCode, price: Math.round(twdPerQian).toLocaleString("en-US"), unit: "新台幣／錢", change: "未含銀樓價差與費用", up },
    { id: "taiwan-gram", label: "黃金每公克", code: conversionCode, price: Math.round(twdPerGram).toLocaleString("en-US"), unit: "新台幣／公克", change: "未含銀樓價差與費用", up },
    rateItem,
  ];
}

async function getYahooQuote(instrument: Instrument): Promise<MetalQuote | null> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(instrument[1])}?interval=5m&range=5d`,
      { headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" }, ...quoteFetchInit },
    );
    if (!response.ok) return null;
    const data = await response.json() as YahooResponse;
    const result = data.chart?.result?.[0];
    const meta = result?.meta;
    if (!isFiniteNumber(meta?.regularMarketPrice)) return null;

    const timestamps = result?.timestamp ?? [];
    const quote = result?.indicators?.quote?.[0];
    const closes = quote?.close ?? [];
    const completeSeries = timestamps
      .map((timestamp, index) => ({ timestamp, close: closes[index] }))
      .filter((point): point is { timestamp: number; close: number } => isFiniteNumber(point.close));
    const latestPointTimestamp = completeSeries.at(-1)?.timestamp;
    const sessionStart = isFiniteNumber(latestPointTimestamp) ? latestPointTimestamp - 86_400 : 0;
    const series = completeSeries.filter((point) => point.timestamp >= sessionStart);
    const sessionOpen = timestamps
      .map((timestamp, index) => ({ timestamp, open: quote?.open?.[index] }))
      .find((point) => point.timestamp >= sessionStart && isFiniteNumber(point.open))?.open
      ?? series[0]?.close
      ?? null;
    const observedHigh = series.length ? Math.max(...series.map((point) => point.close)) : null;
    const observedLow = series.length ? Math.min(...series.map((point) => point.close)) : null;
    const previousClose = isFiniteNumber(meta.previousClose) ? meta.previousClose : null;
    const quotedTimestamp = isFiniteNumber(meta.regularMarketTime)
      ? meta.regularMarketTime
      : series.at(-1)?.timestamp;
    if (!isFiniteNumber(quotedTimestamp)) return null;

    const price = meta.regularMarketPrice;
    const change = previousClose === null ? null : price - previousClose;
    return {
      id: instrument[0],
      symbol: instrument[1],
      name: instrument[3],
      englishName: instrument[4],
      price,
      previousClose,
      open: sessionOpen,
      high: isFiniteNumber(meta.regularMarketDayHigh) ? meta.regularMarketDayHigh : observedHigh,
      low: isFiniteNumber(meta.regularMarketDayLow) ? meta.regularMarketDayLow : observedLow,
      change,
      changePercent: change !== null && previousClose ? (change / previousClose) * 100 : null,
      currency: meta.currency ?? "USD",
      venue: meta.exchangeName ?? "COMEX",
      quotedAt: new Date(quotedTimestamp * 1000).toISOString(),
      series,
      basis: "futures",
      source: "Yahoo Finance chart",
    };
  } catch {
    return null;
  }
}

async function getSpotFallback(instrument: Instrument): Promise<MetalQuote | null> {
  try {
    const response = await fetch(`https://api.gold-api.com/price/${instrument[2]}`, {
      headers: { Accept: "application/json" },
      ...quoteFetchInit,
    });
    if (!response.ok) return null;
    const data = await response.json() as GoldApiResponse;
    const quotedAt = data.updatedAt ? new Date(data.updatedAt) : null;
    if (!isFiniteNumber(data.price) || !quotedAt || Number.isNaN(quotedAt.getTime())) return null;
    return {
      id: instrument[0],
      symbol: `${instrument[2]}/USD`,
      name: instrument[5],
      englishName: instrument[6],
      price: data.price,
      previousClose: null,
      open: null,
      high: null,
      low: null,
      change: null,
      changePercent: null,
      currency: data.currency ?? "USD",
      venue: "OTC SPOT",
      quotedAt: quotedAt.toISOString(),
      series: [],
      basis: "spot",
      source: "Gold API public spot reference",
    };
  } catch {
    return null;
  }
}

async function getQuote(instrument: Instrument) {
  return await getYahooQuote(instrument) ?? await getSpotFallback(instrument);
}

export async function getGlobalQuotes(): Promise<GlobalQuotes> {
  // Resolve gold first so optional symbols cannot cause Yahoo burst limits to hide the main quote.
  const [gold, fx] = await Promise.all([getQuote(instruments[0]), getCurrencies()]);
  if (!gold) throw new Error("Gold quote missing");
  const optionalMetals = await Promise.all(instruments.slice(1).map(getQuote));
  const metals = [gold, ...optionalMetals.filter((metal): metal is MetalQuote => metal !== null)];
  const sources = [...new Set(metals.map((metal) => metal.source))];
  const retrievedAt = new Date().toISOString();

  return {
    metals,
    currencies: fx.currencies,
    items: buildMarketItems(gold, fx),
    quotedAt: gold.quotedAt,
    updatedAt: gold.quotedAt,
    retrievedAt,
    fxQuotedAt: fx.fxQuotedAt,
    fxSource: fx.fxSource,
    fxBasis: fx.fxBasis,
    bankOfTaiwan: fx.bankOfTaiwan,
    marketFxQuotedAt: fx.marketQuotedAt,
    marketStatus: getGoldMarketStatus(new Date(retrievedAt), gold.quotedAt),
    quoteSource: gold.source,
    source: `${sources.join(" + ")}${fx.bankOfTaiwan ? " · 臺灣銀行美元即期牌告" : fx.selectedUsdTwd === null ? "" : " · open.er-api.com FX 備援"}${Object.keys(fx.currencies).some((code) => !["USD", "TWD"].includes(code)) ? " · open.er-api.com 全球匯率" : ""}`,
  };
}

export async function getGlobalQuotesOrNull(): Promise<GlobalQuotes | null> {
  try {
    return await getGlobalQuotes();
  } catch {
    return null;
  }
}
