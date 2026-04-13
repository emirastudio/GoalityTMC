import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { clubs } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  // Determine where the user's cabinet is
  let cabinetUrl = "/team/overview";
  if (session.role === "admin") {
    cabinetUrl = session.organizationSlug
      ? `/org/${session.organizationSlug}/admin`
      : "/admin/overview";
  }

  // If club user, include club details
  let club: { id: number; name: string; country: string | null; city: string | null } | undefined;
  if (session.role === "club" && session.clubId) {
    const [row] = await db
      .select({ id: clubs.id, name: clubs.name, country: clubs.country, city: clubs.city })
      .from(clubs)
      .where(eq(clubs.id, session.clubId));
    if (row) club = row;
  }

  return NextResponse.json({
    authenticated: true,
    role: session.role,
    isSuper: session.isSuper ?? false,
    clubId: session.clubId ?? null,
    club: club ?? null,
    cabinetUrl,
  });
}
