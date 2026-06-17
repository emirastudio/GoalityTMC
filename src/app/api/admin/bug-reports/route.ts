import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bugReports } from "@/db/schema";
import { requireAdmin, isError } from "@/lib/api-auth";
import { and, desc, eq, sql } from "drizzle-orm";

/** GET /api/admin/bug-reports — list with filters. */
export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");        // e.g. "new"
  const severity = searchParams.get("severity");    // e.g. "critical"
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100", 10) || 100, 500);
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0);

  const conds = [];
  if (status && ["new", "in_progress", "fixed", "wont_fix", "duplicate"].includes(status)) {
    conds.push(eq(bugReports.status, status as "new"));
  }
  if (severity && ["low", "medium", "high", "critical"].includes(severity)) {
    conds.push(eq(bugReports.severity, severity as "low"));
  }
  // Org-scope for non-super admins (super sees everything)
  if (!session.isSuper && session.organizationId) {
    conds.push(eq(bugReports.organizationId, session.organizationId));
  }

  const where = conds.length ? and(...conds) : undefined;

  const [rows, totalRow] = await Promise.all([
    db.query.bugReports.findMany({
      where,
      orderBy: [desc(bugReports.createdAt)],
      limit,
      offset,
    }),
    db.select({ n: sql<number>`count(*)::int` }).from(bugReports).where(where ?? sql`true`),
  ]);

  return NextResponse.json({
    items: rows,
    total: totalRow[0]?.n ?? 0,
    limit,
    offset,
  });
}
