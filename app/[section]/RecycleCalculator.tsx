"use client";

import { useMemo, useState } from "react";
import {
  RECYCLE_PURITY,
  formatTwdAmount,
  parseCustomPurityPercent,
  recycleEstimateTwd,
  type RecyclePurityPreset,
  type RecycleWeightUnit,
} from "../../lib/section-quotes";
import { type Locale, t } from "../locale";

const purityPresets: RecyclePurityPreset[] = ["999.9", "916", "750", "custom"];

function unitLabel(locale: Locale, unit: RecycleWeightUnit) {
  if (unit === "qian") return t(locale, "錢", "qian", "銭");
  if (unit === "gram") return t(locale, "公克", "gram", "グラム");
  return t(locale, "台兩", "tael", "台両");
}

function purityLabel(locale: Locale, preset: RecyclePurityPreset, customPercent: string) {
  if (preset === "999.9") return t(locale, "999.9 純金", "999.9 fine gold", "999.9 純金");
  if (preset === "916") return "916／22K";
  if (preset === "750") return "750／18K";
  const parsed = parseCustomPurityPercent(customPercent);
  if (parsed === null) return t(locale, "自訂成色", "Custom purity", "カスタム成色");
  return t(locale, `自訂 ${customPercent.trim()}%`, `Custom ${customPercent.trim()}%`, `カスタム ${customPercent.trim()}%`);
}

export default function RecycleCalculator({
  locale,
  taiwanQian,
  quotedLabel,
  connected,
}: {
  locale: Locale;
  taiwanQian: number | null;
  quotedLabel: string;
  connected: boolean;
}) {
  const [weight, setWeight] = useState("10");
  const [unit, setUnit] = useState<RecycleWeightUnit>("qian");
  const [preset, setPreset] = useState<RecyclePurityPreset>("999.9");
  const [customPercent, setCustomPercent] = useState("");
  const available = connected && taiwanQian !== null && taiwanQian > 0;

  const estimate = useMemo(() => {
    if (!available || taiwanQian === null) return null;
    const purity = preset === "custom" ? parseCustomPurityPercent(customPercent) : RECYCLE_PURITY[preset];
    if (purity === null) return null;
    return recycleEstimateTwd(taiwanQian, Number(weight), unit, purity);
  }, [available, taiwanQian, preset, customPercent, weight, unit]);

  const perQian = useMemo(() => {
    if (!available || taiwanQian === null) return null;
    const purity = preset === "custom" ? parseCustomPurityPercent(customPercent) : RECYCLE_PURITY[preset];
    if (purity === null) return null;
    return recycleEstimateTwd(taiwanQian, 1, "qian", purity);
  }, [available, taiwanQian, preset, customPercent]);

  const customInvalid = preset === "custom" && customPercent.trim() !== "" && parseCustomPurityPercent(customPercent) === null;
  const rateText = available && taiwanQian !== null
    ? `NT$ ${formatTwdAmount(taiwanQian)}／${t(locale, "錢", "qian", "銭")}`
    : "—";

  return (
    <section className={`recycleCalc${available ? "" : " isUnavailable"}`} id="recycle-estimate" aria-labelledby="recycle-calc-title">
      <div className="recycleCalcHead">
        <div>
          <p className="eyebrow">RECYCLE ESTIMATE</p>
          <h2 id="recycle-calc-title">{t(locale, "回收試算", "Recycle estimate", "買取試算")}</h2>
        </div>
        <p>
          {available ? (
            <>
              {t(locale, "今日買進參考", "Today’s buy reference", "本日の買参考")} {rateText}（999.9）
              <small>{t(locale, "行情時間", "Quote time", "相場時刻")} {quotedLabel}（GMT+8）</small>
            </>
          ) : (
            t(locale, "今日金價暫時無法連線，因此無法試算。", "Today’s gold quote is unavailable, so no estimate is shown.", "本日の金相場に接続できないため、試算できません。")
          )}
        </p>
      </div>

      <div className="recycleCalcBody">
        <form className="recycleCalcForm" onSubmit={(event) => event.preventDefault()}>
          <fieldset disabled={!available}>
            <legend className="srOnly">{t(locale, "重量與成色", "Weight and purity", "重量と成色")}</legend>
            <label className="recycleField" htmlFor="recycle-weight">
              {t(locale, "重量", "Weight", "重量")}
              <div className="recyclePair">
                <input
                  id="recycle-weight"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={weight}
                  onChange={(event) => setWeight(event.target.value)}
                  placeholder="10"
                />
                <select
                  id="recycle-unit"
                  aria-label={t(locale, "重量單位", "Weight unit", "重量単位")}
                  value={unit}
                  onChange={(event) => setUnit(event.target.value as RecycleWeightUnit)}
                >
                  <option value="qian">{t(locale, "錢", "Qian", "銭")}</option>
                  <option value="gram">{t(locale, "公克", "Gram", "グラム")}</option>
                  <option value="tael">{t(locale, "台兩", "Tael", "台両")}</option>
                </select>
              </div>
            </label>

            <div className="recycleField">
              <span id="recycle-purity-label">{t(locale, "成色", "Purity", "成色")}</span>
              <div className="recyclePurity" role="group" aria-labelledby="recycle-purity-label">
                {purityPresets.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={preset === item ? "selected" : undefined}
                    aria-pressed={preset === item}
                    onClick={() => setPreset(item)}
                  >
                    {item === "custom" ? t(locale, "自訂", "Custom", "カスタム") : item}
                    <small>
                      {item === "999.9"
                        ? t(locale, "高純度", "Fine gold", "高純度")
                        : item === "916"
                          ? "22K"
                          : item === "750"
                            ? "18K"
                            : "%"}
                    </small>
                  </button>
                ))}
              </div>
            </div>

            {preset === "custom" && (
              <label className="recycleField" htmlFor="recycle-custom-purity">
                {t(locale, "自訂成色（%）", "Custom purity (%)", "カスタム成色（%）")}
                <input
                  id="recycle-custom-purity"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  inputMode="decimal"
                  value={customPercent}
                  onChange={(event) => setCustomPercent(event.target.value)}
                  placeholder={t(locale, "例如 99.5", "e.g. 99.5", "例：99.5")}
                  aria-invalid={customInvalid}
                />
                {customInvalid && (
                  <em>
                    {t(locale, "請輸入大於 0、不大於 100 的成色百分比。", "Enter a purity percent greater than 0 and at most 100.", "0より大きく100以下の成色パーセントを入力してください。")}
                  </em>
                )}
              </label>
            )}
          </fieldset>
        </form>

        <div className="recycleCalcResult" aria-live="polite">
          <span>{t(locale, "估計回收參考", "Estimated recycle reference", "買取参考の試算")}</span>
          <strong>{estimate === null ? "—" : `NT$ ${formatTwdAmount(estimate)}`}</strong>
          <small>
            {available && estimate !== null && perQian !== null
              ? `${weight || 0} ${unitLabel(locale, unit)} · ${purityLabel(locale, preset, customPercent)} · NT$ ${formatTwdAmount(perQian)}／${t(locale, "錢", "qian", "銭")}`
              : t(locale, "沒有有效金價或輸入時不顯示數字", "No figure is shown without a valid quote and inputs", "有効な相場と入力がない場合は数値を表示しません")}
          </small>
        </div>
      </div>

      <p className="recycleCalcNote">
        {t(
          locale,
          "參考試算、未含耗損／手續費／檢測，非店家成交價。",
          "Reference estimate only; excludes loss, fees and testing. Not a dealer transaction price.",
          "参考試算であり、減耗・手数料・鑑定は含みません。店舗の成約価格ではありません。",
        )}
      </p>
    </section>
  );
}
