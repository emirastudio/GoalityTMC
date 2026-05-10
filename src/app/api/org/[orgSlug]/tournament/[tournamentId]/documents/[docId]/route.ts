import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournaments, organizations, tournamentDocuments, tournamentClasses } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { unlink } from "fs/promises";
import path from "path";

// PATCH — rename a document.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; tournamentId: string; docId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { orgSlug, tournamentId, docId } = await params;
  const tid = parseInt(tournamentId);
  const did = parseInt(docId);

  const org = await db.query.organizations.findFirst({ where: eq(organizations.slug, orgSlug) });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const tournament = await db.query.tournaments.findFirst({
    where: and(eq(tournaments.id, tid), eq(tournaments.organizationId, org.id)),
  });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [doc] = await db.select().from(tournamentDocuments).where(eq(tournamentDocuments.id, did));
  if (!doc || doc.tournamentId !== tid) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const patch: Partial<typeof doc> = {};
  if (typeof body.name === "string") patch.name = body.name.trim() || doc.name;
  if (typeof body.nameRu === "string") patch.nameRu = body.nameRu.trim() || null;
  if (typeof body.nameEt === "string") patch.nameEt = body.nameEt.trim() || null;
  if (typeof body.nameEs === "string") patch.nameEs = body.nameEs.trim() || null;
  // classId — переместить документ из общего блока в дивизион (или наоборот).
  // null/0 = «общий», иначе — валидируем принадлежность турниру.
  if ("classId" in body) {
    if (body.classId == null || body.classId === 0) {
      patch.classId = null;
    } else {
      const cid = parseInt(String(body.classId), 10);
      if (Number.isFinite(cid)) {
        const [cls] = await db
          .select({ id: tournamentClasses.id })
          .from(tournamentClasses)
          .where(and(eq(tournamentClasses.id, cid), eq(tournamentClasses.tournamentId, tid)))
          .limit(1);
        if (cls) patch.classId = cid;
      }
    }
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  await db.update(tournamentDocuments).set(patch).where(eq(tournamentDocuments.id, did));
  return NextResponse.json({ ok: true });
}

// DELETE — remove a document and its file on disk.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; tournamentId: string; docId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { orgSlug, tournamentId, docId } = await params;
  const tid = parseInt(tournamentId);
  const did = parseInt(docId);

  const org = await db.query.organizations.findFirst({ where: eq(organizations.slug, orgSlug) });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const tournament = await db.query.tournaments.findFirst({
    where: and(eq(tournaments.id, tid), eq(tournaments.organizationId, org.id)),
  });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [doc] = await db.select().from(tournamentDocuments).where(eq(tournamentDocuments.id, did));
  if (!doc || doc.tournamentId !== tid) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Best-effort file cleanup — DB row goes regardless.
  if (doc.fileUrl) {
    const fsPath = path.join(process.cwd(), "public", doc.fileUrl);
    await unlink(fsPath).catch(() => {});
  }
  await db.delete(tournamentDocuments).where(eq(tournamentDocuments.id, did));
  return NextResponse.json({ ok: true });
}
