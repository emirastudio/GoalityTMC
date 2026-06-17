import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bugReports } from "@/db/schema";
import { requireAdmin, isError } from "@/lib/api-auth";
import { eq } from "drizzle-orm";

const VALID_STATUS = ["new", "in_progress", "fixed", "wont_fix", "duplicate"] as const;
type BugStatus = (typeof VALID_STATUS)[number];

/** PATCH /api/admin/bug-reports/[id] — update status / notes / assignee. */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { id: idRaw } = await ctx.params;
  const id = parseInt(idRaw, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const existing = await db.query.bugReports.findFirst({ where: eq(bugReports.id, id) });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Org-scope: non-super admin can only mutate reports tied to their org
  if (!session.isSuper && session.organizationId) {
    if (existing.organizationId !== session.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;

  const update: Partial<typeof bugReports.$inferInsert> = { updatedAt: new Date() };

  if (typeof b.status === "string" && VALID_STATUS.includes(b.status as BugStatus)) {
    update.status = b.status as BugStatus;
    // Mark resolvedAt when entering a terminal state
    if (["fixed", "wont_fix", "duplicate"].includes(b.status)) {
      update.resolvedAt = existing.resolvedAt ?? new Date();
    } else {
      update.resolvedAt = null;
    }
  }

  if (typeof b.internalNotes === "string") {
    update.internalNotes = b.internalNotes.slice(0, 5000);
  }

  if (b.assigneeId === null) {
    update.assigneeId = null;
  } else if (typeof b.assigneeId === "number") {
    update.assigneeId = b.assigneeId;
  }

  await db.update(bugReports).set(update).where(eq(bugReports.id, id));
  return NextResponse.json({ ok: true });
}

/** DELETE /api/admin/bug-reports/[id] — super-admin only. */
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  if (isError(session)) return session;
  if (!session.isSuper) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: idRaw } = await ctx.params;
  const id = parseInt(idRaw, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await db.delete(bugReports).where(eq(bugReports.id, id));
  return NextResponse.json({ ok: true });
}
