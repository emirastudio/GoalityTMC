import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { GlobalHeader, AdminHeaderActions } from "@/components/ui/global-header";
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

  if (!session.isSuper) {
    if (session.organizationSlug) {
      redirect(`/${locale}/org/${session.organizationSlug}/admin`);
    }
    redirect(`/${locale}/login`);
  }

  return (
    <ThemeProvider defaultTheme="light">
      <div className="flex flex-col min-h-screen" style={{ background: "var(--cat-bg)" }}>
        <GlobalHeader rightContent={<AdminHeaderActions />} />
        <div className="flex flex-1 min-h-0">
          <AdminSidebar />
          <main className="flex-1 p-8" style={{ background: "var(--cat-bg)" }}>{children}</main>
        </div>
      </div>
    </ThemeProvider>
  );
}
