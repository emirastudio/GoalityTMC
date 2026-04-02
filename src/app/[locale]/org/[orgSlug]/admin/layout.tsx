import { OrgAdminSidebar } from "@/components/admin/org-admin-sidebar";
import { getSession } from "@/lib/auth";
import { authorizeOrg } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { GlobalHeader, AdminHeaderActions } from "@/components/ui/global-header";
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
      <div className="flex flex-col min-h-screen" style={{ background: "var(--cat-bg)" }}>
        <GlobalHeader rightContent={<AdminHeaderActions logoutLabel={t("logOut")} isSuper={!!session.isSuper} currentArea="org" />} />
        <div className="flex flex-1 min-h-0">
          <OrgAdminSidebar orgSlug={orgSlug} orgName={organization.name} />
          <main className="flex-1 p-6 md:p-8 min-w-0 admin-main-bg">
            {children}
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
