import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Trophy, Building2, Users, ArrowRight, Globe } from "lucide-react";

export default async function HomePage() {
  const t = await getTranslations("landing");

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-navy text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 py-16 md:py-24 relative z-10">
          <div className="max-w-2xl">
            {/* Slogan */}
            <div className="mb-6">
              <span className="text-5xl md:text-7xl font-black tracking-tight leading-none">
                <span className="text-mint">Play.</span>{" "}
                <span className="text-white">Grow.</span>{" "}
                <span className="text-mint">Win.</span>
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-bold leading-tight">
              {t("heroTitle")}
            </h1>
            <p className="text-lg text-white/60 mt-4 leading-relaxed">
              {t("heroSubtitle")}
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 rounded-lg bg-mint px-6 py-3 text-sm font-semibold text-navy hover:bg-mint-dark transition-colors"
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
        {/* Decorative gradient */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-mint/10 to-transparent" />
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-mint/10 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-7 h-7 text-mint-dark" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary">{t("feature1Title")}</h3>
            <p className="text-text-secondary mt-2 text-sm leading-relaxed">{t("feature1Desc")}</p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-mint/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-mint-dark" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary">{t("feature2Title")}</h3>
            <p className="text-text-secondary mt-2 text-sm leading-relaxed">{t("feature2Desc")}</p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-mint/10 flex items-center justify-center mx-auto mb-4">
              <Globe className="w-7 h-7 text-mint-dark" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary">{t("feature3Title")}</h3>
            <p className="text-text-secondary mt-2 text-sm leading-relaxed">{t("feature3Desc")}</p>
          </div>
        </div>
      </div>

      {/* CTA banner */}
      <div className="bg-mint">
        <div className="max-w-5xl mx-auto px-4 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-navy">{t("feature1Title")}</h2>
            <p className="text-navy/70 mt-1">{t("heroSubtitle")}</p>
          </div>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 rounded-lg bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-navy-light transition-colors shrink-0"
          >
            {t("heroCtaOrganizer")}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-white">
        <div className="max-w-5xl mx-auto px-4 py-8 flex items-center justify-between text-sm text-text-secondary">
          <div className="flex items-center gap-2">
            <span className="font-bold text-navy">Goality</span>
            <span>&copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/catalog" className="hover:text-navy">{t("heroCtaCatalog")}</Link>
            <Link href="/login" className="hover:text-navy">{t("heroCtaLogin")}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
