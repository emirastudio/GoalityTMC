import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  teams,
  tournamentRegistrations,
  packageAssignments,
  servicePackages,
  packageItems,
  services,
  teamPackageItemOverrides,
  people,
} from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { getSession } from "@/lib/auth";

async function authorizeTeam(teamId: number, clubId: number) {
  const team = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
  if (!team || team.clubId !== clubId) return null;
  return team;
}

function calcTotal(
  mode: string,
  price: number,
  days: number | null,
  qty: number | null,
  counts: { players: number; staff: number; accompanying: number }
): number {
  const total = counts.players + counts.staff + counts.accompanying;
  switch (mode) {
    case "per_person":         return price * total;
    case "per_player":         return price * counts.players;
    case "per_staff":          return price * counts.staff;
    case "per_accompanying":   return price * counts.accompanying;
    case "per_team":           return price;
    case "per_person_per_day": return price * total * (days ?? 1);
    case "per_unit":           return price * (qty ?? 1);
    case "flat":               return price;
    default:                   return price;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = await params;
  const tid = parseInt(teamId);

  const team = await authorizeTeam(tid, session.clubId);
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  // Load registration
  const registration = await db.query.tournamentRegistrations.findFirst({
    where: session.tournamentId
      ? and(eq(tournamentRegistrations.teamId, tid), eq(tournamentRegistrations.tournamentId, session.tournamentId))
      : eq(tournamentRegistrations.teamId, tid),
    orderBy: (r, { desc }) => [desc(r.id)],
  });
  if (!registration) {
    return NextResponse.json({ error: "No registration found" }, { status: 404 });
  }

  // Check published package assignment
  const assignment = await db.query.packageAssignments.findFirst({
    where: eq(packageAssignments.registrationId, registration.id),
  });

  if (!assignment || !assignment.isPublished) {
    return NextResponse.json({ available: false });
  }

  // Package info
  const pkg = await db.query.servicePackages.findFirst({
    where: eq(servicePackages.id, assignment.packageId),
  });

  // People counts
  const [{ players }] = await db
    .select({ players: count() })
    .from(people)
    .where(and(eq(people.teamId, tid), eq(people.personType, "player")));
  const [{ staff }] = await db
    .select({ staff: count() })
    .from(people)
    .where(and(eq(people.teamId, tid), eq(people.personType, "staff")));
  const [{ accompanying }] = await db
    .select({ accompanying: count() })
    .from(people)
    .where(and(eq(people.teamId, tid), eq(people.personType, "accompanying")));

  const counts = {
    players: Number(players),
    staff: Number(staff),
    accompanying: Number(accompanying),
  };

  // Package items with service info
  const items = await db
    .select({
      id: packageItems.id,
      serviceId: packageItems.serviceId,
      serviceName: services.name,
      serviceIcon: services.icon,
      details: packageItems.details,
      note: packageItems.note,
      imageUrl: packageItems.imageUrl,
      dateFrom: packageItems.dateFrom,
      dateTo: packageItems.dateTo,
      pricingMode: packageItems.pricingMode,
      price: packageItems.price,
      days: packageItems.days,
      quantity: packageItems.quantity,
      sortOrder: packageItems.sortOrder,
    })
    .from(packageItems)
    .leftJoin(services, eq(services.id, packageItems.serviceId))
    .where(eq(packageItems.packageId, assignment.packageId))
    .orderBy(packageItems.sortOrder);

  // Per-registration overrides
  const overrides = await db.query.teamPackageItemOverrides.findMany({
    where: eq(teamPackageItemOverrides.registrationId, registration.id),
  });
  const ovMap = new Map(overrides.map((o) => [o.packageItemId, o]));

  // Enrich items with effective prices + calculated totals
  const enrichedItems = items.map((item) => {
    const ov = ovMap.get(item.id);
    const isDisabled = ov?.isDisabled ?? false;
    const effectivePrice = ov?.customPrice != null ? Number(ov.customPrice) : Number(item.price);
    const effectiveQty = ov?.customQuantity ?? item.quantity;
    const isOverridden = !!ov && (ov.customPrice != null || ov.isDisabled);

    const calculatedTotal = isDisabled
      ? 0
      : calcTotal(item.pricingMode, effectivePrice, item.days, effectiveQty, counts);

    return {
      ...item,
      basePrice: item.price,
      effectivePrice: effectivePrice.toFixed(2),
      effectiveQty,
      isDisabled,
      isOverridden,
      overrideReason: ov?.reason ?? null,
      calculatedTotal: calculatedTotal.toFixed(2),
    };
  });

  const grandTotal = enrichedItems.reduce((s, i) => s + Number(i.calculatedTotal), 0);

  return NextResponse.json({
    available: true,
    package: {
      id: pkg?.id,
      name: pkg?.name,
      description: pkg?.description,
    },
    items: enrichedItems,
    peopleCounts: counts,
    grandTotal: grandTotal.toFixed(2),
  });
}
