import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { localeFromGeoCountry } from "../../../lib/site-locale";

export async function GET() {
  const requestHeaders = await headers();
  const country = requestHeaders.get("cf-ipcountry") ?? requestHeaders.get("x-vercel-ip-country") ?? "";
  const locale = localeFromGeoCountry(country);
  return NextResponse.json({ locale }, { headers: { "Cache-Control": "private, max-age=86400" } });
}
