import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  clubs,
  clubUsers,
  teams,
  tournamentRegistrations,
  registrationAttempts,
} from "@/db/schema";
import { eq, gt, lt, and, between } from "drizzle-orm";

// GET /api/health/registration-integrity?windowMinutes=120
//
// Runs the post-deploy invariants we care about most. Designed for the
// CI smoke test (runs immediately after the SHA-match check) and an
// hourly cron — both fail loudly if any invariant breaks.
//
// What we check (only against rows that actually represent real public
// registrations, so seeded global-catalog clubs don't trip the alarm):
//
//   1. Every successful registration_attempts row in the last
//      `windowMinutes` minutes points to a club that still exists and
//      has at least one clubUser.
//   2. At least one tournament_registration was created for that
//      club's teams in a tight window around the attempt
//      (T-2min … T+10min). This catches the AT-CREATION-TIME failure
//      mode (which is the regression we hit) without false-positives
//      for clubs that legitimately drift to zero regs over time:
//      tournaments end, organizers reject teams, clubs withdraw, etc.
//
// Attempts younger than `graceMinutes` (default 5) are skipped so a
// real registration in flight (multi-second tournament-registration
// loop) is never flagged as an anomaly.
//
// Returns 200 with { ok: true } when everything is fine, 500 with
// { ok: false, anomalies: [...] } otherwise. Optional auth: when
// HEALTH_TOKEN is set, the request must carry a matching x-health-token
// header. When unset (default), the endpoint is open — the data it
// returns is not sensitive (counts + ids).
export async function GET(req: NextRequest) {
  const expected = process.env.HEALTH_TOKEN;
  if (expected) {
    const got = req.headers.get("x-health-token");
    if (got !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const windowMinutes = Math.max(
    1,
    Math.min(7 * 24 * 60, parseInt(req.nextUrl.searchParams.get("windowMinutes") ?? "120"))
  );
  const graceMinutes = Math.max(
    1,
    Math.min(60, parseInt(req.nextUrl.searchParams.get("graceMinutes") ?? "5"))
  );
  const now = Date.now();
  const since = new Date(now - windowMinutes * 60 * 1000);
  const cutoff = new Date(now - graceMinutes * 60 * 1000);

  type Anomaly = {
    kind: "missing_club" | "missing_user" | "missing_registration";
    attemptId: number;
    clubId: number | null;
    clubName: string | null;
    contactEmail: string | null;
    createdAt: string;
  };
  const anomalies: Anomaly[] = [];

  // Restrict to attempts old enough that any in-flight registration
  // would already have settled (graceMinutes) but still inside the
  // probe window.
  const recent = await db
    .select({
      id: registrationAttempts.id,
      clubId: registrationAttempts.clubId,
      clubName: registrationAttempts.clubName,
      contactEmail: registrationAttempts.contactEmail,
      createdAt: registrationAttempts.createdAt,
    })
    .from(registrationAttempts)
    .where(
      and(
        eq(registrationAttempts.status, "success"),
        gt(registrationAttempts.createdAt, since),
        lt(registrationAttempts.createdAt, cutoff),
      )
    );

  for (const row of recent) {
    if (!row.clubId) continue; // shouldn't happen for status=success
    const [club] = await db.select().from(clubs).where(eq(clubs.id, row.clubId));
    if (!club) {
      anomalies.push({
        kind: "missing_club",
        attemptId: row.id,
        clubId: row.clubId,
        clubName: row.clubName,
        contactEmail: row.contactEmail,
        createdAt: row.createdAt.toISOString(),
      });
      continue;
    }
    const [usr] = await db
      .select({ id: clubUsers.id })
      .from(clubUsers)
      .where(eq(clubUsers.clubId, row.clubId))
      .limit(1);
    if (!usr) {
      anomalies.push({
        kind: "missing_user",
        attemptId: row.id,
        clubId: row.clubId,
        clubName: club.name,
        contactEmail: row.contactEmail,
        createdAt: row.createdAt.toISOString(),
      });
    }
    // Look for a tournament_registration created in a tight window
    // around the attempt — this is the precise failure mode of the
    // 2026-05-09 regression. Old clubs whose registrations have since
    // been deleted/closed/rejected don't trigger this — what's been
    // recorded at attempt time is what we care about.
    const lo = new Date(row.createdAt.getTime() - 2 * 60 * 1000);
    const hi = new Date(row.createdAt.getTime() + 10 * 60 * 1000);
    const [reg] = await db
      .select({ id: tournamentRegistrations.id })
      .from(tournamentRegistrations)
      .innerJoin(teams, eq(teams.id, tournamentRegistrations.teamId))
      .where(
        and(
          eq(teams.clubId, row.clubId),
          between(tournamentRegistrations.createdAt, lo, hi),
        )
      )
      .limit(1);
    if (!reg) {
      anomalies.push({
        kind: "missing_registration",
        attemptId: row.id,
        clubId: row.clubId,
        clubName: club.name,
        contactEmail: row.contactEmail,
        createdAt: row.createdAt.toISOString(),
      });
    }
  }

  const ok = anomalies.length === 0;
  return NextResponse.json(
    {
      ok,
      windowMinutes,
      checkedAttempts: recent.length,
      anomalies,
    },
    { status: ok ? 200 : 500 }
  );
}
