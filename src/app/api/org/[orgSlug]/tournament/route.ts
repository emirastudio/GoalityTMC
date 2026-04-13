import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { authorizeOrg, slugify } from "@/lib/tenant";
import { db } from "@/db";
import { tournaments, tournamentFields } from "@/db/schema";
import { eq, and, isNull, count } from "drizzle-orm";

type Params = { orgSlug: string };

interface StadiumInput {
  name: string;
  fieldCount: number;
}

// POST /api/org/[orgSlug]/tournament — create new tournament
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { orgSlug } = await params;
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { authorized, organization } = await authorizeOrg(session, orgSlug);
  if (!authorized || !organization) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    name,
    year,
    currency,
    plan: requestedPlan,
    startDate,
    endDate,
    specificDays,
    country,
    city,
    hasAccommodation = false,
    hasMeals = false,
    hasTransfer = false,
    stadiums = [] as StadiumInput[],
  } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Tournament name is required" }, { status: 400 });
  }

  // Free plan: only 1 tournament per org
  // Count only non-deleted AND non-delete-requested tournaments
  // (so a tournament with a pending delete request doesn't block creating a new free one)
  const [{ value: existingCount }] = await db
    .select({ value: count() })
    .from(tournaments)
    .where(and(
      eq(tournaments.organizationId, organization.id),
      isNull(tournaments.deletedAt),
      isNull(tournaments.deleteRequestedAt),
    ));

  const chosenPlan = ["starter", "pro", "elite"].includes(requestedPlan) ? requestedPlan : "free";

  if (existingCount > 0 && chosenPlan === "free") {
    return NextResponse.json(
      { error: "free_limit_reached", message: "Free plan allows only 1 tournament. Please choose Starter, Pro or Elite." },
      { status: 402 }
    );
  }

  // Generate unique slug
  let baseSlug = slugify(name.trim());
  let slug = baseSlug;
  let attempt = 0;
  while (attempt < 10) {
    const existing = await db.query.tournaments.findFirst({
      where: and(
        eq(tournaments.organizationId, organization.id),
        eq(tournaments.slug, slug)
      ),
    });
    if (!existing) break;
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  // Create tournament with default images
  const [tournament] = await db
    .insert(tournaments)
    .values({
      organizationId: organization.id,
      name: name.trim(),
      slug,
      year: year || new Date().getFullYear(),
      currency: currency || organization.currency || "EUR",
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      specificDays: specificDays?.length ? JSON.stringify(specificDays) : null,
      country: country || null,
      city: city || null,
      hasAccommodation: Boolean(hasAccommodation),
      hasMeals: Boolean(hasMeals),
      hasTransfer: Boolean(hasTransfer),
      plan: chosenPlan as "free" | "starter" | "pro" | "elite",
      coverUrl: "/defaults/tournament-cover-default.jpg",
      cardImageUrl: "/defaults/tournament-card-default.jpg",
    } as any)
    .returning();

  // Create fields from stadiums
  if (stadiums.length > 0) {
    const fieldRows: typeof tournamentFields.$inferInsert[] = [];
    let globalOrder = 0;
    for (const stadium of stadiums as StadiumInput[]) {
      if (!stadium.name?.trim()) continue;
      const count = Math.max(1, Math.min(20, Number(stadium.fieldCount) || 1));
      for (let i = 0; i < count; i++) {
        const letter = String.fromCharCode(65 + i); // A, B, C...
        fieldRows.push({
          tournamentId: tournament.id,
          name: count === 1 ? stadium.name.trim() : `${stadium.name.trim()} — ${letter}`,
          address: "",
          mapUrl: "",
          scheduleUrl: "",
          notes: "",
          sortOrder: globalOrder++,
        });
      }
    }
    if (fieldRows.length > 0) {
      await db.insert(tournamentFields).values(fieldRows);
    }
  }

  return NextResponse.json({ id: tournament.id, slug: tournament.slug }, { status: 201 });
}
