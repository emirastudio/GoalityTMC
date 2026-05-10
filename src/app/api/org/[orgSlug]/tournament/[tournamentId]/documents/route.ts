import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournaments, organizations, tournamentDocuments, tournamentClasses } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { getEffectivePlan, assertFeature, type TournamentPlan } from "@/lib/plan-gates";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// ── Лимиты документов ─────────────────────────────────────────
// Меняются только в этом файле — клиент читает их через GET-эндпоинт.
const MAX_FILE_BYTES        = 30 * 1024 * 1024;  // 30 MB на 1 файл
const MAX_TOURNAMENT_BYTES  = 100 * 1024 * 1024; // 100 MB суммарно

// Документы — не видео и не картинки. Любой офисный/PDF формат:
//   - PDF
//   - Word (.doc, .docx)
//   - Excel (.xls, .xlsx) — таблицы дисквалификаций, реестры команд
//   - PowerPoint (.ppt, .pptx) — презентации регламента
//   - OpenDocument (.odt, .ods, .odp) — open source equivalents
//   - RTF, TXT — плейн-текст
//   - ePub — иногда регламенты как электронные книги
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.presentation",
  "application/rtf",
  "application/epub+zip",
  "text/plain",
  "text/rtf",
]);
const ALLOWED_EXT_FALLBACK = new Set([
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "odt", "ods", "odp", "rtf", "txt", "epub",
]);

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

  // Подсчёт общего размера хранилища — фронт показывает прогресс-бар
  // «X MB / 100 MB» и блокирует загрузку, если близко к лимиту.
  const usedBytes = docs.reduce((s, d) => s + (parseInt(d.fileSize ?? "0", 10) || 0), 0);

  return NextResponse.json({
    docs,
    storage: {
      usedBytes,
      maxBytes: MAX_TOURNAMENT_BYTES,
      maxFileBytes: MAX_FILE_BYTES,
      allowedExtensions: Array.from(ALLOWED_EXT_FALLBACK),
    },
  });
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

  // Type check — допускаем по MIME ИЛИ по расширению файла
  // (некоторые браузеры на Windows не выдают MIME для .docx, например).
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(file.type) && !ALLOWED_EXT_FALLBACK.has(ext)) {
    return NextResponse.json(
      { error: "Only document files are allowed (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, ODT, RTF, TXT, EPUB)" },
      { status: 400 },
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_FILE_BYTES / (1024 * 1024)} MB)` },
      { status: 413 },
    );
  }

  // Total tournament storage check — суммируем все уже загруженные
  // документы и сравниваем с лимитом турнира. Защищает от тысячи мелких
  // файлов так же как от одного крупного.
  const existing = await db
    .select({ fileSize: tournamentDocuments.fileSize })
    .from(tournamentDocuments)
    .where(eq(tournamentDocuments.tournamentId, tid));
  const usedBytes = existing.reduce((s, d) => s + (parseInt(d.fileSize ?? "0", 10) || 0), 0);
  if (usedBytes + file.size > MAX_TOURNAMENT_BYTES) {
    return NextResponse.json(
      {
        error: `Tournament storage limit exceeded (max ${MAX_TOURNAMENT_BYTES / (1024 * 1024)} MB total)`,
        usedBytes,
        maxBytes: MAX_TOURNAMENT_BYTES,
      },
      { status: 413 },
    );
  }

  // ClassId — опциональная привязка к дивизиону. Если задано — валидируем
  // что класс принадлежит этому турниру (защита от чужих ID в form data).
  const classIdRaw = formData.get("classId") as string | null;
  let classId: number | null = null;
  if (classIdRaw && classIdRaw.trim() !== "") {
    const cid = parseInt(classIdRaw, 10);
    if (Number.isFinite(cid)) {
      const [cls] = await db
        .select({ id: tournamentClasses.id })
        .from(tournamentClasses)
        .where(and(eq(tournamentClasses.id, cid), eq(tournamentClasses.tournamentId, tid)))
        .limit(1);
      if (cls) classId = cid;
    }
  }

  const safeOriginal = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 80);
  const filename = `doc-${tid}-${Date.now()}-${safeOriginal}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "documents");
  await mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);

  // Display names — все 4 локали опциональны кроме базы. Если все пустые,
  // берём имя файла без расширения как fallback.
  const explicitName = (formData.get("name") as string | null)?.trim();
  const fallbackName = file.name.replace(/\.[^.]+$/, "");
  const name = explicitName || fallbackName || "Document";
  const nameRu = (formData.get("nameRu") as string | null)?.trim() || null;
  const nameEt = (formData.get("nameEt") as string | null)?.trim() || null;
  const nameEs = (formData.get("nameEs") as string | null)?.trim() || null;

  const [created] = await db
    .insert(tournamentDocuments)
    .values({
      tournamentId: tid,
      classId,
      name,
      nameRu,
      nameEt,
      nameEs,
      fileUrl: `/uploads/documents/${filename}`,
      fileSize: String(file.size),
      mimeType: file.type || null,
    })
    .returning();
  return NextResponse.json(created, { status: 201 });
}
