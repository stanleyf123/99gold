"use client";

import Link from "next/link";
import { type Locale, t, useSiteLocale } from "../locale";

type SectionName = "international" | "jewelry" | "recycling";
type LiveCard = { name: string; price: string; unit: string; change: string };
type LiveView = {
  eyebrow: string;
  price: string;
  change: string;
  cards: LiveCard[];
  connected: boolean;
  unit: string;
};
type MarketStatus = "checking" | "open" | "delayed" | "daily-break" | "weekend-closed" | "unavailable";

const chrome = {
  international: {
    title: { zh: "國際金價", en: "International Gold", ja: "国際金価格" },
    intro: {
      zh: "追蹤 COMEX 黃金期貨與主要貴金屬的盤中參考報價，單位為美元／金衡盎司。",
      en: "Follow COMEX gold futures and key metals as USD / troy ounce references.",
      ja: "COMEX金先物と主要貴金属の日中参考相場（米ドル／トロイオンス）を追います。",
    },
    emptyIntro: {
      zh: "目前沒有可驗證的國際貴金屬行情。請稍後再試，或至首頁查看來源狀態。",
      en: "No verified international metal quotes right now. Try again later, or check source status on the homepage.",
      ja: "現在、検証可能な国際貴金属相場はありません。しばらくしてから再試行するか、ホームページで情報源の状態をご確認ください。",
    },
    unit: { zh: "美元／盎司（USD/oz）", en: "USD / oz", ja: "米ドル／オンス" },
    note: {
      zh: "價格以 Yahoo Finance 貴金屬期貨為參考（USD/oz）；來源受限時可能改列公開現貨參考。盤中價格可能快速變動，不構成可成交牌告。",
      en: "Prices reference Yahoo Finance metal futures (USD/oz). If limited, the site may switch to a public spot reference. Intraday prices can move quickly and are not executable quotes.",
      ja: "価格はYahoo Financeの貴金属先物（USD/oz）を参考にします。制限時は公開現物参考値へ切り替える場合があります。日中は大きく変動し、約定可能な提示ではありません。",
    },
  },
  jewelry: {
    title: { zh: "今日銀樓價格", en: "Today’s Jewelry Prices", ja: "本日の店頭価格" },
    intro: {
      zh: "以國際黃金參考價與臺銀美元即期賣出換算台灣理論買進成本，並標示估計賣出溢價，方便對照銀樓區間。",
      en: "Taiwan theoretical buy cost from the international gold reference and Bank of Taiwan USD spot sell, plus an estimated sell premium for jewelry comparison.",
      ja: "国際金参考値と台湾銀行の米ドル直物売相場から台湾の理論買コストを換算し、店頭比較用の推定売プレミアムを示します。",
    },
    emptyIntro: {
      zh: "台灣換算所需的國際金價或匯率暫時無法連線，因此不顯示銀樓參考數字。",
      en: "The international gold or FX feed needed for Taiwan conversion is unavailable, so no jewelry figures are shown.",
      ja: "台湾換算に必要な国際金価格または為替に接続できないため、店頭参考値は表示しません。",
    },
    unit: { zh: "999.9 黃金賣出估計／台幣・錢", en: "999.9 gold estimated sell / TWD · qian", ja: "999.9 金 売値推定／台湾ドル・銭" },
    note: {
      zh: "買進為 GC×臺銀即期賣出的理論成本，未含銀樓價差與費用。賣出為估計溢價 4% 的參考值，實際門市牌價、工費與品牌溢價請向店家確認。",
      en: "Buy is the theoretical GC × Bank of Taiwan spot-sell cost, excluding dealer spread and fees. Sell is a 4% estimated premium, not a shop board price.",
      ja: "買値はGC×台湾銀行直物売りの理論コストで、店頭スプレッドと費用は含みません。売値は推定4%プレミアムの参考値です。",
    },
  },
  recycling: {
    title: { zh: "黃金回收", en: "Gold Recycling", ja: "金の買取" },
    intro: {
      zh: "以台灣理論買進成本依成色比例估算舊金飾回收參考，協助你評估 999.9、916 與 750 的大約價值。",
      en: "Estimate recycle value from the Taiwan theoretical buy cost by purity, for 999.9, 916 and 750 gold.",
      ja: "台湾の理論買コストを成色比率で換算し、999.9・916・750の買取参考値を示します。",
    },
    emptyIntro: {
      zh: "台灣換算所需的國際金價或匯率暫時無法連線，因此不顯示回收參考數字。",
      en: "The international gold or FX feed needed for Taiwan conversion is unavailable, so no recycle figures are shown.",
      ja: "台湾換算に必要な国際金価格または為替に接続できないため、買取参考値は表示しません。",
    },
    unit: { zh: "999.9 黃金參考回收／台幣・錢", en: "999.9 gold recycle reference / TWD · qian", ja: "999.9 金 買取参考／台湾ドル・銭" },
    note: {
      zh: "回收參考依台灣理論買進成本與成色比例估算，未扣除檢測、耗損與手續費。實際回收請向店家確認秤重、純度與是否另扣費用，並建議攜帶身分證件。",
      en: "Recycle figures use theoretical buy cost and purity, excluding testing, loss and fees. Confirm weight, purity and deductions in store, and bring ID.",
      ja: "買取参考は理論買コストと成色比率で、鑑定・減耗・手数料は含みません。計量、純度、控除は店舗で確認し、身分証明書をご持参ください。",
    },
  },
} as const;

const phrase = {
  zh: {} as Record<string, string>,
  en: {
    "美元／盎司": "USD / oz",
    "美元／盎司（USD/oz）": "USD / oz",
    "台幣／錢": "TWD / qian",
    "台幣／公克": "TWD / gram",
    "新台幣／錢": "TWD / qian",
    "新台幣／公克": "TWD / gram",
    "尚無有效資料": "No valid data",
    "有效參考價": "Valid reference",
    "行情暫不可用": "Quote unavailable",
    "市場交易中": "MARKET OPEN",
    "每日休市 · 最後有效行情": "DAILY BREAK · LAST VALID QUOTE",
    "週末休市 · 最後有效行情": "WEEKEND CLOSED · LAST VALID QUOTE",
    "行情可能延遲 · 自動重試": "QUOTE MAY BE DELAYED · RETRYING",
    "行情狀態無法確認": "MARKET STATUS UNAVAILABLE",
    "估計溢價 4%": "Est. 4% premium",
    "估計溢價 4%（非店家牌價）": "Est. 4% premium (not a shop price)",
    "未含銀樓價差與費用": "Excludes dealer spread and fees",
    "理論含金量參考": "Theoretical fine-gold reference",
    "高純度": "Fine gold",
    "理論買進": "Theoretical buy",
    "換算來源": "Conversion source",
    "999.9 黃金買進": "999.9 gold buy",
    "999.9 黃金賣出估計": "999.9 gold estimated sell",
    "黃金每公克": "Gold per gram",
    "999.9 純金": "999.9 fine gold",
    "916 黃金": "916 gold",
    "750 黃金": "750 gold",
    "黃金期貨": "Gold futures",
    "白銀期貨": "Silver futures",
    "鉑金期貨": "Platinum futures",
    "鈀金期貨": "Palladium futures",
    "黃金現貨參考": "Gold spot reference",
    "白銀現貨參考": "Silver spot reference",
    "鉑金現貨參考": "Platinum spot reference",
    "鈀金現貨參考": "Palladium spot reference",
    "紐約黃金期貨 GC=F": "New York gold futures GC=F",
    "國際白銀 SI=F": "International silver SI=F",
    "鉑金 PL=F": "Platinum PL=F",
  },
  ja: {
    "美元／盎司": "米ドル／オンス",
    "美元／盎司（USD/oz）": "米ドル／オンス",
    "台幣／錢": "台湾ドル／銭",
    "台幣／公克": "台湾ドル／グラム",
    "新台幣／錢": "台湾ドル／銭",
    "新台幣／公克": "台湾ドル／グラム",
    "尚無有效資料": "有効なデータなし",
    "有效參考價": "有効な参考値",
    "行情暫不可用": "相場データなし",
    "市場交易中": "市場取引中",
    "每日休市 · 最後有效行情": "日次休場・最終有効値",
    "週末休市 · 最後有效行情": "週末休場・最終有効値",
    "行情可能延遲 · 自動重試": "相場遅延の可能性・再試行中",
    "行情狀態無法確認": "相場状態を確認できません",
    "估計溢價 4%": "推定プレミアム 4%",
    "估計溢價 4%（非店家牌價）": "推定プレミアム 4%（店頭価格ではありません）",
    "未含銀樓價差與費用": "店頭スプレッド・費用含まず",
    "理論含金量參考": "理論含有量の参考",
    "高純度": "高純度",
    "理論買進": "理論買",
    "換算來源": "換算ソース",
    "999.9 黃金買進": "999.9 金 買値",
    "999.9 黃金賣出估計": "999.9 金 売値推定",
    "黃金每公克": "グラムあたりの金",
    "999.9 純金": "999.9 純金",
    "916 黃金": "916 金",
    "750 黃金": "750 金",
    "黃金期貨": "金先物",
    "白銀期貨": "銀先物",
    "鉑金期貨": "プラチナ先物",
    "鈀金期貨": "パラジウム先物",
    "黃金現貨參考": "金現物参考",
    "白銀現貨參考": "銀現物参考",
    "鉑金現貨參考": "プラチナ現物参考",
    "鈀金現貨參考": "パラジウム現物参考",
    "紐約黃金期貨 GC=F": "ニューヨーク金先物 GC=F",
    "國際白銀 SI=F": "国際銀 SI=F",
    "鉑金 PL=F": "プラチナ PL=F",
  },
} as const;

function localize(locale: Locale, value: string) {
  if (locale === "zh" || !value) return value;
  const table = phrase[locale];
  if (value in table) return table[value as keyof typeof table];
  return value.replace(/黃金期貨|白銀期貨|鉑金期貨|鈀金期貨|黃金現貨參考|白銀現貨參考|鉑金現貨參考|鈀金現貨參考/g, (match) => table[match as keyof typeof table] ?? match);
}

function formatTaipeiTime(value: string, locale: Locale) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return t(locale, "取得中", "Checking", "確認中");
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-TW" : locale === "ja" ? "ja-JP" : "en-GB", {
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

function statusLabel(locale: Locale, connected: boolean, status?: MarketStatus) {
  if (!connected) return t(locale, "行情暫不可用", "Quote unavailable", "相場データなし");
  if (status === "open") return t(locale, "市場交易中", "MARKET OPEN", "市場取引中");
  if (status === "daily-break") return t(locale, "每日休市 · 最後有效行情", "DAILY BREAK · LAST VALID QUOTE", "日次休場・最終有効値");
  if (status === "weekend-closed") return t(locale, "週末休市 · 最後有效行情", "WEEKEND CLOSED · LAST VALID QUOTE", "週末休場・最終有効値");
  if (status === "delayed") return t(locale, "行情可能延遲 · 自動重試", "QUOTE MAY BE DELAYED · RETRYING", "相場遅延の可能性・再試行中");
  return t(locale, "行情狀態無法確認", "MARKET STATUS UNAVAILABLE", "相場状態を確認できません");
}

export default function SectionView({
  section,
  view,
  quotedAt,
  retrievedAt,
  marketStatus,
  source,
}: {
  section: SectionName;
  view: LiveView;
  quotedAt: string;
  retrievedAt: string;
  marketStatus?: MarketStatus;
  source?: string;
}) {
  const { locale } = useSiteLocale();
  const copy = chrome[section];
  const quotedLabel = formatTaipeiTime(quotedAt, locale);
  const checkLabel = formatTaipeiTime(retrievedAt, locale);
  const intro = view.connected ? copy.intro[locale] : copy.emptyIntro[locale];
  const note = source ? `${copy.note[locale]} ${t(locale, "資料來源：", "Source: ", "データ元：")}${source}` : copy.note[locale];

  return (
    <main className="subpage" lang={locale === "zh" ? "zh-Hant" : locale}>
      <div className="topline">
        <span>{statusLabel(locale, view.connected, marketStatus)}</span>
        <span>
          {view.connected
            ? `${t(locale, "行情時間", "Quote time", "相場時刻")} ${quotedLabel} · ${t(locale, "本站檢查", "Site check", "サイト確認")} ${checkLabel} (GMT+8)`
            : t(locale, "未連接有效行情時不顯示數字", "No figures are shown without a valid quote feed", "有効な相場がない場合は数値を表示しません")}
        </span>
      </div>
      <section className="subHero">
        <p className="eyebrow">{view.eyebrow}</p>
        <h1>{copy.title[locale]}</h1>
        <p>{intro}</p>
        <div className="subStat">
          <span>{localize(locale, view.unit) || copy.unit[locale]}</span>
          <strong>{view.price}</strong>
          <b>{localize(locale, view.change)}</b>
        </div>
      </section>
      <section className="subContent">
        <div className="sectionHead">
          <div><p className="eyebrow">TODAY&apos;S REFERENCE</p><h2>{t(locale, "重點數據", "Key figures", "注目データ")}</h2></div>
          <p>
            {view.connected
              ? `${t(locale, "行情時間", "Quote time", "相場時刻")} ${quotedLabel}（GMT+8）`
              : t(locale, "最後更新時間以頁面顯示為準。", "Treat the time shown on this page as the latest update.", "最終更新時刻はページ表示に従ってください。")}
          </p>
        </div>
        <div className="subCards">{view.cards.map((card) => (
          <article key={card.name}>
            <p>{localize(locale, card.name)}</p>
            <strong>{card.price}</strong>
            <span>{localize(locale, card.unit)}</span>
            <b>{localize(locale, card.change)}</b>
          </article>
        ))}</div>
        <div className="guide">
          <span>{t(locale, "玖久黃金報價網提示", "99GOLD.NET note", "99GOLD.NETからのご案内")}</span>
          <p>{note}</p>
          <Link href="/#quotes">{t(locale, "回到即時報價　→", "Back to live quotes →", "即時相場へ戻る →")}</Link>
        </div>
      </section>
      <footer>
        <Link className="brand" href="/"><i>99</i><span>玖久黃金報價網<br/><em>99GOLD.NET</em></span></Link>
        <p>{t(locale, "真金價值，長久相伴。", "True gold value, lasting companionship.", "真金の価値を、長く寄り添う。")}</p>
        <span>© 2026 玖久黃金報價網</span>
      </footer>
    </main>
  );
}
