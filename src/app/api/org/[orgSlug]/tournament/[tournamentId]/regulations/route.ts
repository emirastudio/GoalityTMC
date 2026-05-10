import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournaments, organizations, tournamentClasses } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { multilangFromRow, multilangToPayload, type MultilangValue } from "@/lib/i18n-text";

// GET /api/org/[orgSlug]/tournament/[tournamentId]/regulations
// PATCH same path
//
// Управляет MARKDOWN-текстом регламента. Файлы — отдельный эндпоинт
// /documents (см. соседний роут).
//
// Возвращает:
//   { tournament: { textML }, classes: [{ id, name, textML }] }
//
// PATCH принимает:
//   { tournament?: MultilangValue, classes?: { [classId]: MultilangValue } }

async function authoriseTournament(orgSlug: string, tournamentId: number) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { error: "Unauthorized", status: 401 } as const;
  }
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, orgSlug),
  });
  if (!org) return { error: "Org not found", status: 404 } as const;

  // Org admins ограничены своей организацией.
  if (!session.isSuper && session.organizationId && session.organizationId !== org.id) {
    return { error: "Forbidden", status: 403 } as const;
  }

  const tournament = await db.query.tournaments.findFirst({
    where: and(eq(tournaments.id, tournamentId), eq(tournaments.organizationId, org.id)),
  });
  if (!tournament) return { error: "Tournament not found", status: 404 } as const;

  return { ok: true as const, tournament, org };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; tournamentId: string }> },
) {
  const { orgSlug, tournamentId } = await params;
  const tid = parseInt(tournamentId);
  const auth = await authoriseTournament(orgSlug, tid);
  if (!auth.ok) return NextResponse.json(auth, { status: auth.status });

  const classes = await db
    .select()
    .from(tournamentClasses)
    .where(eq(tournamentClasses.tournamentId, tid))
    .orderBy(asc(tournamentClasses.id));

  return NextResponse.json({
    tournament: {
      textML: multilangFromRow(
        auth.tournament as unknown as Record<string, unknown>,
        "regulationsText",
      ),
    },
    classes: classes.map((c) => ({
      id:     c.id,
      name:   c.name,
      format: c.format,
      textML: multilangFromRow(c as unknown as Record<string, unknown>, "regulationsText"),
    })),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; tournamentId: string }> },
) {
  const { orgSlug, tournamentId } = await params;
  const tid = parseInt(tournamentId);
  const auth = await authoriseTournament(orgSlug, tid);
  if (!auth.ok) return NextResponse.json(auth, { status: auth.status });

  const body = await req.json().catch(() => ({}));

  // Tournament-level update.
  if (body.tournament && typeof body.tournament === "object") {
    const ml = sanitizeMultilang(body.tournament);
    await db
      .update(tournaments)
      .set({
        ...multilangToPayload("regulationsText", ml),
        updatedAt: new Date(),
      })
      .where(eq(tournaments.id, tid));
  }

  // Per-class updates. body.classes = { [classId]: MultilangValue }.
  if (body.classes && typeof body.classes === "object" && !Array.isArray(body.classes)) {
    for (const [classIdRaw, valRaw] of Object.entries(body.classes)) {
      const cid = parseInt(classIdRaw, 10);
      if (!Number.isFinite(cid)) continue;
      // Sanity-check: класс принадлежит этому турниру.
      const [cls] = await db
        .select({ id: tournamentClasses.id })
        .from(tournamentClasses)
        .where(and(eq(tournamentClasses.id, cid), eq(tournamentClasses.tournamentId, tid)))
        .limit(1);
      if (!cls) continue;
      const ml = sanitizeMultilang(valRaw);
      await db
        .update(tournamentClasses)
        .set(multilangToPayload("regulationsText", ml))
        .where(eq(tournamentClasses.id, cid));
    }
  }

  return NextResponse.json({ ok: true });
}

// MultilangValue приходит из client'а — гарантируем что 4 ключа есть и
// все строки. Лишнее отбрасываем, чтобы не закидывать в БД мусор.
function sanitizeMultilang(raw: unknown): MultilangValue {
  const out: MultilangValue = { en: "", ru: "", et: "", es: "" };
  if (!raw || typeof raw !== "object") return out;
  const r = raw as Record<string, unknown>;
  for (const k of ["en", "ru", "et", "es"] as const) {
    const v = r[k];
    if (typeof v === "string") out[k] = v;
  }
  return out;
}
