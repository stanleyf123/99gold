"use client";

import Link from "next/link";
import { type Locale, t, useSiteLocale } from "../locale";
import { formatSignedTwdChange, formatTwdAmount, type JewelryBoard } from "../../lib/section-quotes";
import type { TaiwanGoldHistory } from "../../lib/taiwan-gold-history";

type SectionName = "international" | "jewelry" | "recycling";
type LiveCard = { name: string; price: string; unit: string; change: string };
type LiveView = {
  eyebrow: string;
  price: string;
  change: string;
  cards: LiveCard[];
  connected: boolean;
  unit: string;
  jewelry?: JewelryBoard;
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
      zh: "以國際黃金參考價與臺銀美元即期賣出換算台灣理論買進成本，並標示估計賣出溢價，方便對照銀樓區間。不是銀樓公會牌價。",
      en: "Taiwan theoretical buy cost from the international gold reference and Bank of Taiwan USD spot sell, plus an estimated sell premium for jewelry comparison. This is not a jewellers’ association board price.",
      ja: "国際金参考値と台湾銀行の米ドル直物売相場から台湾の理論買コストを換算し、店頭比較用の推定売プレミアムを示します。組合の掲示価格ではありません。",
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

const jewelryLearn = [
  {
    title: { zh: "買進", en: "Buy", ja: "買値" },
    body: {
      zh: "本站買進是 GC 國際黃金參考價乘上臺銀美元即期賣出後，換算成每錢的理論成本。未含銀樓價差、工費與稅費，也不是店家向你買入的價格。",
      en: "Buy is the theoretical cost per qian from the GC gold reference times Bank of Taiwan’s USD spot-sell rate. It excludes dealer spread, workmanship and tax, and is not a shop bid.",
      ja: "買値はGCの国際金参考値に台湾銀行の米ドル直物売りを掛け、銭あたりの理論コストへ換算した値です。店頭スプレッド、加工費、税は含まず、店舗の買取価格でもありません。",
    },
  },
  {
    title: { zh: "賣出", en: "Sell", ja: "売値" },
    body: {
      zh: "賣出是在理論買進上加估計 4% 溢價的參考值，方便對照門市常見加價區間。這不是店家牌價，也不能當成可成交報價。",
      en: "Sell adds an estimated 4% premium to theoretical buy, as a comparison band for retail jewelry. It is not a posted shop price and is not executable.",
      ja: "売値は理論買に推定4%プレミアムを加えた参考値で、店頭の上乗せ幅を照らすためのものです。掲示価格でも約定可能な提示でもありません。",
    },
  },
  {
    title: { zh: "回收", en: "Recycle", ja: "買取" },
    body: {
      zh: "回收欄依理論買進成本乘成色（999.9、916、750）估算舊金大約價值，未扣檢測、耗損與手續費。實際回收以店家秤重與鑑定為準。",
      en: "Recycle columns scale theoretical buy by purity (999.9, 916, 750). Testing, melt loss and fees are not deducted; shops confirm weight and assay.",
      ja: "買取欄は理論買に成色（999.9・916・750）を掛けた概算です。鑑定、減耗、手数料は含みません。計量と鑑定は店舗が確定します。",
    },
  },
] as const;

const jewelryFaq = [
  {
    q: { zh: "這是銀樓公會牌價嗎？", en: "Is this a jewellers’ association board price?", ja: "金店組合の掲示価格ですか？" },
    a: { zh: "不是。本站是用國際黃金參考價與臺銀美元即期賣出算出的理論參考，方便比較，實際成交以店家為準。", en: "No. These are theoretical references from an international gold quote and Bank of Taiwan USD spot-sell, for comparison only. Deal at the shop.", ja: "いいえ。国際金参考値と台湾銀行の米ドル直物売りから出した理論参考値であり、実際の取引は店舗が基準です。" },
  },
  {
    q: { zh: "買進和賣出為什麼不一樣？", en: "Why are buy and sell different?", ja: "買値と売値が違うのはなぜ？" },
    a: { zh: "買進是理論成本；賣出是我們標示的估計溢價參考。銀樓另有工費、成色與品牌差價，門市買賣價差通常更大。", en: "Buy is theoretical cost; sell is our labeled estimated premium. Shops also add workmanship, purity and brand spreads, often wider than 4%.", ja: "買値は理論コスト、売値は本サイトが示す推定プレミアムです。店舗は加工費、成色、ブランド差を上乗せし、幅は4%より大きいことがよくあります。" },
  },
  {
    q: { zh: "回收價為什麼通常低於賣出價？", en: "Why is recycle usually below sell?", ja: "買取が売値より低いのはなぜ？" },
    a: { zh: "回收依含金量估算，店家還要負擔檢測、熔煉與價差。本站回收欄是理論含金量，不是收購承諾。", en: "Recycle estimates fine-gold content; shops still fund testing, melting and spread. Our recycle column is not a purchase offer.", ja: "買取は含有量の概算で、店舗は鑑定・溶解・スプレッドも負担します。本サイトの買取欄は買取約束ではありません。" },
  },
  {
    q: { zh: "數字多久更新一次？", en: "How often do the numbers update?", ja: "数値はどのくらいの頻度で更新されますか？" },
    a: { zh: "行情來源約每 3 分鐘檢查一次；休市時會保留最後有效參考，並標示市場狀態。", en: "Sources are checked about every 3 minutes. While markets are closed, the last valid reference is held and status is labeled.", ja: "情報源は約3分ごとに確認します。休場中は最後の有効参考値を保持し、市場状態を表示します。" },
  },
  {
    q: { zh: "可以當作成交價或投資建議嗎？", en: "Can I treat this as a trade price or advice?", ja: "約定価格や投資助言として使えますか？" },
    a: { zh: "不可以。所有數字僅供參考，不構成投資、買賣或回收建議。", en: "No. All figures are indicative only and are not investment, purchase or recycle advice.", ja: "いいえ。数値は参考情報であり、投資・売買・買取の助言ではありません。" },
  },
] as const;

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
  taiwanHistory = null,
}: {
  section: SectionName;
  view: LiveView;
  quotedAt: string;
  retrievedAt: string;
  marketStatus?: MarketStatus;
  source?: string;
  taiwanHistory?: TaiwanGoldHistory | null;
}) {
  const { locale } = useSiteLocale();
  const copy = chrome[section];
  const quotedLabel = formatTaipeiTime(quotedAt, locale);
  const checkLabel = formatTaipeiTime(retrievedAt, locale);
  const intro = view.connected ? copy.intro[locale] : copy.emptyIntro[locale];
  const note = source ? `${copy.note[locale]} ${t(locale, "資料來源：", "Source: ", "データ元：")}${source}` : copy.note[locale];
  const jewelry = view.jewelry;
  const range = taiwanHistory?.range ?? null;
  const liveSell = jewelry?.sell;
  const rangePosition = range && liveSell && range.high > range.low
    ? Math.max(0, Math.min(100, ((liveSell - range.low) / (range.high - range.low)) * 100))
    : Number.NaN;
  const sellDelta = jewelry ? formatSignedTwdChange(jewelry.sellChange, jewelry.changePercent) : "";
  const buyDelta = jewelry ? formatSignedTwdChange(jewelry.buyChange, jewelry.changePercent) : "";
  const historyNote = taiwanHistory
    ? taiwanHistory.fxMode === "daily"
      ? t(locale, "近 30 個交易日以 GC 收盤與當日 USD/TWD 換算；漲跌為賣出估計對前一交易日。匯率日期與期貨交易日可能差一天。", "Last 30 sessions convert GC closes with same-day USD/TWD. Change is estimated sell vs the prior session. FX and futures dates can differ by a day.", "直近30セッションはGC終値と当日USD/TWDで換算。騰落は推定売値の前日比です。為替日と先物取引日は1日ずれる場合があります。")
      : t(locale, "近 30 個交易日的金價來自 GC 日線，匯率則採最新可用 USD/TWD，因此不是完整的逐日台幣牌價。", "The last 30 sessions use GC daily closes with the latest available USD/TWD, so this is not a full day-by-day TWD board.", "直近30セッションの金価格はGC日足、為替は最新のUSD/TWDのため、逐日の台湾ドル掲示価格ではありません。")
    : t(locale, "目前沒有可驗證的日線歷史，因此不列出近月高低或逐日表，避免估造數字。", "No verified daily history is available, so no monthly range or daily table is shown.", "検証可能な日足履歴がないため、月次レンジや日次表は表示しません。");
  const faqSchema = section === "jewelry"
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: jewelryFaq.map((item) => ({
          "@type": "Question",
          name: item.q.zh,
          acceptedAnswer: { "@type": "Answer", text: item.a.zh },
        })),
      }
    : null;

  return (
    <main className={`subpage${section === "jewelry" ? " jewelryPage" : ""}`} lang={locale === "zh" ? "zh-Hant" : locale}>
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}
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
        {section === "jewelry" && jewelry && view.connected ? (
          <>
            <div className="jewelryHeroBoard">
              <article>
                <span>{t(locale, "今日賣出估計", "Today’s estimated sell", "本日の推定売値")}</span>
                <strong>NT$ {formatTwdAmount(jewelry.sell)}</strong>
                <small>{t(locale, "台幣／錢 · 理論買進 × 4%", "TWD / qian · theoretical buy × 4%", "台湾ドル／銭 · 理論買×4%")}</small>
                <b className={jewelry.sellChange === null ? "neutral" : jewelry.sellChange >= 0 ? "up" : "down"}>
                  {sellDelta || t(locale, "尚無前收比較", "No previous-close comparison", "前日終値比較なし")}
                </b>
              </article>
              <article>
                <span>{t(locale, "今日買進成本", "Today’s buy cost", "本日の買コスト")}</span>
                <strong>NT$ {formatTwdAmount(jewelry.buy)}</strong>
                <small>{t(locale, "台幣／錢 · GC × 臺銀即期賣出", "TWD / qian · GC × BOT spot sell", "台湾ドル／銭 · GC×台湾銀行直物売り")}</small>
                <b className={jewelry.buyChange === null ? "neutral" : jewelry.buyChange >= 0 ? "up" : "down"}>
                  {buyDelta || t(locale, "尚無前收比較", "No previous-close comparison", "前日終値比較なし")}
                </b>
              </article>
            </div>
            {range ? (
              <div className="jewelryRange">
                <div>
                  <span>{t(locale, `近 ${range.count} 個交易日賣出估計`, `Estimated sell · ${range.count} sessions`, `推定売値 · ${range.count}セッション`)}</span>
                  <strong>{Number.isFinite(rangePosition) ? `${rangePosition.toFixed(0)}%` : "—"}</strong>
                </div>
                <div className="dayRangeTrack" aria-hidden="true"><i style={{ width: `${Number.isFinite(rangePosition) ? rangePosition : 0}%` }} /></div>
                <dl>
                  <div><dt>{t(locale, "最低", "Low", "安値")}</dt><dd>NT$ {formatTwdAmount(range.low)}</dd></div>
                  <div><dt>{t(locale, "平均", "Average", "平均")}</dt><dd>NT$ {formatTwdAmount(range.average)}</dd></div>
                  <div><dt>{t(locale, "最高", "High", "高値")}</dt><dd>NT$ {formatTwdAmount(range.high)}</dd></div>
                </dl>
              </div>
            ) : null}
            {jewelry.fxHeldConstant ? (
              <p className="jewelryHeroNote">{t(locale, "漲跌相對前收金價、匯率採最新臺銀即期賣出，不是店家隔日牌價。", "Change is versus the previous gold close with the latest BOT USD rate, not a shop’s next-day board.", "騰落は金の前日終値比で、為替は最新の台湾銀行直物売りです。店舗の翌日掲示ではありません。")}</p>
            ) : null}
          </>
        ) : (
          <div className="subStat">
            <span>{localize(locale, view.unit) || copy.unit[locale]}</span>
            <strong>{view.price}</strong>
            <b>{localize(locale, view.change)}</b>
          </div>
        )}
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
            <b className={card.change.includes("▲") ? "up" : card.change.includes("▼") ? "down" : undefined}>{localize(locale, card.change)}</b>
          </article>
        ))}</div>

        {section === "jewelry" && jewelry && view.connected ? (
          <div className="subCards jewelryRecycleCards">
            <article>
              <p>{t(locale, "999.9 回收參考", "999.9 recycle reference", "999.9 買取参考")}</p>
              <strong>{formatTwdAmount(jewelry.recycleFine)}</strong>
              <span>{t(locale, "台幣／錢 · 理論含金量", "TWD / qian · theoretical fine gold", "台湾ドル／銭 · 理論含有量")}</span>
              <b>{t(locale, "未扣檢測與耗損", "Excludes testing and melt loss", "鑑定・減耗は含まず")}</b>
            </article>
            <article>
              <p>{t(locale, "916 回收參考", "916 recycle reference", "916 買取参考")}</p>
              <strong>{formatTwdAmount(jewelry.recycle916)}</strong>
              <span>{t(locale, "台幣／錢 · 22K", "TWD / qian · 22K", "台湾ドル／銭 · 22K")}</span>
              <b>{t(locale, "成色 91.6%", "91.6% purity", "成色 91.6%")}</b>
            </article>
            <article>
              <p>{t(locale, "750 回收參考", "750 recycle reference", "750 買取参考")}</p>
              <strong>{formatTwdAmount(jewelry.recycle750)}</strong>
              <span>{t(locale, "台幣／錢 · 18K", "TWD / qian · 18K", "台湾ドル／銭 · 18K")}</span>
              <b>{t(locale, "成色 75%", "75% purity", "成色 75%")}</b>
            </article>
          </div>
        ) : null}

        {section === "jewelry" ? (
          <>
            <div className="sectionHead jewelryHistoryHead">
              <div>
                <p className="eyebrow">DAILY REFERENCE TABLE</p>
                <h2>{t(locale, "近日理論金價", "Recent theoretical prices", "最近の理論価格")}</h2>
              </div>
              <p>{taiwanHistory?.source ?? historyNote}</p>
            </div>
            {taiwanHistory?.days.length ? (
              <div className="proQuoteTableScroll jewelryTableScroll">
                <table className="proQuoteTable jewelryPriceTable">
                  <caption className="srOnly">{t(locale, "台灣理論金價近日資料表", "Recent Taiwan theoretical gold price table", "台湾理論金価格の最近データ")}</caption>
                  <thead>
                    <tr>
                      <th>{t(locale, "日期", "Date", "日付")}</th>
                      <th>{t(locale, "賣出估計", "Est. sell", "売値推定")}</th>
                      <th>{t(locale, "買進", "Buy", "買値")}</th>
                      <th>{t(locale, "漲跌", "Change", "騰落")}</th>
                      <th>{t(locale, "999.9 回收", "999.9 recycle", "999.9 買取")}</th>
                      <th>{t(locale, "916 回收", "916 recycle", "916 買取")}</th>
                      <th>{t(locale, "750 回收", "750 recycle", "750 買取")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taiwanHistory.days.map((day) => {
                      const delta = formatSignedTwdChange(day.changeQian, day.changePercent);
                      return (
                        <tr key={`${day.date}-${day.timestamp}`}>
                          <td>
                            <time dateTime={day.date}>{day.date}</time>
                            {!day.fxPaired && <span>{t(locale, "匯率沿用", "FX carried forward", "為替を据え置き")}</span>}
                          </td>
                          <td>{formatTwdAmount(day.sellQian)}</td>
                          <td>{formatTwdAmount(day.buyQian)}</td>
                          <td><b className={day.changeQian === null ? undefined : day.changeQian >= 0 ? "up" : "down"}>{delta || "—"}</b></td>
                          <td>{formatTwdAmount(day.recycleFine)}</td>
                          <td>{formatTwdAmount(day.recycle916)}</td>
                          <td>{formatTwdAmount(day.recycle750)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="jewelryHistoryEmpty">{historyNote}</p>
            )}
            <p className="quoteMethodology"><b>{t(locale, "歷史表說明：", "Table note: ", "表の注記：")}</b>{historyNote}</p>

            <div className="sectionHead">
              <div>
                <p className="eyebrow">HOW TO READ THE BOARD</p>
                <h2>{t(locale, "怎麼看買進、賣出與回收", "How to read buy, sell and recycle", "買値・売値・買取の見方")}</h2>
              </div>
            </div>
            <div className="jewelryLearn">
              {jewelryLearn.map((item) => (
                <article key={item.title.zh}>
                  <h3>{item.title[locale]}</h3>
                  <p>{item.body[locale]}</p>
                </article>
              ))}
            </div>

            <div className="sectionHead">
              <div>
                <p className="eyebrow">FAQ</p>
                <h2>{t(locale, "常見問題", "Frequently asked questions", "よくある質問")}</h2>
              </div>
            </div>
            <div className="jewelryFaq">
              {jewelryFaq.map((item) => (
                <details key={item.q.zh}>
                  <summary>{item.q[locale]}</summary>
                  <p>{item.a[locale]}</p>
                </details>
              ))}
            </div>
          </>
        ) : null}

        <div className="guide">
          <span>{t(locale, "玖久黃金報價網提示", "99GOLD.NET note", "99GOLD.NETからのご案内")}</span>
          <p>{note}</p>
          <Link href="/#quotes">{t(locale, "回到即時報價　→", "Back to live quotes →", "即時相場へ戻る →")}</Link>
        </div>
        {section === "jewelry" ? (
          <p className="jewelryDisclaimer">
            {t(
              locale,
              "資料來源：國際黃金參考（優先 Yahoo Finance GC）與臺灣銀行美元即期賣出或標示的匯率備援。數字僅供參考，非店家成交價，亦非銀樓公會牌價。",
              "Source: international gold reference (Yahoo Finance GC first) and Bank of Taiwan USD spot-sell or a labeled FX fallback. Figures are indicative only—not shop fills and not an association board.",
              "データ元：国際金参考（Yahoo Finance GC優先）と台湾銀行米ドル直物売り、または明示した為替予備。数値は参考のみで、店舗の約定価格でも組合掲示価格でもありません。",
            )}
          </p>
        ) : null}
      </section>
      <footer>
        <Link className="brand" href="/"><i>99</i><span>玖久黃金報價網<br/><em>99GOLD.NET</em></span></Link>
        <p>{t(locale, "真金價值，長久相伴。", "True gold value, lasting companionship.", "真金の価値を、長く寄り添う。")}</p>
        <span>© 2026 玖久黃金報價網</span>
      </footer>
    </main>
  );
}

