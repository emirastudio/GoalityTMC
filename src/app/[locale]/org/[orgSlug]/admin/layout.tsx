import { OrgAdminSidebar } from "@/components/admin/org-admin-sidebar";
import { getSession } from "@/lib/auth";
import { authorizeOrg } from "@/lib/tenant";
import { redirect } from "next/navigation";

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

  return (
    <div className="flex min-h-screen" data-theme="dark" style={{ background: "var(--cat-bg)" }}>
      <OrgAdminSidebar orgSlug={orgSlug} orgName={organization.name} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-white/6 px-6 flex items-center justify-between shrink-0"
          style={{ background: "var(--cat-header-bg)", borderColor: "var(--cat-header-border)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full" style={{ background: "var(--cat-accent)", boxShadow: "0 0 6px var(--cat-accent-glow)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--cat-text-secondary)" }}>{organization.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs hidden sm:block" style={{ color: "var(--cat-text-muted)" }}>Admin Panel</span>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="text-xs font-medium transition-colors cursor-pointer px-2 py-1 rounded-md hover:bg-white/6"
                style={{ color: "var(--cat-text-muted)" }}>
                Log out
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 p-6 md:p-8" style={{ background: "var(--cat-bg)" }}>{children}</main>
      </div>
    </div>
  );
}
