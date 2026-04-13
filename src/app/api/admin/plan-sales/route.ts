import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { tournamentPurchases, tournaments, organizations } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.isSuper) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db
    .select({
      id: tournamentPurchases.id,
      plan: tournamentPurchases.plan,
      extraTeams: tournamentPurchases.extraTeams,
      extraDivisions: tournamentPurchases.extraDivisions,
      amountEurCents: tournamentPurchases.amountEurCents,
      status: tournamentPurchases.status,
      createdAt: tournamentPurchases.createdAt,
      completedAt: tournamentPurchases.completedAt,
      stripeCheckoutSessionId: tournamentPurchases.stripeCheckoutSessionId,
      tournamentId: tournamentPurchases.tournamentId,
      tournamentName: tournaments.name,
      orgName: organizations.name,
      orgSlug: organizations.slug,
    })
    .from(tournamentPurchases)
    .leftJoin(tournaments, eq(tournaments.id, tournamentPurchases.tournamentId))
    .leftJoin(organizations, eq(organizations.id, tournamentPurchases.organizationId))
    .orderBy(desc(tournamentPurchases.createdAt))
    .limit(200);

  return NextResponse.json(rows);
}
