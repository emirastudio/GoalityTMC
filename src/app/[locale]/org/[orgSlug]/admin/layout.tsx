import { OrgAdminSidebar } from "@/components/admin/org-admin-sidebar";
import { getSession } from "@/lib/auth";
import { authorizeOrg } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { ThemeProvider } from "@/components/ui/theme-provider";
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
      <div className="flex min-h-screen bg-gray-50">
        <OrgAdminSidebar orgSlug={orgSlug} orgName={organization.name} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-gray-200 bg-white px-6 flex items-center justify-between shrink-0">
            <span className="text-sm font-medium text-gray-700">{organization.name}</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 hidden sm:block">{t("adminPanel")}</span>
              <form action="/api/auth/logout" method="POST">
                <button type="submit"
                  className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer px-2 py-1">
                  {t("logOut")}
                </button>
              </form>
            </div>
          </header>
          <main className="flex-1 p-6 md:p-8 bg-gray-50">
            {children}
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
