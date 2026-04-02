import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { ThemeProvider, ThemeToggle } from "@/components/ui/theme-provider";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
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
    <ThemeProvider defaultTheme="dark">
      <div className="flex min-h-screen" style={{ background: "var(--cat-bg)" }}>
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <header className="flex items-center justify-end gap-3 px-8 py-4" style={{ background: "var(--cat-bg)" }}>
            <ThemeToggle />
            <LanguageSwitcher />
          </header>
          <main className="flex-1 p-8" style={{ background: "var(--cat-bg)" }}>{children}</main>
        </div>
      </div>
    </ThemeProvider>
  );
}
