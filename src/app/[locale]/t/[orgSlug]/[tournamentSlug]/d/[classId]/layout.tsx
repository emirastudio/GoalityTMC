import { db } from "@/db";
import { tournamentClasses, teams } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { Shield } from "lucide-react";
import { DivisionTabNav } from "@/components/tournament/division-tab-nav";
import { getTranslations } from "next-intl/server";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string; orgSlug: string; tournamentSlug: string; classId: string }>;
};

const ACCENT_COLOR = "#2BFEBA";

export default async function DivisionLayout({ children, params }: Props) {
  const { orgSlug, tournamentSlug, classId } = await params;
  const t = await getTranslations("tournament");

  const cls = await db.query.tournamentClasses.findFirst({
    where: eq(tournamentClasses.id, parseInt(classId)),
  });

  const [teamCountRow] = await db
    .select({ count: count() })
    .from(teams)
    .where(and(eq(teams.classId, parseInt(classId))));

  const teamCount = Number(teamCountRow?.count ?? 0);
  const color = ACCENT_COLOR;

  return (
    <div>
      <div className="mb-6">
        {/* Division header card */}
        <div
          className="rounded-2xl border p-5 mb-4"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${color}18` }}
            >
              <Shield className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <h2 className="text-lg font-black" style={{ color: "var(--cat-text)" }}>
                {cls?.name ?? t("division")}
              </h2>
              <p className="text-[12px]" style={{ color: "var(--cat-text-muted)" }}>
                {cls?.format ?? ""}
                {cls?.minBirthYear ? ` · ${cls.minBirthYear}` : ""}
                {cls?.maxBirthYear && cls.maxBirthYear !== cls.minBirthYear ? `–${cls.maxBirthYear}` : ""}
                {" · "}
                {teamCount} {t("teams")}
              </p>
            </div>
          </div>
        </div>

        {/* Tab nav */}
        <DivisionTabNav base={`/t/${orgSlug}/${tournamentSlug}/d/${classId}`} />
      </div>

      {children}
    </div>
  );
}
