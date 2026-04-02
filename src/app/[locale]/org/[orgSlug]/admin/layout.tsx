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
    <div className="flex min-h-screen" style={{ background: "var(--cat-bg)" }} data-theme="light">
      <div data-theme="dark" className="contents">
        <OrgAdminSidebar orgSlug={orgSlug} orgName={organization.name} />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-[#1C2121] border-b border-white/6 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-mint" />
            <span className="text-sm font-semibold text-white/70">{organization.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/25 hidden sm:block">Admin Panel</span>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="text-xs font-medium text-white/30 hover:text-white/60 transition-colors cursor-pointer px-2 py-1 rounded-md hover:bg-white/6">
                Log out
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 p-6 md:p-8" data-theme="light" style={{ background: "var(--cat-bg)" }}>{children}</main>
      </div>
    </div>
  );
}
