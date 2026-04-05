import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  return { title: t("deletionTitle") + " — Goality TMC" };
}

export default async function DataDeletionPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });

  return (
    <div className="min-h-screen" style={{ background: "var(--cat-bg)", color: "var(--cat-text)" }}>
      <div className="max-w-[800px] mx-auto px-6 py-12">

        <Link href="/" className="inline-flex items-center gap-2 text-[13px] mb-8 hover:opacity-80 transition-opacity"
          style={{ color: "var(--cat-text-muted)" }}>
          <ArrowLeft className="w-3.5 h-3.5" /> {t("backHome")}
        </Link>

        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(239,68,68,0.1)" }}>
            <Trash2 className="w-6 h-6" style={{ color: "#EF4444" }} />
          </div>
          <h1 className="text-3xl font-black" style={{ color: "var(--cat-text)" }}>
            {t("deletionTitle")}
          </h1>
        </div>
        <p className="text-sm mb-10" style={{ color: "var(--cat-text-muted)" }}>
          Goality Sport Group OÜ · Estonia
        </p>

        <div className="space-y-8 text-[15px] leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>

          <section>
            <p>{t("deletionIntro")}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "var(--cat-text)" }}>{t("deletionWhatTitle")}</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>{t("deletionWhat1")}</li>
              <li>{t("deletionWhat2")}</li>
              <li>{t("deletionWhat3")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "var(--cat-text)" }}>{t("deletionHowTitle")}</h2>
            <div className="rounded-2xl border p-5 space-y-3"
              style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
                  style={{ background: "var(--cat-accent)", color: "#0A0E14" }}>1</span>
                <p>{t("deletionStep1")}</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
                  style={{ background: "var(--cat-accent)", color: "#0A0E14" }}>2</span>
                <p>
                  {t("deletionStep2pre")}{" "}
                  <a href="mailto:privacy@goality.app" className="font-semibold hover:opacity-80"
                    style={{ color: "var(--cat-accent)" }}>
                    privacy@goality.app
                  </a>{" "}
                  {t("deletionStep2post")}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
                  style={{ background: "var(--cat-accent)", color: "#0A0E14" }}>3</span>
                <p>{t("deletionStep3")}</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "var(--cat-text)" }}>{t("deletionTimeTitle")}</h2>
            <p>{t("deletionTimeBody")}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "var(--cat-text)" }}>{t("deletionContactTitle")}</h2>
            <p className="font-medium" style={{ color: "var(--cat-text)" }}>
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
