export type FxBasis = "bank-sight-sell" | "market-reference" | null;

export type FxDisplayQuotes = {
  fxBasis?: string | null;
  bankOfTaiwan?: { bankSellsUsd?: number | null } | null;
  currencies?: { TWD?: number } | null;
};

/** BOT USD spot *sell* only — same FX used for taiwan-qian. Market-reference fallback is not labeled as BOT. */
export function bankOfTaiwanUsdSightSell(quotes: FxDisplayQuotes): number | null {
  if (quotes.fxBasis !== "bank-sight-sell") return null;
  const fromBot = quotes.bankOfTaiwan?.bankSellsUsd;
  if (typeof fromBot === "number" && Number.isFinite(fromBot) && fromBot > 0) {
    return fromBot;
  }
  const twd = quotes.currencies?.TWD;
  if (typeof twd === "number" && Number.isFinite(twd) && twd > 0) {
    return twd;
  }
  return null;
}

export function formatUsdTwdSightSell(rate: number | null): string {
  if (rate === null || !Number.isFinite(rate) || rate <= 0) return "—";
  return rate.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 4 });
}
