import { NextResponse, type NextRequest } from "next/server";
import {
  LOCALE_COOKIE,
  applyLocaleRequestHeaders,
  localePathRedirect,
  skipLocaleRouting,
  stripLocalePrefix,
} from "./lib/locale-path";

const APEX_HOST = "99gold.net";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  if (host === `www.${APEX_HOST}`) {
    const url = request.nextUrl.clone();
    url.hostname = APEX_HOST;
    url.protocol = "https:";
    url.port = "";
    return NextResponse.redirect(url, 301);
  }

  const pathname = request.nextUrl.pathname;
  if (skipLocaleRouting(pathname)) return NextResponse.next();

  const redirected = localePathRedirect(pathname, request.nextUrl.search);
  if (redirected) {
    const url = request.nextUrl.clone();
    url.pathname = redirected.pathname;
    url.search = redirected.search.startsWith("?") ? redirected.search.slice(1) : redirected.search;
    return NextResponse.redirect(url, 308);
  }

  const { locale } = stripLocalePrefix(pathname);
  const requestHeaders = new Headers(request.headers);
  applyLocaleRequestHeaders(requestHeaders, locale, pathname);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.cookies.set(LOCALE_COOKIE, locale, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.svg).*)"],
};
