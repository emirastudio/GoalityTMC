import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournaments, organizations, tournamentDocuments } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { getEffectivePlan, assertFeature, type TournamentPlan } from "@/lib/plan-gates";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// Tournament documents — regulations, codes of conduct, host city info,
// etc. Public side reads them at /api/public/t/.../documents and renders
// on /t/.../regulations. Plan-gated (Starter+) on both ends.

async function authoriseTournament(
  orgSlug: string,
  tournamentId: number,
) {
  const session = await getSession();
  if (!session || session.role !== "admin") return { error: "Unauthorized", status: 401 } as const;

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, orgSlug),
  });
  if (!org) return { error: "Org not found", status: 404 } as const;

  const tournament = await db.query.tournaments.findFirst({
    where: and(eq(tournaments.id, tournamentId), eq(tournaments.organizationId, org.id)),
  });
  if (!tournament) return { error: "Tournament not found", status: 404 } as const;

  const effectivePlan = getEffectivePlan(
    (tournament.plan as TournamentPlan) ?? "free",
    org.eliteSubStatus,
  );
  const gate = assertFeature(effectivePlan, "hasDocuments");
  if (gate) return { error: "Documents are available on the Starter plan and above.", status: 402, code: "PLAN_GATE", plan: effectivePlan } as const;

  return { ok: true as const, tournament, org };
}

// GET — list documents for the admin UI.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; tournamentId: string }> }
) {
  const { orgSlug, tournamentId } = await params;
  const tid = parseInt(tournamentId);
  const auth = await authoriseTournament(orgSlug, tid);
  if (!auth.ok) return NextResponse.json(auth, { status: auth.status });

  const docs = await db
    .select()
    .from(tournamentDocuments)
    .where(eq(tournamentDocuments.tournamentId, tid))
    .orderBy(asc(tournamentDocuments.uploadedAt));
  return NextResponse.json(docs);
}

// POST — upload a new document.
// FormData: file (PDF / DOC / DOCX), name?, nameRu?, nameEt?
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; tournamentId: string }> }
) {
  const { orgSlug, tournamentId } = await params;
  const tid = parseInt(tournamentId);
  const auth = await authoriseTournament(orgSlug, tid);
  if (!auth.ok) return NextResponse.json(auth, { status: auth.status });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  // Permissive list — regulations come in PDF most often, but DOC/DOCX
  // and plain text are equally valid for smaller tournaments.
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Allowed: PDF, DOC, DOCX, TXT" },
      { status: 400 },
    );
  }
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
  const safeOriginal = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 80);
  const filename = `doc-${tid}-${Date.now()}-${safeOriginal}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "documents");
  await mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);
  void ext;

  // Display name preference: explicit name field → original filename
  // (sans extension). nameRu / nameEt remain optional manual overrides.
  const explicitName = (formData.get("name") as string | null)?.trim();
  const fallbackName = file.name.replace(/\.[^.]+$/, "");
  const name = explicitName || fallbackName || "Document";
  const nameRu = (formData.get("nameRu") as string | null)?.trim() || null;
  const nameEt = (formData.get("nameEt") as string | null)?.trim() || null;

  const [created] = await db
    .insert(tournamentDocuments)
    .values({
      tournamentId: tid,
      name,
      nameRu,
      nameEt,
      fileUrl: `/uploads/documents/${filename}`,
      fileSize: String(file.size),
    })
    .returning();
  return NextResponse.json(created, { status: 201 });
}
