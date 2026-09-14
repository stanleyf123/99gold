import type { GlobalQuotes, MarketQuoteItem, MetalQuote } from "./quotes";

export const JEWELRY_SELL_PREMIUM_RATE = 0.04;
export const RECYCLE_PURITY = {
  "999.9": 1,
  "916": 0.916,
  "750": 0.75,
} as const;

export type SectionName = "international" | "jewelry" | "recycling";
export type SectionCard = { name: string; price: string; unit: string; change: string };
export type SectionView = {
  eyebrow: string;
  title: string;
  intro: string;
  unit: string;
  price: string;
  change: string;
  cards: SectionCard[];
  note: string;
  connected: boolean;
};

const copy = {
  international: {
    eyebrow: "GLOBAL SPOT MARKET",
    title: "國際金價",
    intro: "追蹤 COMEX 黃金期貨與主要貴金屬的盤中參考報價，單位為美元／金衡盎司。",
    emptyIntro: "目前沒有可驗證的國際貴金屬行情。請稍後再試，或至首頁查看來源狀態。",
    note: "價格以 Yahoo Finance 貴金屬期貨為參考（USD/oz）；來源受限時可能改列公開現貨參考。盤中價格可能快速變動，不構成可成交牌告。",
  },
  jewelry: {
    eyebrow: "TAIWAN JEWELRY PRICE",
    title: "今日銀樓價格",
    intro: "以國際黃金參考價與臺銀美元即期賣出換算台灣理論買進成本，並標示估計賣出溢價，方便對照銀樓區間。",
    emptyIntro: "台灣換算所需的國際金價或匯率暫時無法連線，因此不顯示銀樓參考數字。",
    note: "買進為 GC×臺銀即期賣出的理論成本，未含銀樓價差與費用。賣出為估計溢價 4% 的參考值，實際門市牌價、工費與品牌溢價請向店家確認。",
  },
  recycling: {
    eyebrow: "GOLD RECYCLING GUIDE",
    title: "黃金回收",
    intro: "以台灣理論買進成本依成色比例估算舊金飾回收參考，協助你評估 999.9、916 與 750 的大約價值。",
    emptyIntro: "台灣換算所需的國際金價或匯率暫時無法連線，因此不顯示回收參考數字。",
    note: "回收參考依台灣理論買進成本與成色比例估算，未扣除檢測、耗損與手續費。實際回收請向店家確認秤重、純度與是否另扣費用，並建議攜帶身分證件。",
  },
} as const;

export function parseQuotedNumber(price: string): number | null {
  const value = Number(price.replace(/,/g, "").trim());
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function formatTwdAmount(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

export function formatUsdAmount(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatSignedChange(change: number | null | undefined, changePercent: number | null | undefined): string {
  if (!Number.isFinite(change) || !Number.isFinite(changePercent)) return "有效參考價";
  const amount = change as number;
  const percent = changePercent as number;
  const direction = amount >= 0 ? "+" : "−";
  return `${direction}${Math.abs(amount).toFixed(2)}　${direction}${Math.abs(percent).toFixed(2)}%`;
}

export function jewelrySellFromBuy(buyQian: number, premiumRate = JEWELRY_SELL_PREMIUM_RATE): number {
  return Math.round(buyQian * (1 + premiumRate));
}

export function recycleFromQian(buyQian: number, purity: number): number {
  return Math.round(buyQian * purity);
}

export function itemById(items: MarketQuoteItem[] | undefined, id: MarketQuoteItem["id"]): MarketQuoteItem | undefined {
  return items?.find((item) => item.id === id);
}

export function taiwanQianValue(items: MarketQuoteItem[] | undefined): number | null {
  const item = itemById(items, "taiwan-qian");
  return item ? parseQuotedNumber(item.price) : null;
}

export function formatTaipeiTime(value: string | null | undefined): string {
  const date = new Date(value ?? "");
  if (!value || Number.isNaN(date.getTime())) return "取得中";
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Taipei",
  }).format(date);
}

export function marketStatusLabel(status: GlobalQuotes["marketStatus"] | undefined, connected: boolean): string {
  if (!connected) return "行情暫不可用";
  if (status === "open") return "市場交易中";
  if (status === "daily-break") return "每日休市 · 最後有效行情";
  if (status === "weekend-closed") return "週末休市 · 最後有效行情";
  if (status === "delayed") return "行情可能延遲 · 自動重試";
  return "行情狀態無法確認";
}

function metalChange(metal: MetalQuote): string {
  return formatSignedChange(metal.change, metal.changePercent);
}

function emptyView(section: SectionName): SectionView {
  const page = copy[section];
  const fallbackCards: Record<SectionName, SectionCard[]> = {
    international: [
      { name: "紐約黃金期貨 GC=F", price: "—", unit: "美元／盎司", change: "尚無有效資料" },
      { name: "國際白銀 SI=F", price: "—", unit: "美元／盎司", change: "尚無有效資料" },
      { name: "鉑金 PL=F", price: "—", unit: "美元／盎司", change: "尚無有效資料" },
    ],
    jewelry: [
      { name: "999.9 黃金買進", price: "—", unit: "台幣／錢", change: "尚無有效資料" },
      { name: "999.9 黃金賣出估計", price: "—", unit: "台幣／錢", change: "尚無有效資料" },
      { name: "黃金每公克", price: "—", unit: "台幣／公克", change: "尚無有效資料" },
    ],
    recycling: [
      { name: "999.9 純金", price: "—", unit: "台幣／錢", change: "尚無有效資料" },
      { name: "916 黃金", price: "—", unit: "台幣／錢", change: "尚無有效資料" },
      { name: "750 黃金", price: "—", unit: "台幣／錢", change: "尚無有效資料" },
    ],
  };
  const fallbackHero: Record<SectionName, { unit: string }> = {
    international: { unit: "美元／盎司" },
    jewelry: { unit: "999.9 黃金參考／台幣・錢" },
    recycling: { unit: "999.9 黃金參考回收／台幣・錢" },
  };
  return {
    eyebrow: page.eyebrow,
    title: page.title,
    intro: page.emptyIntro,
    unit: fallbackHero[section].unit,
    price: "—",
    change: "尚無有效資料",
    cards: fallbackCards[section],
    note: page.note,
    connected: false,
  };
}

function internationalView(quotes: GlobalQuotes): SectionView | null {
  const gold = quotes.metals.find((metal) => metal.id === "gold");
  if (!gold) return null;
  const page = copy.international;
  const cards = quotes.metals.map((metal) => ({
    name: `${metal.name} ${metal.symbol}`,
    price: formatUsdAmount(metal.price),
    unit: "美元／盎司",
    change: metalChange(metal),
  }));
  return {
    eyebrow: page.eyebrow,
    title: page.title,
    intro: page.intro,
    unit: "美元／盎司（USD/oz）",
    price: formatUsdAmount(gold.price),
    change: metalChange(gold),
    cards,
    note: `${page.note} 資料來源：${quotes.source}。`,
    connected: true,
  };
}

function jewelryView(quotes: GlobalQuotes): SectionView | null {
  const buy = taiwanQianValue(quotes.items);
  const gram = itemById(quotes.items, "taiwan-gram");
  const gramValue = gram ? parseQuotedNumber(gram.price) : null;
  if (buy === null) return null;
  const sell = jewelrySellFromBuy(buy);
  const gold = quotes.metals.find((metal) => metal.id === "gold");
  const buyChange = gold ? metalChange(gold) : (itemById(quotes.items, "taiwan-qian")?.change ?? "未含銀樓價差與費用");
  const page = copy.jewelry;
  return {
    eyebrow: page.eyebrow,
    title: page.title,
    intro: page.intro,
    unit: "999.9 黃金賣出估計／台幣・錢",
    price: formatTwdAmount(sell),
    change: `估計溢價 ${(JEWELRY_SELL_PREMIUM_RATE * 100).toFixed(0)}%`,
    cards: [
      { name: "999.9 黃金買進", price: formatTwdAmount(buy), unit: "台幣／錢", change: buyChange },
      { name: "999.9 黃金賣出估計", price: formatTwdAmount(sell), unit: "台幣／錢", change: `估計溢價 ${(JEWELRY_SELL_PREMIUM_RATE * 100).toFixed(0)}%（非店家牌價）` },
      gramValue !== null
        ? { name: gram?.label ?? "黃金每公克", price: formatTwdAmount(gramValue), unit: gram?.unit ?? "台幣／公克", change: gram?.change ?? "未含銀樓價差與費用" }
        : { name: "換算來源", price: itemById(quotes.items, "taiwan-qian")?.code ?? "GC × USD/TWD", unit: "理論買進", change: "未含銀樓價差與費用" },
    ],
    note: page.note,
    connected: true,
  };
}

function recyclingView(quotes: GlobalQuotes): SectionView | null {
  const buy = taiwanQianValue(quotes.items);
  if (buy === null) return null;
  const page = copy.recycling;
  const fine = recycleFromQian(buy, RECYCLE_PURITY["999.9"]);
  return {
    eyebrow: page.eyebrow,
    title: page.title,
    intro: page.intro,
    unit: "999.9 黃金參考回收／台幣・錢",
    price: formatTwdAmount(fine),
    change: "理論含金量參考",
    cards: [
      { name: "999.9 純金", price: formatTwdAmount(fine), unit: "台幣／錢", change: "高純度" },
      { name: "916 黃金", price: formatTwdAmount(recycleFromQian(buy, RECYCLE_PURITY["916"])), unit: "台幣／錢", change: "22K" },
      { name: "750 黃金", price: formatTwdAmount(recycleFromQian(buy, RECYCLE_PURITY["750"])), unit: "台幣／錢", change: "18K" },
    ],
    note: page.note,
    connected: true,
  };
}

export function buildSectionView(section: SectionName, quotes: GlobalQuotes | null): SectionView {
  if (!quotes) return emptyView(section);
  const view = section === "international"
    ? internationalView(quotes)
    : section === "jewelry"
      ? jewelryView(quotes)
      : recyclingView(quotes);
  return view ?? emptyView(section);
}
