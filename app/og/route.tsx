import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getGlobalQuotesOrNull } from "../../lib/quotes";
import { formatTwdAmount, taiwanQianValue } from "../../lib/section-quotes";

export const runtime = "nodejs";
export const revalidate = 180;
export const contentType = "image/png";
export const alt = "玖久黃金報價網今日金價：台灣理論錢價與 COMEX 黃金參考";
export const size = { width: 1200, height: 630 };

const MISSING = "—";

async function brandBackdrop(): Promise<string | null> {
  try {
    const file = await readFile(join(process.cwd(), "public", "og.jpg"));
    return `data:image/jpeg;base64,${file.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET() {
  const [quotes, backdrop] = await Promise.all([getGlobalQuotesOrNull(), brandBackdrop()]);
  const gold = quotes?.metals.find((metal) => metal.id === "gold");
  const qian = taiwanQianValue(quotes?.items);
  const goldText = gold && Number.isFinite(gold.price)
    ? gold.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : MISSING;
  const qianText = qian !== null ? formatTwdAmount(qian) : MISSING;
  const when = quotes?.quotedAt
    ? new Intl.DateTimeFormat("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Taipei" }).format(new Date(quotes.quotedAt))
    : MISSING;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          position: "relative",
          backgroundColor: "#0b1218",
          color: "#f6edd8",
        }}
      >
        {backdrop ? (
          <img
            src={backdrop}
            width={1200}
            height={630}
            alt=""
            style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, objectFit: "cover" }}
          />
        ) : (
          <div style={{ position: "absolute", top: 52, left: 56, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 18, letterSpacing: 6, color: "#e6bb49", fontWeight: 700 }}>99GOLD.NET</div>
            <div style={{ display: "flex", fontSize: 46, marginTop: 12, color: "#f8f1dc" }}>玖久黃金報價網</div>
            <div style={{ display: "flex", width: 168, height: 2, marginTop: 16, backgroundColor: "#c9951c" }} />
            <div style={{ display: "flex", fontSize: 22, marginTop: 14, color: "#e8d5a3", letterSpacing: 3 }}>真金價值，長久相伴。</div>
          </div>
        )}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "36px 40px 36px",
            backgroundImage: "linear-gradient(180deg, rgba(8,14,18,0.18) 0%, rgba(8,14,18,0.08) 42%, rgba(8,14,18,0.78) 100%)",
          }}
        >
          <div style={{ display: "flex", width: "100%", justifyContent: "flex-end" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <div style={{ display: "flex", fontSize: 20, color: "#f3e6c4" }}>{`GMT+8 ${when}`}</div>
              <div style={{ display: "flex", fontSize: 15, marginTop: 6, color: "#e6bb49", letterSpacing: 3 }}>LIVE REFERENCE</div>
            </div>
          </div>
          <div style={{ display: "flex", width: "100%" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: 540,
                backgroundColor: "rgba(13,21,25,0.86)",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "rgba(201,149,28,0.55)",
                padding: "24px 28px",
                marginRight: 24,
              }}
            >
              <div style={{ display: "flex", fontSize: 18, color: "#e6bb49", letterSpacing: 1 }}>台灣理論買進／錢</div>
              <div style={{ display: "flex", fontSize: 52, marginTop: 8, color: "#fff8e8" }}>{`NT$ ${qianText}`}</div>
              <div style={{ display: "flex", fontSize: 18, color: "#c9c1b3", marginTop: 8 }}>GC × 臺銀美元即期賣出</div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: 540,
                backgroundColor: "rgba(21,40,45,0.88)",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "rgba(230,187,73,0.42)",
                padding: "24px 28px",
              }}
            >
              <div style={{ display: "flex", fontSize: 18, color: "#e6bb49", letterSpacing: 1 }}>COMEX 黃金參考／盎司</div>
              <div style={{ display: "flex", fontSize: 52, marginTop: 8, color: "#fff8e8" }}>{`US$ ${goldText}`}</div>
              <div style={{ display: "flex", fontSize: 18, color: "#c9c1b3", marginTop: 8 }}>理論參考，非店家牌價</div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      headers: {
        "Cache-Control": "public, max-age=180, s-maxage=180",
      },
    },
  );
}
