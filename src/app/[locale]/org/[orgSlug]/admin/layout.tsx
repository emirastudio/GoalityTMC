import { OrgAdminSidebar } from "@/components/admin/org-admin-sidebar";
import { getSession } from "@/lib/auth";
import { authorizeOrg } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { ThemeProvider, ThemeToggle } from "@/components/ui/theme-provider";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { getTranslations } from "next-intl/server";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string; orgSlug: string }>;
};

export default async function OrgAdminLayout({ children, params }: Props) {
  const { locale, orgSlug } = await params;
  const session = await getSession();

  if (!session || session.role !== "admin") {
    redirect(`/${locale}/login`);
  }

  const { authorized, organization } = await authorizeOrg(session, orgSlug);
  if (!authorized || !organization) {
    redirect(`/${locale}/login`);
  }

  const t = await getTranslations("orgAdmin");

  return (
    <ThemeProvider defaultTheme="light">
      <div className="flex min-h-screen" style={{ background: "var(--cat-bg)" }}>
        <OrgAdminSidebar orgSlug={orgSlug} orgName={organization.name} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b px-6 flex items-center justify-between shrink-0"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full" style={{ background: "var(--cat-accent)", boxShadow: "0 0 6px var(--cat-accent-glow)" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--cat-text-secondary)" }}>{organization.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs hidden sm:block" style={{ color: "var(--cat-text-muted)" }}>{t("adminPanel")}</span>
              <LanguageSwitcher variant="light" />
              <ThemeToggle />
              <form action="/api/auth/logout" method="POST">
                <button type="submit"
                  className="text-xs font-medium transition-colors cursor-pointer px-2 py-1 rounded-md hover:opacity-70"
                  style={{ color: "var(--cat-text-muted)" }}>
                  {t("logOut")}
                </button>
              </form>
            </div>
          </header>
          <main className="flex-1 p-6 md:p-8" style={{ background: "var(--cat-bg)" }}>
            {children}
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
