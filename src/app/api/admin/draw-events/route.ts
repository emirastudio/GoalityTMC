/**
 * GET /api/admin/draw-events — superadmin journal of every Draw Show
 * action across the standalone /draw product.
 *
 * Returns the most recent N events plus aggregate counts so the
 * admin page can show both the list and a small summary card. Auth is
 * the same shape as the rest of the /api/admin/* endpoints — checked
 * via getSession() and isSuper.
 *
 * Query params:
 *   ?limit=  default 200, max 1000
 *   ?event=  visited | created | activated  (filter)
 *   ?email=  partial-match filter
 */

import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { db } from "@/db";
import { drawShowEvents, publicDrawLeads } from "@/db/schema";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin" || !session.isSuper) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const params = req.nextUrl.searchParams;
  const limit = Math.min(
    1000,
    Math.max(1, parseInt(params.get("limit") ?? "200") || 200),
  );
  const eventFilter = params.get("event");
  const emailFilter = params.get("email")?.trim().toLowerCase();

  const conditions = [];
  if (eventFilter && ["visited", "created", "activated"].includes(eventFilter)) {
    conditions.push(eq(drawShowEvents.eventType, eventFilter));
  }
  if (emailFilter) {
    conditions.push(ilike(drawShowEvents.email, `%${emailFilter}%`));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totals, leadCount] = await Promise.all([
    db
      .select()
      .from(drawShowEvents)
      .where(whereClause)
      .orderBy(desc(drawShowEvents.createdAt))
      .limit(limit),
    db
      .select({
        eventType: drawShowEvents.eventType,
        count: sql<number>`count(*)::int`,
      })
      .from(drawShowEvents)
      .groupBy(drawShowEvents.eventType),
    db
      .select({ count: sql<number>`count(distinct ${publicDrawLeads.email})::int` })
      .from(publicDrawLeads),
  ]);

  const summary: Record<string, number> = {
    visited: 0,
    created: 0,
    activated: 0,
  };
  for (const row of totals) summary[row.eventType] = row.count;

  return NextResponse.json({
    events: rows,
    summary,
    uniqueLeads: leadCount[0]?.count ?? 0,
  });
}
