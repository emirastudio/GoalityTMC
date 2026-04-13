import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournaments } from "@/db/schema";
import { requireAdmin, isError } from "@/lib/api-auth";
import { eq } from "drizzle-orm";

type Params = { tournamentId: string };

// POST — superadmin approves (soft-delete) or rejects
export async function POST(req: NextRequest, { params }: { params: Promise<Params> }) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { tournamentId } = await params;
  const tid = parseInt(tournamentId);
  if (isNaN(tid)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const action: "approve" | "reject" = body.action;

  if (action === "approve") {
    // Soft delete: set deletedAt = now, keep deleteRequestedAt for audit trail
    await db.update(tournaments)
      .set({ deletedAt: new Date() })
      .where(eq(tournaments.id, tid));
    return NextResponse.json({ ok: true, action: "deleted" });
  }

  if (action === "reject") {
    // Clear the request — tournament stays alive
    await db.update(tournaments)
      .set({ deleteRequestedAt: null, deleteRequestReason: null })
      .where(eq(tournaments.id, tid));
    return NextResponse.json({ ok: true, action: "rejected" });
  }

  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}
