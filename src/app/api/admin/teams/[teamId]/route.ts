import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teams, tournamentRegistrations, clubs, tournaments } from "@/db/schema";
import { requireAdmin, isError } from "@/lib/api-auth";
import { eq } from "drizzle-orm";
import { sendRegistrationConfirmed, sendRegistrationRejected } from "@/lib/email";

// DELETE удаляет команду глобально (каскадно удаляет все её регистрации)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { teamId } = await params;
  const tid = parseInt(teamId);

  const [deleted] = await db.delete(teams).where(eq(teams.id, tid)).returning();
  if (!deleted) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}

// PATCH обновляет данные регистрации (статус, заметки, отель)
// Принимает registrationId в теле запроса
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { teamId } = await params;
  const tid = parseInt(teamId);
  const body = await req.json();

  // Глобальные поля команды (name — редко меняется)
  const teamUpdates: Record<string, unknown> = {};
  if (body.name !== undefined) teamUpdates.name = body.name;

  // Поля регистрации (status, notes, hotelId — турнирно-специфичные)
  const regUpdates: Record<string, unknown> = {};
  if (body.status !== undefined) regUpdates.status = body.status;
  if (body.notes !== undefined) regUpdates.notes = body.notes;
  if (body.hotelId !== undefined) regUpdates.hotelId = body.hotelId === "" ? null : body.hotelId;
  if (body.classId !== undefined) regUpdates.classId = body.classId === "" || body.classId === null ? null : Number(body.classId);
  // Sync displayName with name — "one truth": displayName is the canonical display field
  if (body.name !== undefined) regUpdates.displayName = body.name;

  // Обновляем глобальную команду если нужно
  if (Object.keys(teamUpdates).length > 0) {
    teamUpdates.updatedAt = new Date();
    await db.update(teams).set(teamUpdates).where(eq(teams.id, tid));
  }

  // Обновляем регистрацию: по registrationId (если передан) или по teamId (последняя)
  if (Object.keys(regUpdates).length > 0) {
    regUpdates.updatedAt = new Date();

    if (body.registrationId) {
      await db.update(tournamentRegistrations).set(regUpdates)
        .where(eq(tournamentRegistrations.id, body.registrationId));
    } else {
      // Fallback: обновляем регистрацию с наибольшим id для этой команды
      const latestReg = await db.query.tournamentRegistrations.findFirst({
        where: eq(tournamentRegistrations.teamId, tid),
        orderBy: (r, { desc }) => [desc(r.id)],
      });
      if (latestReg) {
        await db.update(tournamentRegistrations).set(regUpdates)
          .where(eq(tournamentRegistrations.id, latestReg.id));
      }
    }
  }

  // Возвращаем обновлённую команду с последней регистрацией и клубом
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, tid),
    with: {
      registrations: { orderBy: (r, { desc }) => [desc(r.id)], limit: 1 },
      club: true,
    },
  });

  // ── Email notification on status change ────────────────────
  if (body.status === "confirmed" || body.status === "rejected") {
    (async () => {
      try {
        const club = (team as any)?.club ?? null;
        const reg = team?.registrations?.[0];
        const tournament = reg?.tournamentId
          ? await db.query.tournaments.findFirst({ where: eq(tournaments.id, reg.tournamentId) })
          : null;

        if (!club?.contactEmail || !team) return;

        const payload = {
          to: club.contactEmail,
          clubName: club.name,
          teamName: team.name ?? "Your team",
          tournamentName: tournament?.name ?? "the tournament",
          notes: body.notes ?? null,
        };

        if (body.status === "confirmed") {
          await sendRegistrationConfirmed({ ...payload, tournamentSlug: tournament?.slug });
        } else {
          await sendRegistrationRejected(payload);
        }
      } catch (e) {
        console.error("[EMAIL] Status notification failed:", e);
      }
    })();
  }

  return NextResponse.json(team);
}
