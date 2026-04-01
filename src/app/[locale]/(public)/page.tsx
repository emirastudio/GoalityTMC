import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Trophy, Building2, Users, ArrowRight, Globe } from "lucide-react";

export default async function HomePage() {
  const t = await getTranslations("landing");

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-navy text-white">
        <div className="max-w-5xl mx-auto px-4 py-16 md:py-24">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              {t("heroTitle")}
            </h1>
            <p className="text-lg text-white/70 mt-4 leading-relaxed">
              {t("heroSubtitle")}
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 rounded-lg bg-gold px-6 py-3 text-sm font-semibold text-navy hover:bg-gold/90 transition-colors"
              >
                {t("heroCtaOrganizer")}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/catalog"
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
              >
                {t("heroCtaCatalog")}
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-6 py-3 text-sm font-medium text-white/80 hover:bg-white/10 transition-colors"
              >
                {t("heroCtaLogin")}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-navy/10 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-7 h-7 text-navy" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary">{t("feature1Title")}</h3>
            <p className="text-text-secondary mt-2 text-sm leading-relaxed">{t("feature1Desc")}</p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-navy/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-navy" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary">{t("feature2Title")}</h3>
            <p className="text-text-secondary mt-2 text-sm leading-relaxed">{t("feature2Desc")}</p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-navy/10 flex items-center justify-center mx-auto mb-4">
              <Globe className="w-7 h-7 text-navy" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary">{t("feature3Title")}</h3>
            <p className="text-text-secondary mt-2 text-sm leading-relaxed">{t("feature3Desc")}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border">
        <div className="max-w-5xl mx-auto px-4 py-8 flex items-center justify-between text-sm text-text-secondary">
          <span>Goality &copy; {new Date().getFullYear()}</span>
          <Link href="/catalog" className="hover:text-navy">{t("heroCtaCatalog")}</Link>
        </div>
      </div>
    </div>
  );
}
