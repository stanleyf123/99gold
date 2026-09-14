import {
  GRAMS_PER_QIAN,
  TROY_OUNCE_GRAMS,
  qianFromUsdOz,
} from "./section-quotes";

/** Hong Kong tael used by local bullion quotes, conventionally 37.429 g. */
export const HONG_KONG_TAEL_GRAMS = 37.429;
/** PRC metric 市兩 = 50 g. */
export const CHINA_SHI_TAEL_GRAMS = 50;

export type WorldMarketId =
  | "taipei"
  | "hong-kong"
  | "shanghai"
  | "tokyo"
  | "singapore"
  | "london"
  | "new-york";

export type WorldMarketBasis = "local-fx" | "usd-fallback" | "eur-fallback" | "missing";

export type LocalizedText = { zh: string; en: string; ja: string };

export type WorldMarketLine = {
  value: number | null;
  currency: string;
  unit: LocalizedText;
  decimals: number;
};

export type WorldMarketQuote = {
  id: WorldMarketId;
  city: string;
  hours: string;
  name: LocalizedText;
  primary: WorldMarketLine;
  secondary: WorldMarketLine | null;
  changePercent: number | null;
  basis: WorldMarketBasis;
};

export type WorldMarketInput = {
  goldUsdPerOz: number | null | undefined;
  goldChangePercent?: number | null;
  currencies: Record<string, number>;
  taiwanQian?: number | null;
  taiwanGram?: number | null;
};

const NAMES: Record<WorldMarketId, LocalizedText> = {
  taipei: { zh: "台灣", en: "Taiwan", ja: "台湾" },
  "hong-kong": { zh: "香港", en: "Hong Kong", ja: "香港" },
  shanghai: { zh: "中國", en: "China", ja: "中国" },
  tokyo: { zh: "日本", en: "Japan", ja: "日本" },
  singapore: { zh: "新加坡", en: "Singapore", ja: "シンガポール" },
  london: { zh: "倫敦", en: "London", ja: "ロンドン" },
  "new-york": { zh: "紐約", en: "New York", ja: "ニューヨーク" },
};

function positiveNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

export function fxRate(currencies: Record<string, number>, code: string): number | null {
  return positiveNumber(currencies[code]);
}

/** Convert USD/oz gold into a local currency amount for `grams` of metal. */
export function usdOzToLocal(usdPerOz: number, rate: number, grams: number): number | null {
  if (!positiveNumber(usdPerOz) || !positiveNumber(rate) || !positiveNumber(grams)) return null;
  return usdPerOz * rate / TROY_OUNCE_GRAMS * grams;
}

export function formatWorldPrice(value: number | null | undefined, decimals: number): string {
  if (!positiveNumber(value)) return "—";
  if (decimals <= 0) return Math.round(value as number).toLocaleString("en-US");
  return (value as number).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function line(
  value: number | null,
  currency: string,
  unit: LocalizedText,
  decimals: number,
): WorldMarketLine {
  return { value, currency, unit, decimals };
}

function changeIfPriced(value: number | null, changePercent: number | null | undefined): number | null {
  if (!positiveNumber(value)) return null;
  return typeof changePercent === "number" && Number.isFinite(changePercent) ? changePercent : null;
}

export function taiwanGramFromUsdOz(usdPerOz: number, usdTwd: number): number {
  return Math.round(usdPerOz * usdTwd / TROY_OUNCE_GRAMS);
}

export function buildWorldMarketQuotes(input: WorldMarketInput): WorldMarketQuote[] {
  const gold = positiveNumber(input.goldUsdPerOz);
  const fx = input.currencies ?? {};
  const twd = fxRate(fx, "TWD");
  const hkd = fxRate(fx, "HKD");
  const cny = fxRate(fx, "CNY");
  const jpy = fxRate(fx, "JPY");
  const sgd = fxRate(fx, "SGD");
  const gbp = fxRate(fx, "GBP");
  const eur = fxRate(fx, "EUR");
  const change = input.goldChangePercent;

  const taiwanQian = positiveNumber(input.taiwanQian)
    ?? (gold !== null && twd !== null ? qianFromUsdOz(gold, twd) : null);
  const taiwanGram = positiveNumber(input.taiwanGram)
    ?? (gold !== null && twd !== null ? taiwanGramFromUsdOz(gold, twd) : null);

  const hkGram = gold !== null && hkd !== null ? usdOzToLocal(gold, hkd, 1) : null;
  const hkTael = gold !== null && hkd !== null ? usdOzToLocal(gold, hkd, HONG_KONG_TAEL_GRAMS) : null;
  const cnGram = gold !== null && cny !== null ? usdOzToLocal(gold, cny, 1) : null;
  const cnShiTael = gold !== null && cny !== null ? usdOzToLocal(gold, cny, CHINA_SHI_TAEL_GRAMS) : null;
  const jpGram = gold !== null && jpy !== null ? usdOzToLocal(gold, jpy, 1) : null;
  const sgOz = gold !== null && sgd !== null ? gold * sgd : gold;
  const sgBasis: WorldMarketBasis = gold === null ? "missing" : sgd !== null ? "local-fx" : "usd-fallback";
  const londonOz = gold === null ? null : gbp !== null ? gold * gbp : eur !== null ? gold * eur : gold;
  const londonBasis: WorldMarketBasis = gold === null
    ? "missing"
    : gbp !== null ? "local-fx" : eur !== null ? "eur-fallback" : "usd-fallback";
  const londonCurrency = gold === null ? "GBP" : gbp !== null ? "GBP" : eur !== null ? "EUR" : "USD";
  const londonUnit: LocalizedText = londonCurrency === "GBP"
    ? { zh: "GBP／盎司", en: "GBP / ounce", ja: "GBP／オンス" }
    : londonCurrency === "EUR"
      ? { zh: "EUR／盎司", en: "EUR / ounce", ja: "EUR／オンス" }
      : { zh: "USD／盎司", en: "USD / ounce", ja: "USD／オンス" };

  return [
    {
      id: "taipei",
      city: "Taipei",
      hours: "09:00–17:00",
      name: NAMES.taipei,
      primary: line(taiwanQian, "TWD", { zh: "TWD／錢", en: "TWD / qian", ja: "TWD／銭" }, 0),
      secondary: line(taiwanGram, "TWD", { zh: "TWD／公克", en: "TWD / gram", ja: "TWD／グラム" }, 0),
      changePercent: changeIfPriced(taiwanQian, change),
      basis: taiwanQian !== null ? "local-fx" : "missing",
    },
    {
      id: "hong-kong",
      city: "Hong Kong",
      hours: "09:00–17:00",
      name: NAMES["hong-kong"],
      primary: line(hkTael === null ? null : Math.round(hkTael), "HKD", {
        zh: "HKD／港兩",
        en: "HKD / HK tael",
        ja: "HKD／港両",
      }, 0),
      secondary: line(hkGram, "HKD", { zh: "HKD／克", en: "HKD / gram", ja: "HKD／グラム" }, 2),
      changePercent: changeIfPriced(hkTael, change),
      basis: hkTael !== null ? "local-fx" : "missing",
    },
    {
      id: "shanghai",
      city: "Shanghai",
      hours: "09:00–15:30",
      name: NAMES.shanghai,
      primary: line(cnGram, "CNY", { zh: "CNY／克", en: "CNY / gram", ja: "CNY／グラム" }, 2),
      secondary: line(cnShiTael === null ? null : Math.round(cnShiTael), "CNY", {
        zh: "CNY／市兩",
        en: "CNY / shi tael",
        ja: "CNY／市両",
      }, 0),
      changePercent: changeIfPriced(cnGram, change),
      basis: cnGram !== null ? "local-fx" : "missing",
    },
    {
      id: "tokyo",
      city: "Tokyo",
      hours: "09:00–15:30",
      name: NAMES.tokyo,
      primary: line(jpGram === null ? null : Math.round(jpGram), "JPY", {
        zh: "JPY／克",
        en: "JPY / gram",
        ja: "JPY／グラム",
      }, 0),
      secondary: null,
      changePercent: changeIfPriced(jpGram, change),
      basis: jpGram !== null ? "local-fx" : "missing",
    },
    {
      id: "singapore",
      city: "Singapore",
      hours: "09:00–17:00",
      name: NAMES.singapore,
      primary: line(sgOz, sgBasis === "usd-fallback" ? "USD" : "SGD", sgBasis === "usd-fallback"
        ? { zh: "USD／盎司", en: "USD / ounce", ja: "USD／オンス" }
        : { zh: "SGD／盎司", en: "SGD / ounce", ja: "SGD／オンス" }, 2),
      secondary: null,
      changePercent: changeIfPriced(sgOz, change),
      basis: sgBasis,
    },
    {
      id: "london",
      city: "London",
      hours: "08:00–17:00",
      name: NAMES.london,
      primary: line(londonOz, londonCurrency, londonUnit, 2),
      secondary: null,
      changePercent: changeIfPriced(londonOz, change),
      basis: londonBasis,
    },
    {
      id: "new-york",
      city: "New York",
      hours: "08:20–17:00",
      name: NAMES["new-york"],
      primary: line(gold, "USD", { zh: "USD／盎司", en: "USD / ounce", ja: "USD／オンス" }, 2),
      secondary: null,
      changePercent: changeIfPriced(gold, change),
      basis: gold !== null ? "local-fx" : "missing",
    },
  ];
}

export function converterOunces(weight: number, unit: string): number {
  if (unit === "gram") return weight / TROY_OUNCE_GRAMS;
  if (unit === "qian") return weight * GRAMS_PER_QIAN / TROY_OUNCE_GRAMS;
  if (unit === "tael") return weight * GRAMS_PER_QIAN * 10 / TROY_OUNCE_GRAMS;
  return weight;
}
