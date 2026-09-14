import { ImageResponse } from "next/og";
import { getGlobalQuotesOrNull } from "../../lib/quotes";
import { formatTwdAmount, taiwanQianValue } from "../../lib/section-quotes";

export const runtime = "nodejs";
export const revalidate = 180;
export const contentType = "image/png";
export const alt = "玖久黃金報價網今日金價";
export const size = { width: 1200, height: 630 };

export async function GET() {
  const quotes = await getGlobalQuotesOrNull();
  const gold = quotes?.metals.find((metal) => metal.id === "gold");
  const qian = taiwanQianValue(quotes?.items);
  const goldText = gold && Number.isFinite(gold.price) ? gold.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";
  const qianText = qian !== null ? formatTwdAmount(qian) : "—";
  const when = quotes?.quotedAt
    ? new Intl.DateTimeFormat("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Taipei" }).format(new Date(quotes.quotedAt))
    : "—";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "54px 64px",
          background: "#f7f4ed",
          color: "#172128",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 18, letterSpacing: 4, color: "#8a6a1f", fontWeight: 700 }}>99GOLD.NET</div>
            <div style={{ fontSize: 44, marginTop: 10 }}>玖久黃金報價網</div>
          </div>
          <div style={{ fontSize: 22, color: "#5d5348" }}>GMT+8 {when}</div>
        </div>
        <div style={{ display: "flex", gap: 28 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#fffdf8", border: "1px solid #d5ccba", padding: "28px 32px" }}>
            <div style={{ fontSize: 20, color: "#8a6a1f" }}>台灣理論買進／錢</div>
            <div style={{ fontSize: 64, marginTop: 12 }}>NT$ {qianText}</div>
            <div style={{ fontSize: 20, color: "#5d5348", marginTop: 8 }}>GC × 臺銀美元即期賣出</div>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#15282d", color: "#fffdf8", padding: "28px 32px" }}>
            <div style={{ fontSize: 20, color: "#d8aa43" }}>COMEX 黃金參考／盎司</div>
            <div style={{ fontSize: 64, marginTop: 12 }}>US$ {goldText}</div>
            <div style={{ fontSize: 20, color: "#c9c1b3", marginTop: 8 }}>理論參考，非店家牌價</div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
