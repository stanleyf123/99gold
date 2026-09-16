import { fxRate, formatWorldPrice } from "./world-markets";

export const GOLD_FX_CODES = ["TWD", "USD", "EUR", "JPY", "CNY"] as const;
export type GoldFxCode = (typeof GOLD_FX_CODES)[number];

type Localized = { zh: string; en: string; ja: string };

export type GoldFxQuote = {
  code: GoldFxCode;
  value: number | null;
  decimals: number;
  unit: Localized;
  label: Localized;
};

function positiveNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function convertOz(goldUsdPerOz: number | null, currencies: Record<string, number>, code: "EUR" | "JPY" | "CNY") {
  const rate = fxRate(currencies, code);
  if (goldUsdPerOz === null || rate === null) return null;
  return goldUsdPerOz * rate;
}

export function buildGoldFxQuotes(input: {
  goldUsdPerOz?: number | null;
  taiwanQian?: number | null;
  currencies?: Record<string, number>;
}): GoldFxQuote[] {
  const gold = positiveNumber(input.goldUsdPerOz);
  const fx = input.currencies ?? {};
  return [
    {
      code: "TWD",
      value: positiveNumber(input.taiwanQian),
      decimals: 0,
      unit: { zh: "TWD／錢", en: "TWD / qian", ja: "TWD／銭" },
      label: { zh: "台灣理論錢價", en: "Taiwan theoretical qian", ja: "台湾の理論銭価" },
    },
    {
      code: "USD",
      value: gold,
      decimals: 2,
      unit: { zh: "USD／盎司", en: "USD / oz", ja: "USD／オンス" },
      label: { zh: "COMEX 黃金參考", en: "COMEX gold reference", ja: "COMEX金参考" },
    },
    {
      code: "EUR",
      value: convertOz(gold, fx, "EUR"),
      decimals: 2,
      unit: { zh: "EUR／盎司", en: "EUR / oz", ja: "EUR／オンス" },
      label: { zh: "歐元換算", en: "Euro conversion", ja: "ユーロ換算" },
    },
    {
      code: "JPY",
      value: convertOz(gold, fx, "JPY"),
      decimals: 0,
      unit: { zh: "JPY／盎司", en: "JPY / oz", ja: "JPY／オンス" },
      label: { zh: "日圓換算", en: "Yen conversion", ja: "円換算" },
    },
    {
      code: "CNY",
      value: convertOz(gold, fx, "CNY"),
      decimals: 2,
      unit: { zh: "CNY／盎司", en: "CNY / oz", ja: "CNY／オンス" },
      label: { zh: "人民幣換算", en: "Renminbi conversion", ja: "人民元換算" },
    },
  ];
}

export function formatGoldFxValue(value: number | null | undefined, decimals: number) {
  return formatWorldPrice(value, decimals);
}
