import { headers } from "next/headers";
import { NextResponse } from "next/server";

const traditionalChineseMarkets = new Set(["TW", "HK", "MO"]);

export async function GET() {
  const country = (await headers()).get("cf-ipcountry")?.toUpperCase() ?? "";
  const locale = country === "JP" ? "ja" : traditionalChineseMarkets.has(country) ? "zh" : "en";
  return NextResponse.json({ locale }, { headers: { "Cache-Control": "private, max-age=86400" } });
}
