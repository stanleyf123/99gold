export const BANK_OF_TAIWAN_RATE_URL = "https://rate.bot.com.tw/xrt?Lang=zh-TW";

export type BankOfTaiwanUsdSpotRate = {
  currency: "USD";
  bankBuysUsd: number;
  bankSellsUsd: number;
  quotedAt: string;
  sourceUrl: string;
};

function parseTaipeiTimestamp(value: string): string | null {
  const match = value.match(/(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/);
  if (!match) return null;

  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;

  // Taiwan has used UTC+8 without daylight-saving time throughout this product's date range.
  const timestamp = Date.UTC(year, month - 1, day, hour - 8, minute);
  const localParts = new Date(timestamp + 8 * 60 * 60 * 1000);
  if (
    localParts.getUTCFullYear() !== year
    || localParts.getUTCMonth() !== month - 1
    || localParts.getUTCDate() !== day
    || localParts.getUTCHours() !== hour
    || localParts.getUTCMinutes() !== minute
  ) return null;

  return new Date(timestamp).toISOString();
}

function parseRateCell(row: string, label: string): number | null {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = row.match(new RegExp(`<td\\b(?=[^>]*data-table=["']${escapedLabel}["'])[^>]*>([\\s\\S]*?)<\\/td>`, "i"));
  if (!match) return null;
  const text = match[1].replace(/<[^>]+>/g, "").replace(/&nbsp;|&#160;/gi, " ").replace(/,/g, "").trim();
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

export function parseBankOfTaiwanUsdSpotRate(html: string): BankOfTaiwanUsdSpotRate | null {
  if (!html || html.length > 2_000_000) return null;

  const quotedText = html.match(/<span\b[^>]*class=["'][^"']*\btime\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1]
    ?.replace(/<[^>]+>/g, " ")
    .trim();
  const quotedAt = quotedText ? parseTaipeiTimestamp(quotedText) : null;
  if (!quotedAt) return null;

  const usdRow = [...html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)]
    .map((match) => match[0])
    .find((row) => /美金\s*\(USD\)/i.test(row));
  if (!usdRow) return null;

  const bankBuysUsd = parseRateCell(usdRow, "本行即期買入");
  const bankSellsUsd = parseRateCell(usdRow, "本行即期賣出");
  if (
    bankBuysUsd === null
    || bankSellsUsd === null
    || bankBuysUsd < 5
    || bankBuysUsd > 100
    || bankSellsUsd < 5
    || bankSellsUsd > 100
    || bankSellsUsd < bankBuysUsd
  ) return null;

  return {
    currency: "USD",
    bankBuysUsd,
    bankSellsUsd,
    quotedAt,
    sourceUrl: BANK_OF_TAIWAN_RATE_URL,
  };
}
