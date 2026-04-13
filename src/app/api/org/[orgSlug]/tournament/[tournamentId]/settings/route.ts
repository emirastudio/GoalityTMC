import { NextRequest, NextResponse } from "next/server";
import { requireGameAdmin } from "@/lib/game-auth";
import { db } from "@/db";
import { tournaments, tournamentFields } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

type Params = { orgSlug: string; tournamentId: string };

// GET /api/org/[orgSlug]/tournament/[tournamentId]/settings
// Возвращает все основные настройки турнира: имя, даты, локация, поля, медиа, сервисы
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (ctx instanceof NextResponse) return ctx;

  const [row] = await db
    .select({
      id:               tournaments.id,
      name:             tournaments.name,
      year:             tournaments.year,
      currency:         tournaments.currency,
      startDate:        tournaments.startDate,
      endDate:          tournaments.endDate,
      specificDays:     tournaments.specificDays,
      country:          tournaments.country,
      city:             tournaments.city,
      hasAccommodation: tournaments.hasAccommodation,
      hasMeals:         tournaments.hasMeals,
      hasTransfer:      tournaments.hasTransfer,
      logoUrl:          tournaments.logoUrl,
      coverUrl:         tournaments.coverUrl,
      cardImageUrl:     tournaments.cardImageUrl,
      registrationOpen: tournaments.registrationOpen,
    })
    .from(tournaments)
    .where(eq(tournaments.id, ctx.tournament.id))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Список полей (стадионов/площадок)
  const fields = await db
    .select({
      id:        tournamentFields.id,
      name:      tournamentFields.name,
      address:   tournamentFields.address,
      mapUrl:    tournamentFields.mapUrl,
      notes:     tournamentFields.notes,
      sortOrder: tournamentFields.sortOrder,
    })
    .from(tournamentFields)
    .where(eq(tournamentFields.tournamentId, ctx.tournament.id))
    .orderBy(asc(tournamentFields.sortOrder));

  return NextResponse.json({
    ...row,
    // specificDays хранится как JSON-строка
    specificDays: row.specificDays ? JSON.parse(row.specificDays) : [],
    fields,
  });
}

// PATCH /api/org/[orgSlug]/tournament/[tournamentId]/settings
// Обновляет основные настройки турнира
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const p = await params;
  const ctx = await requireGameAdmin(req, p);
  if (ctx instanceof NextResponse) return ctx;

  const body = await req.json();

  const {
    name,
    year,
    currency,
    startDate,
    endDate,
    specificDays,
    country,
    city,
    hasAccommodation,
    hasMeals,
    hasTransfer,
    // fields — опциональный список для обновления
    fields,
  } = body;

  // Обновляем основные поля турнира
  await db
    .update(tournaments)
    .set({
      ...(name       !== undefined && { name: name.trim() }),
      ...(year       !== undefined && { year: Number(year) }),
      ...(currency   !== undefined && { currency }),
      ...(startDate  !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(endDate    !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      ...(specificDays !== undefined && {
        specificDays: Array.isArray(specificDays) && specificDays.length > 0
          ? JSON.stringify(specificDays)
          : null,
      }),
      ...(country          !== undefined && { country: country || null }),
      ...(city             !== undefined && { city: city || null }),
      ...(hasAccommodation !== undefined && { hasAccommodation: Boolean(hasAccommodation) }),
      ...(hasMeals         !== undefined && { hasMeals: Boolean(hasMeals) }),
      ...(hasTransfer      !== undefined && { hasTransfer: Boolean(hasTransfer) }),
      updatedAt: new Date(),
    })
    .where(eq(tournaments.id, ctx.tournament.id));

  // Обновляем поля/площадки если переданы
  if (Array.isArray(fields)) {
    for (const field of fields) {
      if (field.id) {
        // Обновляем существующее поле
        await db
          .update(tournamentFields)
          .set({
            name:      field.name ?? undefined,
            address:   field.address ?? null,
            mapUrl:    field.mapUrl ?? null,
            notes:     field.notes ?? null,
            sortOrder: field.sortOrder ?? 0,
          })
          .where(eq(tournamentFields.id, field.id));
      } else if (field.name?.trim()) {
        // Создаём новое поле
        await db.insert(tournamentFields).values({
          tournamentId: ctx.tournament.id,
          name:      field.name.trim(),
          address:   field.address || "",
          mapUrl:    field.mapUrl || "",
          notes:     field.notes || "",
          sortOrder: field.sortOrder ?? 0,
        });
      }
    }

    // Удаляем поля которых нет в новом списке
    const keepIds = fields.filter((f: { id?: number }) => f.id).map((f: { id: number }) => f.id);
    if (keepIds.length >= 0) {
      const allFields = await db
        .select({ id: tournamentFields.id })
        .from(tournamentFields)
        .where(eq(tournamentFields.tournamentId, ctx.tournament.id));

      for (const existing of allFields) {
        if (!keepIds.includes(existing.id)) {
          await db.delete(tournamentFields).where(eq(tournamentFields.id, existing.id));
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
