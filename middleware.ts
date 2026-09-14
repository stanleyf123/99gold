import { NextResponse, type NextRequest } from "next/server";

const APEX_HOST = "99gold.net";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  if (host !== `www.${APEX_HOST}`) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.hostname = APEX_HOST;
  url.protocol = "https:";
  url.port = "";
  return NextResponse.redirect(url, 301);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.svg).*)"],
};
