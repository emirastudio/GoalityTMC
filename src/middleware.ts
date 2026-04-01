import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match all locale-prefixed paths including new org/ routes
  matcher: ["/", "/(en|ru|et)/:path*"],
};
