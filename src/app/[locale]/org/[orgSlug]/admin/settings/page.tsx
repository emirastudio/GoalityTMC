import { getSession } from "@/lib/auth";
import { authorizeOrg } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { Settings } from "lucide-react";
import { OrgLegalActions } from "./legal-actions";
import { OrgAdminTeam } from "./admin-team";

type Props = {
  params: Promise<{ locale: string; orgSlug: string }>;
};

export default async function OrgSettingsPage({ params }: Props) {
  const { locale, orgSlug } = await params;
  const session = await getSession();
  if (!session || session.role !== "admin") redirect(`/${locale}/login`);

  const { authorized, organization } = await authorizeOrg(session, orgSlug);
  if (!authorized || !organization) redirect(`/${locale}/login`);

  const t = await getTranslations("orgAdmin");

  async function saveSettings(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session || session.role !== "admin") return;
    const { authorized, organization } = await authorizeOrg(session, orgSlug);
    if (!authorized || !organization) return;

    await db.update(organizations)
      .set({
        name: (formData.get("name") as string)?.trim() || organization.name,
        country: (formData.get("country") as string)?.trim() || null,
        city: (formData.get("city") as string)?.trim() || null,
        contactEmail: (formData.get("contactEmail") as string)?.trim() || null,
        contactPhone: (formData.get("contactPhone") as string)?.trim() || null,
        website: (formData.get("website") as string)?.trim() || null,
        currency: (formData.get("currency") as string)?.trim() || "EUR",
        defaultLocale: (formData.get("defaultLocale") as string) || "en",
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organization.id));

    revalidatePath(`/${locale}/org/${orgSlug}/admin/settings`);
  }

  const inputCls = "w-full rounded-lg px-3 py-2 text-sm th-input border th-border th-text outline-none focus:border-[var(--cat-accent)] focus:ring-1 focus:ring-[var(--cat-accent)]/20";
  const labelCls = "block text-xs font-medium th-text-2 mb-1";

  return (
    <div className="space-y-6 w-full">
      {/* Заголовок */}
      <div className="flex items-center gap-3">
        <Settings className="w-5 h-5" style={{ color: "var(--cat-accent)" }} />
        <h1 className="text-xl font-bold th-text">{t("settings")}</h1>
      </div>

      <form action={saveSettings} className="space-y-4 max-w-xl">
        <div className="th-card border th-border rounded-xl p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide th-text-m">
            {t("organization")}
          </p>

          <div>
            <label className={labelCls}>{t("orgName")}</label>
            <input name="name" defaultValue={organization.name} className={inputCls} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t("country")}</label>
              <input name="country" defaultValue={organization.country ?? ""} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t("city")}</label>
              <input name="city" defaultValue={organization.city ?? ""} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t("currency")}</label>
              <select name="currency" defaultValue={organization.currency} className={inputCls}>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{t("language")}</label>
              <select name="defaultLocale" defaultValue={organization.defaultLocale} className={inputCls}>
                <option value="en">English</option>
                <option value="ru">Русский</option>
                <option value="et">Eesti</option>
              </select>
            </div>
          </div>
        </div>

        <div className="th-card border th-border rounded-xl p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide th-text-m">
            {t("contacts")}
          </p>

          <div>
            <label className={labelCls}>{t("contactEmail")}</label>
            <input name="contactEmail" type="email" defaultValue={organization.contactEmail ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t("contactPhone")}</label>
            <input name="contactPhone" defaultValue={organization.contactPhone ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t("website")}</label>
            <input name="website" defaultValue={organization.website ?? ""} className={inputCls} />
          </div>
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium"
          style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)" }}
        >
          {t("save")}
        </button>
      </form>

      <OrgAdminTeam orgSlug={orgSlug} />
      <OrgLegalActions orgSlug={orgSlug} orgName={organization.name} />
    </div>
  );
}
