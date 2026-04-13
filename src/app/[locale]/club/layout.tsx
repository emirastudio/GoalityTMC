import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { clubs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { GlobalHeader, AdminHeaderActions } from "@/components/ui/global-header";
import { getTranslations } from "next-intl/server";
import { ClubSidebar } from "./club-sidebar";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function ClubLayout({ children, params }: Props) {
  const { locale } = await params;
  const session = await getSession();

  if (!session || session.role !== "club" || !session.clubId) {
    redirect(`/${locale}/login`);
  }

  const club = await db.query.clubs.findFirst({
    where: eq(clubs.id, session.clubId),
  });

  if (!club) redirect(`/${locale}/login`);

  const t = await getTranslations("clubDashboard");

  return (
    <ThemeProvider defaultTheme="dark">
      <div className="flex flex-col min-h-screen" style={{ background: "var(--cat-bg)" }}>
        <GlobalHeader
          rightContent={
            <AdminHeaderActions
              logoutLabel={t("logout")}
              isSuper={!!session.isSuper}
              currentArea="team"
            />
          }
        />
        <div className="flex flex-1 min-h-0">
          {/* Sidebar — desktop only */}
          <div className="hidden md:flex">
            <ClubSidebar
              clubName={club.name}
              clubBadge={club.badgeUrl ?? null}
            />
          </div>
          <main className="flex-1 p-4 md:p-8 min-w-0 admin-main-bg">
            {children}
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
