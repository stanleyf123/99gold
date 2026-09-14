import type { GlobalQuotes, MarketQuoteItem, MetalQuote } from "./quotes";

export const JEWELRY_SELL_PREMIUM_RATE = 0.04;
export const GRAMS_PER_QIAN = 3.75;
export const QIAN_PER_TAEL = 10;
export const RECYCLE_PURITY = {
  "999.9": 1,
  "916": 0.916,
  "750": 0.75,
} as const;
export const RECYCLE_WEIGHT_UNITS = ["qian", "gram", "tael"] as const;
export type RecycleWeightUnit = (typeof RECYCLE_WEIGHT_UNITS)[number];
export type RecyclePurityPreset = keyof typeof RECYCLE_PURITY | "custom";
export const WEIGHT_TO_QIAN: Record<RecycleWeightUnit, number> = {
  qian: 1,
  gram: 1 / GRAMS_PER_QIAN,
  tael: QIAN_PER_TAEL,
};

export const TROY_OUNCE_GRAMS = 31.1034768;

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

export function weightToQian(weight: number, unit: RecycleWeightUnit): number {
  return weight * WEIGHT_TO_QIAN[unit];
}

export function parseCustomPurityPercent(value: string): number | null {
  const percent = Number(String(value).replace(/,/g, "").trim());
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100) return null;
  return Math.round(percent * 1e4) / 1e6;
}

export function recycleEstimateTwd(
  buyQian: number,
  weight: number,
  unit: RecycleWeightUnit,
  purity: number,
): number | null {
  if (!Number.isFinite(buyQian) || buyQian <= 0) return null;
  if (!Number.isFinite(weight) || weight <= 0) return null;
  if (!Number.isFinite(purity) || purity <= 0 || purity > 1) return null;
  const qian = weightToQian(weight, unit);
  if (!Number.isFinite(qian) || qian <= 0) return null;
  return Math.round(recycleFromQian(buyQian, purity) * qian);
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
  const extras = jewelryLiveExtras(quotes);
  const buyChange = extras?.buyChange;
  const buyChangeLabel = buyChange == null
    ? (gold ? metalChange(gold) : (itemById(quotes.items, "taiwan-qian")?.change ?? "未含銀樓價差與費用"))
    : `${buyChange >= 0 ? "+" : "−"}${formatTwdAmount(Math.abs(buyChange))}${extras?.changePercent != null && Number.isFinite(extras.changePercent) ? `　${extras.changePercent >= 0 ? "+" : "−"}${Math.abs(extras.changePercent).toFixed(2)}%` : ""}`;
  const page = copy.jewelry;
  return {
    eyebrow: page.eyebrow,
    title: page.title,
    intro: page.intro,
    unit: "999.9 黃金賣出估計／台幣・錢",
    price: formatTwdAmount(sell),
    change: `估計溢價 ${(JEWELRY_SELL_PREMIUM_RATE * 100).toFixed(0)}%`,
    cards: [
      { name: "999.9 黃金買進", price: formatTwdAmount(buy), unit: "台幣／錢", change: buyChangeLabel },
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

export function usdTwdFromQuotes(quotes: GlobalQuotes | null | undefined): number | null {
  const rate = quotes?.currencies?.TWD;
  return typeof rate === "number" && Number.isFinite(rate) && rate > 0 ? rate : null;
}

export function qianFromUsdOz(usdPerOz: number, usdTwd: number): number {
  return Math.round(usdPerOz * usdTwd / TROY_OUNCE_GRAMS * GRAMS_PER_QIAN);
}

export type JewelryDayRow = {
  timestamp: number;
  buy: number;
  sell: number;
  change: number | null;
  recycleFine: number;
};

export type JewelryRange = {
  sellHigh: number;
  sellLow: number;
  sellAvg: number;
  buyHigh: number;
  buyLow: number;
  buyAvg: number;
  count: number;
};

export type JewelryLiveExtras = {
  buy: number;
  sell: number;
  buyChange: number | null;
  sellChange: number | null;
  changePercent: number | null;
  usdTwd: number | null;
};

export function jewelryHistoryRows(
  points: Array<{ timestamp: number; close: number }>,
  usdTwd: number,
): JewelryDayRow[] {
  if (!(usdTwd > 0) || points.length === 0) return [];
  const rows: JewelryDayRow[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    if (!Number.isFinite(point.close) || point.close <= 0) continue;
    const buy = qianFromUsdOz(point.close, usdTwd);
    const sell = jewelrySellFromBuy(buy);
    const previous = rows.at(-1);
    rows.push({
      timestamp: point.timestamp,
      buy,
      sell,
      change: previous ? sell - previous.sell : null,
      recycleFine: recycleFromQian(buy, RECYCLE_PURITY["999.9"]),
    });
  }
  return rows;
}

export function jewelryRangeFromRows(rows: JewelryDayRow[]): JewelryRange | null {
  if (rows.length === 0) return null;
  const sells = rows.map((row) => row.sell);
  const buys = rows.map((row) => row.buy);
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
  return {
    sellHigh: Math.max(...sells),
    sellLow: Math.min(...sells),
    sellAvg: Math.round(sum(sells) / sells.length),
    buyHigh: Math.max(...buys),
    buyLow: Math.min(...buys),
    buyAvg: Math.round(sum(buys) / buys.length),
    count: rows.length,
  };
}

export function jewelryLiveExtras(quotes: GlobalQuotes | null): JewelryLiveExtras | null {
  if (!quotes) return null;
  const buy = taiwanQianValue(quotes.items);
  const usdTwd = usdTwdFromQuotes(quotes);
  if (buy === null) return null;
  const sell = jewelrySellFromBuy(buy);
  const gold = quotes.metals.find((metal) => metal.id === "gold");
  const previousClose = gold && Number.isFinite(gold.previousClose) && (gold.previousClose as number) > 0
    ? gold.previousClose as number
    : null;
  const prevBuy = previousClose !== null && usdTwd !== null ? qianFromUsdOz(previousClose, usdTwd) : null;
  const prevSell = prevBuy !== null ? jewelrySellFromBuy(prevBuy) : null;
  const changePercent = gold && Number.isFinite(gold.changePercent) ? gold.changePercent : null;
  return {
    buy,
    sell,
    buyChange: prevBuy !== null ? buy - prevBuy : null,
    sellChange: prevSell !== null ? sell - prevSell : null,
    changePercent,
    usdTwd,
  };
}

export type JewelryFaqEntry = { question: string; answer: string };

export function jewelryFaqEntries(live: JewelryLiveExtras | null): JewelryFaqEntry[] {
  const buyText = live ? `${formatTwdAmount(live.buy)} 元／錢` : "見本頁上方即時數字";
  const sellText = live ? `${formatTwdAmount(live.sell)} 元／錢` : "見本頁上方即時數字";
  return [
    {
      question: "今天台灣黃金一錢多少錢？",
      answer: `本站今日理論買進約 ${buyText}，估計賣出約 ${sellText}。這是以 COMEX 黃金參考價乘上臺銀美元即期賣出後換算的理論值，不是某一家銀樓的成交牌價。`,
    },
    {
      question: "買進和賣出在本站分別代表什麼？",
      answer: "買進是 GC 黃金參考價與臺銀美元即期賣出換算後的理論成本，未含店家價差、工費與稅費。賣出是在該理論成本上加上 4% 估計溢價，方便對照銀樓常見賣出區間，並非店家牌告。",
    },
    {
      question: "為什麼跟銀樓掛牌不一樣？",
      answer: "銀樓會再加自己的買賣價差、成色認定、工費與庫存風險。本站只公開可驗證的國際金價與匯率換算，因此數字會與門市不同；實際買賣請向店家確認。",
    },
    {
      question: "回收價是怎麼估算的？",
      answer: "理論回收依台灣理論買進成本乘上成色比例（999.9、916、750）。未扣除檢測、耗損或手續費，也不能代表條塊或飾金的店家回收價。",
    },
    {
      question: "資料多久更新一次？",
      answer: "國際金價來源約每 3 分鐘檢查一次；臺銀匯率依牌告時間更新。市場休市時會保留最後有效行情，並標示休市狀態。",
    },
  ];
}
