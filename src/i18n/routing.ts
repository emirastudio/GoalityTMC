import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ru", "et", "es"],
  defaultLocale: "en",
  localeCookie: {
    name: "NEXT_LOCALE",
    maxAge: 60 * 60 * 24 * 365, // 1 год
    sameSite: "lax",
  },
  localeDetection: true,
});
