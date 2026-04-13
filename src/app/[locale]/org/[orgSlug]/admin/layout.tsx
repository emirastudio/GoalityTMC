import { OrgAdminSidebar } from "@/components/admin/org-admin-sidebar";
import { OrgAdminMobileNav } from "@/components/admin/org-admin-mobile-nav";
import { ListingAdminSidebar } from "@/components/admin/listing-admin-sidebar";
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

  const isListing = (organization as any).type === "listing";

  return (
    <ThemeProvider defaultTheme="light">
      <div className="flex flex-col min-h-screen" style={{ background: "var(--cat-bg)" }}>
        <GlobalHeader rightContent={<AdminHeaderActions logoutLabel={t("logOut")} isSuper={!!session.isSuper} currentArea="org" />} />
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div className="hidden md:flex">
            {isListing ? (
              <ListingAdminSidebar orgSlug={orgSlug} orgName={organization.name} orgLogo={organization.logo ?? null} />
            ) : (
              <OrgAdminSidebar orgSlug={orgSlug} orgName={organization.name} orgLogo={organization.logo ?? null} />
            )}
          </div>
          <main className="flex-1 p-4 md:p-8 min-w-0 admin-main-bg mobile-nav-offset md:pb-8">
            {children}
          </main>
        </div>
        {!isListing && (
          <OrgAdminMobileNav orgSlug={orgSlug} orgName={organization.name} orgLogo={organization.logo ?? null} />
        )}
      </div>
    </ThemeProvider>
  );
}
