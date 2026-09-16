import { NextResponse, type NextRequest } from "next/server";
import {
  LOCALE_HEADER,
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

  const { locale, pathname: bare, hadPrefix } = stripLocalePrefix(pathname);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(LOCALE_HEADER, locale);
  if (hadPrefix && locale !== "zh") {
    const url = request.nextUrl.clone();
    url.pathname = bare;
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.svg).*)"],
};
