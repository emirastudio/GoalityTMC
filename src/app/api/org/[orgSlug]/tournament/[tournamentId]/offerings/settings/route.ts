import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournaments } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { authorizeOrg } from "@/lib/tenant";

type Params = { orgSlug: string; tournamentId: string };

// GET/PATCH — tournament-level offerings settings (feature flag + payment instructions).
// Intentionally NOT behind requireV3Tournament: this endpoint is how the
// organiser flips the flag ON in the first place.
export async function GET(_req: NextRequest, { params }: { params: Promise<Params> }) {
  const p = await params;
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { authorized, organization } = await authorizeOrg(session, p.orgSlug);
  if (!authorized || !organization) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [t] = await db
    .select({
      offeringsV3Enabled: tournaments.offeringsV3Enabled,
      paymentInstructions: tournaments.paymentInstructions,
      autoAssignPackageOfferingId: tournaments.autoAssignPackageOfferingId,
    })
    .from(tournaments)
    .where(and(eq(tournaments.id, parseInt(p.tournamentId)), eq(tournaments.organizationId, organization.id)))
    .limit(1);
  if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(t);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<Params> }) {
  const p = await params;
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { authorized, organization } = await authorizeOrg(session, p.orgSlug);
  if (!authorized || !organization) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = { updatedAt: new Date() };
  if ("offeringsV3Enabled" in body) patch.offeringsV3Enabled = Boolean(body.offeringsV3Enabled);
  if ("paymentInstructions" in body) patch.paymentInstructions = body.paymentInstructions ?? null;
  if ("autoAssignPackageOfferingId" in body) {
    const v = body.autoAssignPackageOfferingId;
    if (v === null || v === "" || v === undefined) {
      patch.autoAssignPackageOfferingId = null;
    } else {
      const n = Math.floor(Number(v));
      patch.autoAssignPackageOfferingId = Number.isFinite(n) && n > 0 ? n : null;
    }
  }

  const [updated] = await db
    .update(tournaments)
    .set(patch)
    .where(and(eq(tournaments.id, parseInt(p.tournamentId)), eq(tournaments.organizationId, organization.id)))
    .returning({
      offeringsV3Enabled: tournaments.offeringsV3Enabled,
      paymentInstructions: tournaments.paymentInstructions,
      autoAssignPackageOfferingId: tournaments.autoAssignPackageOfferingId,
    });

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}
