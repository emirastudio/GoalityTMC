"use client";
// Единый компонент навигации для всех публичных страниц
// Главная / Возможности / Каталог / Цены + Sign in / Get started
import { useTranslations } from "next-intl";
import { GlobalHeader, PublicHeaderActions } from "@/components/ui/global-header";

export function PublicNavHeader() {
  const t = useTranslations("landing");

  // Top nav order: Home → Tournaments → TMC → Listing.
  // TMC is the umbrella for everything product-marketing — it's a
  // dropdown that surfaces the About hub, Features catalog and
  // Draw Show. Pricing lives only in page footers now (kept link-rich
  // but off the global header to reduce noise).
  const navLinks = [
    { label: t("navHome"),     href: "/" },
    { label: t("navCatalog"),  href: "/catalog" },
    {
      label: t("navAbout"),
      href: "/about",
      children: [
        {
          label: t("navAboutHub"),
          description: t("navAboutHubDesc"),
          href: "/about",
          badge: "NEW",
        },
        {
          label: t("navFeaturesPlatform"),
          description: t("navFeaturesPlatformDesc"),
          href: "/features",
        },
        {
          label: t("navFeaturesDrawShow"),
          description: t("navFeaturesDrawShowDesc"),
          href: "/draw",
        },
      ],
    },
    { label: t("navListing"),  href: "/listing" },
  ];

  return (
    <GlobalHeader
      navLinks={navLinks}
      rightContent={
        <PublicHeaderActions
          signInLabel={t("navSignIn")}
          getStartedLabel={t("navGetStarted")}
        />
      }
    />
  );
}
