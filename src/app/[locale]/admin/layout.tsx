import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  const session = await getSession();

  if (!session || session.role !== "admin") {
    redirect(`/${locale}/login`);
  }

  // Only super admins can access /admin (platform-level)
  // Org admins should use /org/[slug]/admin
  if (!session.isSuper) {
    if (session.organizationSlug) {
      redirect(`/${locale}/org/${session.organizationSlug}/admin`);
    }
    redirect(`/${locale}/login`);
  }

  return (
    <div className="flex min-h-screen" data-theme="light" style={{ background: "var(--cat-bg)" }}>
      <div data-theme="dark" className="contents">
        <AdminSidebar />
      </div>
      <main className="flex-1 p-8" data-theme="light" style={{ background: "var(--cat-bg)" }}>{children}</main>
    </div>
  );
}
