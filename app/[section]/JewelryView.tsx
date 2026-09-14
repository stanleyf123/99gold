"use client";

import Link from "next/link";
import SiteLinks from "../SiteLinks";
import PriceHistoryChart from "../PriceHistoryChart";
import { type Locale, t, useSiteLocale } from "../locale";
import "./jewelry.css";

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
type JewelryDayRow = {
  timestamp: number;
  buy: number;
  sell: number;
  change: number | null;
  recycleFine: number;
  usdTwd?: number;
  fxDate?: string | null;
  fxSource?: string | null;
};
type JewelryRange = { sellHigh: number; sellLow: number; sellAvg: number; buyHigh: number; buyLow: number; buyAvg: number; count: number };
type JewelryLive = {
  buy: number;
  sell: number;
  buyChange: number | null;
  sellChange: number | null;
  changePercent: number | null;
  usdTwd: number | null;
};

const phrase: Record<Exclude<Locale, "zh">, Record<string, string>> = {
  en: {
    "尚無有效資料": "No valid data",
    "有效參考價": "Valid reference",
    "未含銀樓價差與費用": "Excludes dealer spread and fees",
    "估計溢價 4%（非店家牌價）": "Est. 4% premium (not a shop price)",
    "999.9 黃金買進": "999.9 gold buy",
    "999.9 黃金賣出估計": "999.9 gold estimated sell",
    "黃金每公克": "Gold per gram",
    "台幣／錢": "TWD / qian",
    "台幣／公克": "TWD / gram",
    "新台幣／錢": "TWD / qian",
    "新台幣／公克": "TWD / gram",
  },
  ja: {
    "尚無有效資料": "有効なデータなし",
    "有效參考價": "有効な参考値",
    "未含銀樓價差與費用": "店頭スプレッド・費用含まず",
    "估計溢價 4%（非店家牌價）": "推定プレミアム 4%（店頭価格ではありません）",
    "999.9 黃金買進": "999.9 金 買値",
    "999.9 黃金賣出估計": "999.9 金 売値推定",
    "黃金每公克": "グラムあたりの金",
    "台幣／錢": "台湾ドル／銭",
    "台幣／公克": "台湾ドル／グラム",
    "新台幣／錢": "台湾ドル／銭",
    "新台幣／公克": "台湾ドル／グラム",
  },
};

function localize(locale: Locale, value: string) {
  if (locale === "zh" || !value) return value;
  return phrase[locale][value] ?? value;
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

function formatDate(timestamp: number, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-TW" : locale === "ja" ? "ja-JP" : "en-US", {
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    timeZone: "Asia/Taipei",
  }).format(new Date(timestamp * 1000));
}

function statusLabel(locale: Locale, connected: boolean, status?: MarketStatus) {
  if (!connected) return t(locale, "行情暫不可用", "Quote unavailable", "相場データなし");
  if (status === "open") return t(locale, "市場交易中", "MARKET OPEN", "市場取引中");
  if (status === "daily-break") return t(locale, "每日休市 · 最後有效行情", "DAILY BREAK · LAST VALID QUOTE", "日次休場・最終有効値");
  if (status === "weekend-closed") return t(locale, "週末休市 · 最後有效行情", "WEEKEND CLOSED · LAST VALID QUOTE", "週末休場・最終有効値");
  if (status === "delayed") return t(locale, "行情可能延遲 · 自動重試", "QUOTE MAY BE DELAYED · RETRYING", "相場遅延の可能性・再試行中");
  return t(locale, "行情狀態無法確認", "MARKET STATUS UNAVAILABLE", "相場状態を確認できません");
}

function money(value: number) {
  return Math.round(value).toLocaleString("en-US");
}

function changeLabel(locale: Locale, amount: number | null, percent: number | null) {
  if (amount === null || !Number.isFinite(amount)) return t(locale, "尚無前一日可比較資料", "No prior-day comparison", "前日比較なし");
  const arrow = amount > 0 ? "▲" : amount < 0 ? "▼" : "•";
  const signed = `${amount > 0 ? "+" : amount < 0 ? "−" : ""}${money(Math.abs(amount))}`;
  const pct = percent !== null && Number.isFinite(percent)
    ? `　${percent >= 0 ? "+" : "−"}${Math.abs(percent).toFixed(2)}%`
    : "";
  return `${arrow} ${signed}${pct}`;
}

const educate = {
  buy: {
    title: { zh: "買進：理論成本", en: "Buy: theoretical cost", ja: "買：理論コスト" },
    body: {
      zh: "本站「買進」是把國際黃金參考價（優先 GC 期貨）乘上臺銀美元即期賣出，再換成台灣常用的「錢」。它接近持有純金的理論成本，還沒有銀樓價差、工費或稅費。",
      en: "Buy is the international gold reference (GC first) times Bank of Taiwan’s USD spot-sell rate, converted into Taiwan’s qian. It is a theoretical fine-gold cost, before dealer spread, workmanship or tax.",
      ja: "「買」は国際金参考値（GC優先）に台湾銀行の米ドル直物売りを掛け、台湾の銭に換算した理論コストです。店頭スプレッド、加工費、税金は含みません。",
    },
  },
  sell: {
    title: { zh: "賣出：估計溢價", en: "Sell: estimated premium", ja: "売：推定プレミアム" },
    body: {
      zh: "「賣出」在理論買進上加 4% 估計溢價，用來對照銀樓常見賣出區間。這不是店家牌告，也不保證買得到這個價格。",
      en: "Sell adds a 4% estimated premium to theoretical buy so you can compare typical jewelry-shop ask ranges. It is not a posted board price and is not executable.",
      ja: "「売」は理論買に推定4%プレミアムを加えた参考値で、店頭の売値帯を对照しやすくします。掲示価格でも約定可能な提示でもありません。",
    },
  },
  recycle: {
    title: { zh: "回收：成色比例", en: "Recycle: purity ratio", ja: "買取：成色比率" },
    body: {
      zh: "理論回收 = 買進 × 成色（999.9、916、750）。表格的回收欄是 999.9 含金量，未扣檢測、耗損或手續費，也不是條塊／飾金店家價。",
      en: "Theoretical recycle = buy × purity (999.9, 916, 750). The table column is 999.9 fine-gold content and excludes testing, loss and fees. It is not a bar or jewelry shop bid.",
      ja: "理論買取＝買×成色（999.9、916、750）。表の買取欄は999.9含有量で、鑑定・減耗・手数料は含みません。地金／装身具の店頭買取ではありません。",
    },
  },
} as const;

const faqCopy = {
  zh: [
    { q: "今天台灣黃金一錢多少錢？", a: "請看本頁最上方的理論買進與估計賣出。那是 GC 與臺銀匯率換算的即時參考，不是某一家銀樓的成交價。" },
    { q: "買進和賣出差在哪裡？", a: "買進是理論成本；賣出是該成本加上 4% 估計溢價。你向銀樓買金時通常看賣出區間，賣出舊金時則應再比較店家回收價。" },
    { q: "為什麼跟銀樓掛牌不一樣？", a: "門市還有自己的價差、成色認定與工費。本站只公開可驗證的國際金價與匯率，所以數字會不同。" },
    { q: "回收價可以拿去賣嗎？", a: "不可以直接當成交價。本站回收是含金量試算，實際還要秤重、看成色，並可能扣除耗損或手續費。" },
    { q: "歷史表的匯率怎麼算？", a: "每日列把該日 COMEX 收盤，配上同一台北日曆日（沒有就用最近前一營業日）的臺銀美元即期賣出。缺匯率就略過該點，不會拿「今天」的匯率改寫過去。圖上標示「歷史匯率換算參考」。" },
  ],
  en: [
    { q: "How much is one qian of gold in Taiwan today?", a: "Use the theoretical buy and estimated sell at the top of this page. They convert GC and Bank of Taiwan FX and are not a specific shop’s trade price." },
    { q: "What is the difference between buy and sell here?", a: "Buy is theoretical cost; sell adds a 4% estimated premium. When you purchase jewelry you usually compare the sell range; when you sell old gold, compare a dealer’s recycle bid." },
    { q: "Why doesn’t this match a jewelry shop board?", a: "Shops add their own spread, purity checks and workmanship. This site only publishes a verifiable international gold and FX conversion." },
    { q: "Can I sell at the recycle number?", a: "No. Recycle here is a fine-gold estimate. Actual offers depend on weight, purity, and possible testing or handling fees." },
    { q: "How is the history table converted?", a: "Each row pairs that day’s COMEX close with Bank of Taiwan USD sight-sell for the same Taipei calendar day, or the nearest prior BOT business day. Days without FX are omitted — today’s rate is never applied to the past. The chart is labeled a historical FX reference." },
  ],
  ja: [
    { q: "今日の台湾の金は銭あたりいくら？", a: "ページ上部の理論買と推定売をご覧ください。GCと台湾銀行為替の換算参考値であり、特定店舗の約定価格ではありません。" },
    { q: "ここの買と売の違いは？", a: "買は理論コスト、売はそこに推定4%プレミアムを加えた値です。購入時は売の帯、古い金を売るときは店頭の買取も比較してください。" },
    { q: "店頭の掲示と違うのはなぜ？", a: "店舗は独自のスプレッド、成色判定、加工費を上乗せします。本サイトは検証可能な国際金価格と為替の換算のみを公開します。" },
    { q: "買取の数字で売れますか？", a: "そのまま約定はできません。ここは含有量の試算で、実際は計量・成色確認、減耗や手数料の控除があり得ます。" },
    { q: "履歴表の為替はどう計算？", a: "各行はその日のCOMEX終値を、同じ台北カレンダー日（なければ直前の台湾銀行営業日）の米ドル直物売りと突合します。為替がない日は省略し、今日のレートで過去を書き換えません。チャートは「歴史的為替の参考」と表示します。" },
  ],
} as const;

export default function JewelryView({
  view,
  quotedAt,
  retrievedAt,
  marketStatus,
  source,
  live,
  historyRows,
  historyRange,
  historySource,
  usdTwd,
  fxBasis,
  omitted,
}: {
  view: LiveView;
  quotedAt: string;
  retrievedAt: string;
  marketStatus?: MarketStatus;
  source?: string;
  live: JewelryLive | null;
  historyRows: JewelryDayRow[];
  historyRange: JewelryRange | null;
  historySource: string;
  usdTwd: number | null;
  fxLabel?: string;
  fxBasis: "bot-sight-sell" | "mixed" | "market-reference" | null;
  omitted: number;
}) {
  const { locale } = useSiteLocale();
  const quotedLabel = formatTaipeiTime(quotedAt, locale);
  const checkLabel = formatTaipeiTime(retrievedAt, locale);
  const intro = view.connected
    ? t(
      locale,
      "以國際黃金參考價與臺銀美元即期賣出換算台灣理論買進，並標示估計賣出溢價，方便對照銀樓區間。",
      "Taiwan theoretical buy from the international gold reference and Bank of Taiwan USD spot sell, plus an estimated sell premium for jewelry comparison.",
      "国際金参考値と台湾銀行の米ドル直物売相場から台湾の理論買コストを換算し、店頭比較用の推定売プレミアムを示します。",
    )
    : t(
      locale,
      "台灣換算所需的國際金價或匯率暫時無法連線，因此不顯示銀樓參考數字。",
      "The international gold or FX feed needed for Taiwan conversion is unavailable, so no jewelry figures are shown.",
      "台湾換算に必要な国際金価格または為替に接続できないため、店頭参考値は表示しません。",
    );
  const note = source
    ? `${t(locale, "買進為 GC×臺銀即期賣出的理論成本，未含銀樓價差與費用。賣出為估計溢價 4% 的參考值，實際門市牌價、工費與品牌溢價請向店家確認。", "Buy is the theoretical GC × Bank of Taiwan spot-sell cost, excluding dealer spread and fees. Sell is a 4% estimated premium, not a shop board price.", "買値はGC×台湾銀行直物売りの理論コストで、店頭スプレッドと費用は含みません。売値は推定4%プレミアムの参考値です。")} ${t(locale, "資料來源：", "Source: ", "データ元：")}${source}`
    : t(locale, "買進為 GC×臺銀即期賣出的理論成本，未含銀樓價差與費用。賣出為估計溢價 4% 的參考值。", "Buy is theoretical GC × Bank of Taiwan cost; sell is a 4% estimated premium.", "買はGC×台湾銀行の理論コスト、売は推定4%プレミアムです。");
  const buy = live?.buy ?? null;
  const sell = live?.sell ?? null;
  const faq = faqCopy[locale];
  const chartNote = `${
    fxBasis === "bot-sight-sell"
      ? t(
        locale,
        "歷史匯率換算參考：各交易日採用臺銀美元即期賣出（台北日曆當日，若無則最近前一營業日）。",
        "Historical FX reference: each session uses Bank of Taiwan USD sight-sell for that Taipei day, or the nearest prior BOT business day.",
        "歴史的為替の参考：各時点は台湾銀行の米ドル直物売り（台北カレンダー当日、なければ直前営業日）。",
      )
      : fxBasis === "mixed"
        ? t(
          locale,
          "歷史匯率換算參考：優先臺銀美元即期賣出；缺口改用 Yahoo TWD=X／FRED DEXTAUS。缺匯率的日子會略過，絕不編造。",
          "Historical FX reference: Bank of Taiwan USD sight-sell when available; gaps use Yahoo TWD=X / FRED DEXTAUS. Missing FX is omitted, never invented.",
          "歴史的為替の参考：台湾銀行直物売りを優先し、欠落は Yahoo TWD=X / FRED DEXTAUS。為替がない日は省略し、補間しません。",
        )
        : t(
          locale,
          "歷史匯率換算參考：Yahoo TWD=X／FRED DEXTAUS 市場匯率（非臺銀即期賣出）。缺匯率的日子會略過。",
          "Historical FX reference: Yahoo TWD=X / FRED DEXTAUS (public mid-market), not Bank of Taiwan sight-sell. Missing FX is omitted.",
          "歴史的為替の参考：Yahoo TWD=X / FRED DEXTAUS（市場仲値）であり、台湾銀行の直物売りではありません。欠落は省略します。",
        )
  } ${t(locale, "非店家牌價。", "Not a shop price.", "店頭価格ではありません。")}`;
  const fxBadge = t(locale, "歷史匯率換算參考", "Historical FX reference", "歴史的為替の参考");

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
        <h1>{t(locale, "今日銀樓價格", "Today’s Jewelry Prices", "本日の店頭価格")}</h1>
        <p>{intro}</p>
        <div className="jewelryHeroPrices">
          <article className="jewelryPriceCard">
            <span>{t(locale, "今日買進（理論）", "Today’s buy (theoretical)", "本日の買（理論）")}</span>
            <strong>{buy !== null ? money(buy) : "—"}</strong>
            <small>{t(locale, "新台幣／錢", "TWD / qian", "台湾ドル／銭")}</small>
            <b className={live?.buyChange == null ? "neutral" : live.buyChange >= 0 ? "up" : "down"}>{changeLabel(locale, live?.buyChange ?? null, live?.changePercent ?? null)}</b>
          </article>
          <article className="jewelryPriceCard">
            <span>{t(locale, "今日賣出（估計）", "Today’s sell (estimated)", "本日の売（推定）")}</span>
            <strong>{sell !== null ? money(sell) : "—"}</strong>
            <small>{t(locale, "理論買進＋4% 參考溢價", "Theoretical buy + 4% reference premium", "理論買＋4%参考プレミアム")}</small>
            <b className={live?.sellChange == null ? "neutral" : live.sellChange >= 0 ? "up" : "down"}>{changeLabel(locale, live?.sellChange ?? null, live?.changePercent ?? null)}</b>
          </article>
        </div>
        {historyRange ? (
          <div className="jewelryRange" aria-label={t(locale, "近一個月交易日區間", "Recent month trading-day range", "直近1か月の取引日レンジ")}>
            <div>
              <span>{t(locale, "近月賣出高／低", "Month sell high / low", "月間売 高／安")}</span>
              <strong>{money(historyRange.sellHigh)} – {money(historyRange.sellLow)}</strong>
            </div>
            <div>
              <span>{t(locale, "近月賣出均價", "Month sell average", "月間売平均")}</span>
              <strong>{money(historyRange.sellAvg)}</strong>
            </div>
            <div>
              <span>{t(locale, "近月買進均價", "Month buy average", "月間買平均")}</span>
              <strong>{money(historyRange.buyAvg)}</strong>
            </div>
          </div>
        ) : null}
        <p className="jewelryFxBadge">
          {fxBadge}
          {usdTwd !== null && usdTwd > 0
            ? ` · ${t(locale, "今日即期賣出", "Today’s spot-sell", "本日の直物売り")} ${usdTwd.toFixed(3)}`
            : ""}
          {fxBasis === "mixed" || fxBasis === "market-reference"
            ? ` · ${t(locale, "部分日期為公開市場備援匯率", "Some dates use a public-market fallback FX", "一部日付は市場為替の予備")}`
            : ""}
        </p>
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

        <PriceHistoryChart
          locale={locale}
          currency="TWD"
          title={t(locale, "台灣理論買進走勢（歷史匯率）", "Taiwan theoretical buy history (historical FX)", "台湾の理論買推移（歴史的為替）")}
          ariaLabel={t(locale, "台灣理論金價歷史走勢", "Taiwan theoretical gold history", "台湾理論金価格の履歴")}
          initialPoints={historyRows.map((row) => ({ timestamp: row.timestamp, close: row.buy }))}
          endpoint="/api/jewelry-history"
          periods={["1M", "3M", "1Y", "3Y"]}
          note={chartNote}
        />

        <div className="sectionHead" style={{ marginTop: 36 }}>
          <div><p className="eyebrow">DAILY TABLE</p><h2>{t(locale, "每日理論牌價", "Daily theoretical prices", "日次の理論価格")}</h2></div>
          <p>{historyRows.length
            ? t(
              locale,
              `COMEX 收盤 × 當日／最近前一營業日匯率 · ${historyRows.length} 個交易日${omitted > 0 ? `（略過 ${omitted} 日缺匯率）` : ""}`,
              `COMEX close × same-day / prior-session FX · ${historyRows.length} sessions${omitted > 0 ? ` (${omitted} days omitted for missing FX)` : ""}`,
              `COMEX終値×当日／直前営業日為替 · ${historyRows.length}取引日${omitted > 0 ? `（為替なし ${omitted}日を省略）` : ""}`,
            )
            : t(locale, "目前沒有可驗證的近月歷史資料，故不列出表格。", "No verified recent history, so the table is omitted.", "検証可能な直近履歴がないため表は表示しません。")}</p>
        </div>
        {historyRows.length > 0 ? (
          <div className="jewelryTableWrap">
            <table className="jewelryTable">
              <caption className="srOnly">{t(locale, "台灣理論金價每日表：賣出、買進、漲跌、999.9 理論回收與當日匯率", "Daily Taiwan theoretical gold table: sell, buy, change, 999.9 recycle and that day’s FX", "台湾理論金価格の日次表")}</caption>
              <thead>
                <tr>
                  <th>{t(locale, "日期", "Date", "日付")}</th>
                  <th>{t(locale, "賣出（估計）", "Sell (est.)", "売（推定）")}</th>
                  <th>{t(locale, "買進（理論）", "Buy (theoretical)", "買（理論）")}</th>
                  <th>{t(locale, "漲跌", "Change", "騰落")}</th>
                  <th>{t(locale, "理論回收 999.9", "Recycle 999.9", "理論買取 999.9")}</th>
                  <th>{t(locale, "當日匯率", "FX that day", "当日為替")}</th>
                </tr>
              </thead>
              <tbody>
                {[...historyRows].reverse().map((row) => (
                  <tr key={row.timestamp}>
                    <td><time dateTime={new Date(row.timestamp * 1000).toISOString()}>{formatDate(row.timestamp, locale)}</time></td>
                    <td>{money(row.sell)}</td>
                    <td>{money(row.buy)}</td>
                    <td>
                      {row.change === null ? "—" : (
                        <b className={row.change >= 0 ? "up" : "down"}>
                          {row.change > 0 ? "▲" : row.change < 0 ? "▼" : "•"} {row.change > 0 ? "+" : row.change < 0 ? "−" : ""}{money(Math.abs(row.change))}
                        </b>
                      )}
                    </td>
                    <td>{money(row.recycleFine)}</td>
                    <td>{typeof row.usdTwd === "number" && Number.isFinite(row.usdTwd) ? row.usdTwd.toFixed(3) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {historyRows.length > 0 ? (
          <p className="quoteMethodology">
            <b>{t(locale, "歷史換算說明：", "History conversion note: ", "履歴換算の注記：")}</b>
            {t(
              locale,
              `各列以該日 COMEX 收盤，配上當日或最近前一營業日匯率後換算。缺匯率則略過，不用今日匯率改寫過去。回收欄 = 當日理論買進 × 999.9。來源：${historySource || "COMEX GC"}。`,
              `Each row converts that day’s COMEX close with same-day or nearest prior FX. Missing FX is omitted; today’s rate is not applied to the past. Recycle = that day’s theoretical buy × 999.9. Source: ${historySource || "COMEX GC"}.`,
              `各行はその日のCOMEX終値を当日または直前営業日の為替で換算。為替がなければ省略し、今日のレートで過去を書き換えません。買取欄＝当日の理論買×999.9。出典：${historySource || "COMEX GC"}。`,
            )}
          </p>
        ) : null}

        <div className="sectionHead" style={{ marginTop: 36 }}>
          <div><p className="eyebrow">HOW TO READ</p><h2>{t(locale, "怎麼看買進、賣出與回收", "How to read buy, sell and recycle", "買・売・買取の見方")}</h2></div>
        </div>
        <div className="jewelryEducate">
          {(["buy", "sell", "recycle"] as const).map((key) => (
            <article key={key}>
              <h3>{educate[key].title[locale]}</h3>
              <p>{educate[key].body[locale]}</p>
            </article>
          ))}
        </div>

        <div className="sectionHead" style={{ marginTop: 36 }}>
          <div><p className="eyebrow">FAQ</p><h2>{t(locale, "常見問題", "Frequently asked questions", "よくある質問")}</h2></div>
        </div>
        <div className="jewelryFaq">
          {faq.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>

        <div className="guide jewelryNote">
          <span>{t(locale, "資料聲明", "Disclaimer", "免責")}</span>
          <p>{note} {t(locale, "所有數字僅供理論參考，不構成投資或交易建議。", "All figures are theoretical reference only and are not investment or trading advice.", "数値は理論上の参考情報であり、投資・取引の助言ではありません。")}</p>
          <Link href="/#quotes">{t(locale, "回到即時報價　→", "Back to live quotes →", "即時相場へ戻る →")}</Link>
        </div>
        <SiteLinks current="jewelry" />
      </section>
      <footer>
        <Link className="brand" href="/"><i>99</i><span>玖久黃金報價網<br/><em>99GOLD.NET</em></span></Link>
        <p>{t(locale, "真金價值，長久相伴。", "True gold value, lasting companionship.", "真金の価値を、長く寄り添う。")}</p>
        <span>© 2026 玖久黃金報價網</span>
      </footer>
    </main>
  );
}
