import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournaments, tournamentStadiums, tournamentFields, tournamentClasses } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireGameAdmin, isError } from "@/lib/game-auth";
import { slugify } from "@/lib/tenant";

type Params = { orgSlug: string; tournamentId: string };

export async function POST(req: NextRequest, { params }: { params: Promise<Params> }) {
  const ctx = await requireGameAdmin(req, await params);
  if (isError(ctx)) return ctx;

  const source = ctx.tournament;
  const newName = `${source.name} (copy)`;
  let baseSlug = slugify(newName);
  let slug = baseSlug;
  let attempt = 0;
  while (attempt < 10) {
    const existing = await db.query.tournaments.findFirst({
      where: and(
        eq(tournaments.organizationId, ctx.organizationId),
        eq(tournaments.slug, slug)
      ),
    });
    if (!existing) break;
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  const [newTournament] = await db
    .insert(tournaments)
    .values({
      organizationId: ctx.organizationId,
      name: newName,
      slug,
      year: source.year,
      currency: source.currency,
      country: source.country,
      city: source.city,
      specificDays: source.specificDays,
      hasAccommodation: source.hasAccommodation,
      hasMeals: source.hasMeals,
      hasTransfer: source.hasTransfer,
      plan: source.plan,
      startDate: null,
      endDate: null,
      coverUrl: source.coverUrl ?? "/defaults/tournament-cover-default.jpg",
      cardImageUrl: source.cardImageUrl ?? "/defaults/tournament-card-default.jpg",
      logoUrl: source.logoUrl,
      registrationOpen: false,
    })
    .returning();

  const sourceStadiums = await db
    .select()
    .from(tournamentStadiums)
    .where(eq(tournamentStadiums.tournamentId, source.id));

  const stadiumIdMap = new Map<number, number>();
  for (const stadium of sourceStadiums) {
    const [newStadium] = await db
      .insert(tournamentStadiums)
      .values({
        tournamentId: newTournament.id,
        name: stadium.name,
        address: stadium.address,
        contactName: stadium.contactName,
        contactPhone: stadium.contactPhone,
        mapsUrl: stadium.mapsUrl,
        wazeUrl: stadium.wazeUrl,
        notes: stadium.notes,
        photoUrl: stadium.photoUrl,
        sortOrder: stadium.sortOrder,
      })
      .returning();
    stadiumIdMap.set(stadium.id, newStadium.id);
  }

  const sourceFields = await db
    .select()
    .from(tournamentFields)
    .where(eq(tournamentFields.tournamentId, source.id));

  if (sourceFields.length > 0) {
    await db.insert(tournamentFields).values(
      sourceFields.map(field => ({
        tournamentId: newTournament.id,
        stadiumId: field.stadiumId ? (stadiumIdMap.get(field.stadiumId) ?? null) : null,
        name: field.name,
        address: field.address,
        mapUrl: field.mapUrl,
        scheduleUrl: field.scheduleUrl,
        notes: field.notes,
        sortOrder: field.sortOrder,
      }))
    );
  }

  const sourceClasses = await db
    .select()
    .from(tournamentClasses)
    .where(eq(tournamentClasses.tournamentId, source.id));

  if (sourceClasses.length > 0) {
    await db.insert(tournamentClasses).values(
      sourceClasses.map(cls => ({
        tournamentId: newTournament.id,
        name: cls.name,
        format: cls.format,
        minBirthYear: cls.minBirthYear,
        maxBirthYear: cls.maxBirthYear,
        maxPlayers: cls.maxPlayers,
        maxStaff: cls.maxStaff,
        maxTeams: cls.maxTeams,
        scheduleConfig: cls.scheduleConfig,
        startDate: null,
        endDate: null,
      }))
    );
  }

  return NextResponse.json({ id: newTournament.id }, { status: 201 });
}
