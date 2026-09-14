export const categories = {
  all: {zh:"全部新聞",en:"All news",ja:"すべて"},
  prices: {zh:"金價動態",en:"Gold prices",ja:"金相場"},
  macro: {zh:"總經與利率",en:"Economy & rates",ja:"経済・金利"},
  policy: {zh:"央行與政策",en:"Central banks & policy",ja:"中央銀行・政策"},
  supply: {zh:"產業供需",en:"Industry & demand",ja:"産業・需給"},
  taiwan: {zh:"台灣市場",en:"Taiwan market",ja:"台湾市場"},
};
export type NewsCategory = Exclude<keyof typeof categories,"all">;

export function asNewsCategory(value?: string | null): NewsCategory {
  return value && value !== "all" && Object.prototype.hasOwnProperty.call(categories, value)
    ? value as NewsCategory
    : "macro";
}
