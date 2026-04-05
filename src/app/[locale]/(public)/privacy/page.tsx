import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  return { title: t("privacyTitle") + " — Goality TMC" };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });

  return (
    <div className="min-h-screen" style={{ background: "var(--cat-bg)", color: "var(--cat-text)" }}>
      <div className="max-w-[800px] mx-auto px-6 py-12">

        <Link href="/" className="inline-flex items-center gap-2 text-[13px] mb-8 hover:opacity-80 transition-opacity"
          style={{ color: "var(--cat-text-muted)" }}>
          <ArrowLeft className="w-3.5 h-3.5" /> {t("backHome")}
        </Link>

        <h1 className="text-3xl font-black mb-2" style={{ color: "var(--cat-text)" }}>
          {t("privacyTitle")}
        </h1>
        <p className="text-sm mb-10" style={{ color: "var(--cat-text-muted)" }}>
          {t("privacyUpdated")}: 2025-01-01 · Goality Sport Group OÜ
        </p>

        <div className="space-y-8 text-[15px] leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "var(--cat-text)" }}>{t("privacy1Title")}</h2>
            <p>{t("privacy1Body")}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "var(--cat-text)" }}>{t("privacy2Title")}</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>{t("privacy2Item1")}</li>
              <li>{t("privacy2Item2")}</li>
              <li>{t("privacy2Item3")}</li>
              <li>{t("privacy2Item4")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "var(--cat-text)" }}>{t("privacy3Title")}</h2>
            <p>{t("privacy3Body")}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "var(--cat-text)" }}>{t("privacy4Title")}</h2>
            <p>{t("privacy4Body")}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "var(--cat-text)" }}>{t("privacy5Title")}</h2>
            <p>{t("privacy5Body")}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "var(--cat-text)" }}>{t("privacy6Title")}</h2>
            <p>{t("privacy6Body")}</p>
            <p className="mt-2 font-medium" style={{ color: "var(--cat-text)" }}>
              Goality Sport Group OÜ<br />
              {t("privacyAddress")}<br />
              <a href="mailto:privacy@goality.app" className="hover:opacity-80" style={{ color: "var(--cat-accent)" }}>
                privacy@goality.app
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
