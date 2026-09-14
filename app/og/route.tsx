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
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 54,
          backgroundColor: "#f7f4ed",
          color: "#172128",
        }}
      >
        <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 18, letterSpacing: 4, color: "#8a6a1f", fontWeight: 700 }}>99GOLD.NET</div>
            <div style={{ display: "flex", fontSize: 44, marginTop: 10 }}>玖久黃金報價網</div>
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#5d5348" }}>{`GMT+8 ${when}`}</div>
        </div>
        <div style={{ display: "flex", width: "100%" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 510,
              backgroundColor: "#fffdf8",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "#d5ccba",
              padding: 28,
              marginRight: 28,
            }}
          >
            <div style={{ display: "flex", fontSize: 20, color: "#8a6a1f" }}>台灣理論買進／錢</div>
            <div style={{ display: "flex", fontSize: 56, marginTop: 12 }}>{`NT$ ${qianText}`}</div>
            <div style={{ display: "flex", fontSize: 20, color: "#5d5348", marginTop: 8 }}>GC × 臺銀美元即期賣出</div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 510,
              backgroundColor: "#15282d",
              color: "#fffdf8",
              padding: 28,
            }}
          >
            <div style={{ display: "flex", fontSize: 20, color: "#d8aa43" }}>COMEX 黃金參考／盎司</div>
            <div style={{ display: "flex", fontSize: 56, marginTop: 12 }}>{`US$ ${goldText}`}</div>
            <div style={{ display: "flex", fontSize: 20, color: "#c9c1b3", marginTop: 8 }}>理論參考，非店家牌價</div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
