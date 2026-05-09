import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournaments } from "@/db/schema";
import { eq, and, isNull, ne } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { slugify } from "@/lib/tenant";

// GET /api/admin/check-slug?slug=foo[&excludeId=123]
// Returns { available: boolean, normalised: string }.
// Used by the tournament-settings UI to live-check whether a typed
// slug is free across the platform (partial unique on live rows).
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = req.nextUrl.searchParams.get("slug") ?? "";
  const excludeIdRaw = req.nextUrl.searchParams.get("excludeId");
  const excludeId = excludeIdRaw ? parseInt(excludeIdRaw) : null;

  const cleaned = slugify(raw);
  if (cleaned.length < 3 || cleaned.length > 80) {
    return NextResponse.json({
      available: false,
      normalised: cleaned,
      reason: "Slug must be 3–80 characters.",
    });
  }

  const conditions = [eq(tournaments.slug, cleaned), isNull(tournaments.deletedAt)];
  if (excludeId) conditions.push(ne(tournaments.id, excludeId));

  const collision = await db.query.tournaments.findFirst({
    where: and(...conditions),
  });

  return NextResponse.json({ available: !collision, normalised: cleaned });
}
