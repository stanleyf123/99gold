"use client";

import PriceHistoryChart from "./PriceHistoryChart";
import { type Locale, t } from "./locale";
import { formatGoldSilverRatio, goldSilverRatio } from "../lib/gold-silver-ratio";

export default function GoldSilverRatioPanel({
  locale,
  goldPrice,
  silverPrice,
  goldSymbol = "GC=F",
  silverSymbol = "SI=F",
  initialPoints,
}: {
  locale: Locale;
  goldPrice: number;
  silverPrice: number;
  goldSymbol?: string;
  silverSymbol?: string;
  initialPoints: Array<{ timestamp: number; close: number }>;
}) {
  const ratio = goldSilverRatio(goldPrice, silverPrice);
  const goldOk = Number.isFinite(goldPrice) && goldPrice > 0;
  const silverOk = Number.isFinite(silverPrice) && silverPrice > 0;

  return (
    <section className="goldSilverRatio" id="gold-silver-ratio">
      <div className="ratioNow">
        <p className="eyebrow">GOLD / SILVER RATIO</p>
        <h2>{t(locale, "金銀比", "Gold/silver ratio", "金銀比")}</h2>
        <strong>{formatGoldSilverRatio(ratio)}</strong>
        <p>
          {t(
            locale,
            "金價（美元／盎司）÷ 銀價。數字愈高，代表相對白銀、黃金愈貴。",
            "Gold USD/oz ÷ silver USD/oz. A higher number means gold is expensive versus silver.",
            "金（米ドル／オンス）÷銀。数値が高いほど、銀に対して金が高いことを示します。",
          )}
        </p>
        <small>
          {goldOk ? `${goldSymbol} ${goldPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : `${goldSymbol} —`}
          {" · "}
          {silverOk ? `${silverSymbol} ${silverPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : `${silverSymbol} —`}
          {" · "}
          {t(locale, "國際期貨參考，非店家牌價。", "International futures reference, not a shop quote.", "国際先物の参考値であり、店頭価格ではありません。")}
        </small>
      </div>
      <PriceHistoryChart
        locale={locale}
        title={t(locale, "歷史金銀比（近 30／90 日）", "Historical gold/silver ratio (30 / 90 days)", "金銀比の履歴（30／90日）")}
        ariaLabel={t(locale, "金銀比歷史走勢", "Gold/silver ratio history", "金銀比の履歴")}
        initialPoints={initialPoints}
        endpoint="/api/gold-silver-ratio"
        formatValue={(value) => formatGoldSilverRatio(value)}
        note={t(
          locale,
          "各日以當日 GC 與 SI 收盤相除；缺金或缺銀的交易日不列，不補估。",
          "Each session is that day’s GC close ÷ SI close. Days missing gold or silver are omitted, never filled in.",
          "各日はその日のGC終値÷SI終値。金または銀が欠けた取引日は掲載せず、補完しません。",
        )}
      />
    </section>
  );
}
