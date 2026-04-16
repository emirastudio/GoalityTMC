"use client";
// Единый компонент навигации для всех публичных страниц
// Главная / Возможности / Каталог / Цены + Sign in / Get started
import { useTranslations } from "next-intl";
import { GlobalHeader, PublicHeaderActions } from "@/components/ui/global-header";

export function PublicNavHeader() {
  const t = useTranslations("landing");

  // "Возможности" is now a dropdown — top-level link still goes to
  // /features (full catalog of features), and the panel surfaces the
  // two highlight entry points (platform + Draw Show standalone)
  // without forcing the user to scroll the grid.
  const navLinks = [
    { label: t("navHome"),     href: "/" },
    {
      label: t("navFeatures"),
      href: "/features",
      children: [
        {
          label: t("navFeaturesPlatform"),
          description: t("navFeaturesPlatformDesc"),
          href: "/features",
        },
        {
          label: t("navFeaturesDrawShow"),
          description: t("navFeaturesDrawShowDesc"),
          href: "/draw",
          badge: "NEW",
        },
      ],
    },
    { label: t("navCatalog"),  href: "/catalog" },
    { label: t("navBlog"),     href: "/blog" },
    { label: t("navListing"),  href: "/listing" },
    { label: t("navPricing"),  href: "/pricing" },
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
