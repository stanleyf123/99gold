"use client";

import { buildGoldFxQuotes, formatGoldFxValue } from "../lib/gold-fx-strip";
import { t, useSiteLocale } from "./locale";

export default function GoldFxStrip({
  goldUsdPerOz,
  taiwanQian,
  currencies,
}: {
  goldUsdPerOz?: number | null;
  taiwanQian?: number | null;
  currencies?: Record<string, number>;
}) {
  const { locale } = useSiteLocale();
  const quotes = buildGoldFxQuotes({ goldUsdPerOz, taiwanQian, currencies });
  const eur = currencies && typeof currencies.EUR === "number" && currencies.EUR > 0;
  const jpy = currencies && typeof currencies.JPY === "number" && currencies.JPY > 0;
  const cny = currencies && typeof currencies.CNY === "number" && currencies.CNY > 0;
  const fxNote = [
    t(locale, "臺銀美元即期賣出（台灣錢價）", "Bank of Taiwan USD spot sell (Taiwan qian)", "台湾銀行米ドル直物売り（台湾銭）"),
    eur || jpy || cny
      ? t(locale, "open.er-api.com 市場匯率（EUR／JPY／CNY）", "open.er-api.com market FX (EUR / JPY / CNY)", "open.er-api.com市場為替（EUR／JPY／CNY）")
      : null,
  ].filter(Boolean).join(" · ");

  return (
    <section className="goldFxStrip" aria-labelledby="gold-fx-strip-title">
      <div className="goldFxIntro">
        <p className="eyebrow">MULTI-CURRENCY REFERENCE</p>
        <h2 id="gold-fx-strip-title">
          {t(locale, "多幣種黃金參考", "Gold in major currencies", "主要通貨の金参考値")}
        </h2>
        <p>
          {t(
            locale,
            "理論參考，不是店家成交價。台灣錢價採 3.75 公克；EUR／JPY／CNY 為美元／盎司乘市場匯率。缺匯率時顯示 —。",
            "Theoretical reference, not a shop price. Taiwan qian = 3.75 g. EUR / JPY / CNY = USD/oz × market FX. Missing rates show —.",
            "理論参考であり店頭約定価格ではありません。台湾の銭は3.75g。EUR／JPY／CNYは米ドル／オンス×市場為替。欠ける場合は —。",
          )}
        </p>
      </div>
      <ul>
        {quotes.map((item) => (
          <li key={item.code}>
            <span>{item.label[locale]}</span>
            <strong>{formatGoldFxValue(item.value, item.decimals)}</strong>
            <small>{item.unit[locale]}</small>
          </li>
        ))}
      </ul>
      <p className="goldFxSource">{fxNote}</p>
    </section>
  );
}
