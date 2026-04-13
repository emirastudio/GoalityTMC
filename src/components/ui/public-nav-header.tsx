"use client";
// Единый компонент навигации для всех публичных страниц
// Главная / Возможности / Каталог / Цены + Sign in / Get started
import { useTranslations } from "next-intl";
import { GlobalHeader, PublicHeaderActions } from "@/components/ui/global-header";

export function PublicNavHeader() {
  const t = useTranslations("landing");

  const navLinks = [
    { label: t("navHome"),     href: "/" },
    { label: t("navFeatures"), href: "/features" },
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
