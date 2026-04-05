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
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-10">

        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-8">
          <ArrowLeft className="w-4 h-4" /> {t("backHome")}
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("privacyTitle")}</h1>
        <p className="text-sm text-gray-500 mb-8">
          {t("privacyUpdated")}: 2025-01-01 · Goality Sport Group OÜ, Tallinn, Estonia
        </p>

        <div className="space-y-8 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">{t("privacy1Title")}</h2>
            <p>{t("privacy1Body")}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Data Controllers</h2>
            <div className="space-y-3">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="font-semibold text-gray-900">Tournament Organiser</p>
                <p className="text-gray-500 mt-1">Primary data controller for tournament-related personal data. Responsible for decisions regarding data collected during tournament registration and participation.</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="font-semibold text-gray-900">Goality Sport Group OÜ</p>
                <p className="text-gray-500 mt-1">Data processor providing the Goality TMC platform. Also an independent data controller for account and authentication data (Google / Facebook OAuth).</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">{t("privacy2Title")}</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li>{t("privacy2Item1")}</li>
              <li>{t("privacy2Item2")}</li>
              <li>{t("privacy2Item3")}</li>
              <li>{t("privacy2Item4")}</li>
              <li><span className="font-medium text-gray-800">Medical & dietary data:</span> allergies, dietary requirements (collected only where voluntarily submitted)</li>
              <li><span className="font-medium text-gray-800">Financial data:</span> payment records — no full card or bank account numbers are stored</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Purposes and legal basis</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-2 pr-4 font-semibold text-gray-800">Purpose</th>
                    <th className="text-left py-2 font-semibold text-gray-800">Legal basis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    ["Tournament registration and administration", "Contract performance"],
                    ["Authentication via Google / Facebook", "Legitimate interests / consent"],
                    ["Hotel booking and logistics", "Contract performance"],
                    ["Publishing names in match schedules", "Legitimate interests"],
                    ["Financial accounting", "Legal obligation"],
                    ["Marketing communications from Goality", "Legitimate interests (opt-out available)"],
                  ].map(([p, b]) => (
                    <tr key={p}>
                      <td className="py-2.5 pr-4 text-gray-600">{p}</td>
                      <td className="py-2.5 text-gray-600">{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">{t("privacy3Title")}</h2>
            <p>{t("privacy3Body")}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">{t("privacy4Title")}</h2>
            <p>{t("privacy4Body")}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">{t("privacy5Title")}</h2>
            <p>{t("privacy5Body")}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Your rights (GDPR)</h2>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li>Access the personal data we hold about you</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Request deletion of your data — see our <Link href="/data-deletion" className="text-blue-600 hover:underline">{t("deletionTitle")}</Link> page</li>
              <li>Object to processing based on legitimate interests</li>
              <li>Request restriction of processing</li>
              <li>Data portability (where applicable)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">{t("privacy6Title")}</h2>
            <p className="mb-3">{t("privacy6Body")}</p>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="font-semibold text-gray-900">Goality Sport Group OÜ</p>
              <p className="text-gray-500">Tallinn, Estonia</p>
              <a href="mailto:privacy@goality.app" className="text-blue-600 hover:underline">
                privacy@goality.app
              </a>
            </div>
          </section>

        </div>

        <div className="mt-10 pt-6 border-t border-gray-200 text-xs text-gray-400 text-center">
          <p>© {new Date().getFullYear()} Goality Sport Group OÜ. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
