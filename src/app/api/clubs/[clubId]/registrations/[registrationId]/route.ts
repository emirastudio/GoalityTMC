import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournamentRegistrations, tournamentClasses, teams } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// Coach-side management for a single tournament_registration the club
// owns. The coach can withdraw their own registration entirely (DELETE)
// or edit its class / displayName / squad alias (PATCH).
//
// Auth rules:
//   • club admin (session.teamId == null) — any team of the club
//   • team coach (session.teamId set)     — only their own team
//   • everyone else                        — forbidden

async function authorise(
  session: Awaited<ReturnType<typeof getSession>>,
  clubId: number,
  registrationId: number,
) {
  if (!session || session.role !== "club" || !session.clubId) {
    return { ok: false, status: 401, error: "Unauthorized" } as const;
  }
  if (session.clubId !== clubId) {
    return { ok: false, status: 403, error: "Forbidden" } as const;
  }
  const [reg] = await db
    .select({
      id: tournamentRegistrations.id,
      teamId: tournamentRegistrations.teamId,
      tournamentId: tournamentRegistrations.tournamentId,
      classId: tournamentRegistrations.classId,
      squadAlias: tournamentRegistrations.squadAlias,
      displayName: tournamentRegistrations.displayName,
      status: tournamentRegistrations.status,
      teamClubId: teams.clubId,
    })
    .from(tournamentRegistrations)
    .innerJoin(teams, eq(teams.id, tournamentRegistrations.teamId))
    .where(eq(tournamentRegistrations.id, registrationId));
  if (!reg) {
    return { ok: false, status: 404, error: "Registration not found" } as const;
  }
  if (reg.teamClubId !== clubId) {
    return { ok: false, status: 403, error: "Registration belongs to another club" } as const;
  }
  if (session.teamId && session.teamId !== reg.teamId) {
    return {
      ok: false,
      status: 403,
      error: "Coaches can only manage their own team",
    } as const;
  }
  return { ok: true as const, reg };
}

// DELETE /api/clubs/[clubId]/registrations/[registrationId]
// Withdraw the registration entirely. Hard-delete so the team can
// re-register cleanly (the unique-on-(team, tournament, alias) index
// otherwise blocks a fresh attempt).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ clubId: string; registrationId: string }> }
) {
  const session = await getSession();
  const { clubId, registrationId } = await params;
  const cid = parseInt(clubId);
  const rid = parseInt(registrationId);
  const auth = await authorise(session, cid, rid);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  await db.delete(tournamentRegistrations).where(eq(tournamentRegistrations.id, rid));
  return NextResponse.json({ ok: true });
}

// PATCH /api/clubs/[clubId]/registrations/[registrationId]
// Edit fields the coach is allowed to change after the fact:
//   classId, displayName, squadAlias.
// Status / regNumber / teamId stay locked — those are the organizer's
// to manage. classId must be a class of the SAME tournament. Changing
// alias re-checks the unique constraint.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ clubId: string; registrationId: string }> }
) {
  const session = await getSession();
  const { clubId, registrationId } = await params;
  const cid = parseInt(clubId);
  const rid = parseInt(registrationId);
  const auth = await authorise(session, cid, rid);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const reg = auth.reg;

  const body = await req.json().catch(() => ({}));
  const patch: { classId?: number; displayName?: string | null; squadAlias?: string } = {};

  if (body.classId !== undefined) {
    const newClassId = parseInt(String(body.classId));
    if (!Number.isFinite(newClassId)) {
      return NextResponse.json({ error: "Invalid classId" }, { status: 400 });
    }
    const [cls] = await db
      .select()
      .from(tournamentClasses)
      .where(eq(tournamentClasses.id, newClassId));
    if (!cls || cls.tournamentId !== reg.tournamentId) {
      return NextResponse.json(
        { error: "Class does not belong to this tournament" },
        { status: 400 }
      );
    }
    patch.classId = newClassId;
  }

  if (body.displayName !== undefined) {
    const dn = typeof body.displayName === "string" ? body.displayName.trim() : null;
    patch.displayName = dn || null;
  }

  if (body.squadAlias !== undefined) {
    const alias = typeof body.squadAlias === "string" ? body.squadAlias.trim() : "";
    if (alias !== reg.squadAlias) {
      // Re-check the unique-by-(team, tournament, alias) constraint.
      const [conflict] = await db
        .select({ id: tournamentRegistrations.id })
        .from(tournamentRegistrations)
        .where(
          and(
            eq(tournamentRegistrations.teamId, reg.teamId),
            eq(tournamentRegistrations.tournamentId, reg.tournamentId),
            eq(tournamentRegistrations.squadAlias, alias),
            ne(tournamentRegistrations.id, reg.id),
          )
        )
        .limit(1);
      if (conflict) {
        return NextResponse.json(
          { error: "Another registration of this team already uses that alias.", code: "DUPLICATE_ALIAS" },
          { status: 409 }
        );
      }
    }
    patch.squadAlias = alias;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  await db
    .update(tournamentRegistrations)
    .set(patch)
    .where(eq(tournamentRegistrations.id, rid));

  return NextResponse.json({ ok: true });
}
