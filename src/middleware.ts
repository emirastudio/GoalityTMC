import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest, NextResponse } from "next/server";

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const intlResponse = intlMiddleware(request);

  // If next-intl is redirecting (locale prefix etc.) — return as-is
  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    return intlResponse;
  }

  // Inject x-pathname into request headers so Server Components / layouts
  // can detect the current page path without client-side JS
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Copy any cookies next-intl set (e.g. NEXT_LOCALE)
  const setCookies = intlResponse.headers.getSetCookie?.() ?? [];
  setCookies.forEach((cookie) => {
    response.headers.append("set-cookie", cookie);
  });

  return response;
}

export const config = {
  // Match all paths except API routes, Next.js internals, and static files
  // This allows next-intl to redirect /catalog → /en/catalog automatically
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)" ],
};
