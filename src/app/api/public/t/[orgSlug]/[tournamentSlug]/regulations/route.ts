import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  organizations,
  tournaments,
  tournamentClasses,
  tournamentDocuments,
} from "@/db/schema";
import { eq, and, asc, isNull } from "drizzle-orm";
import { getEffectivePlan, assertFeature, type TournamentPlan } from "@/lib/plan-gates";
import { pickLocaleText } from "@/lib/i18n-text";

// GET /api/public/t/[orgSlug]/[tournamentSlug]/regulations?locale=ru
//
// Возвращает всё что нужно для публичной странички регламента в одном
// запросе — текст турнира + текст каждого дивизиона + документы (общие
// и привязанные к дивизионам). Все локализованные поля уже выбраны
// под `locale` (с fallback на EN).
//
// Plan-gated на documents — на free-турнирах эндпоинт возвращает
// пустой каркас (без 402, чтобы посетители публички не видели как
// устроен биллинг).

type DocOut = {
  id: number;
  name: string;
  fileUrl: string;
  fileSize: string | null;
  mimeType: string | null;
  uploadedAt: string;
};

type ClassSection = {
  id: number;
  name: string;
  format: string | null;
  text: string;
  docs: DocOut[];
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; tournamentSlug: string }> },
) {
  const { orgSlug, tournamentSlug } = await params;
  const { searchParams } = new URL(req.url);
  const locale = searchParams.get("locale") ?? "en";

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, orgSlug),
  });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tournament = await db.query.tournaments.findFirst({
    where: and(
      eq(tournaments.organizationId, org.id),
      eq(tournaments.slug, tournamentSlug),
    ),
  });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const effectivePlan = getEffectivePlan(
    (tournament.plan as TournamentPlan) ?? "free",
    org.eliteSubStatus,
  );
  const gate = assertFeature(effectivePlan, "hasDocuments");
  const docsAvailable = !gate;

  // Текст регламента турнира (всегда возвращаем, не зависит от plan-gate'а
  // на documents — текст это не файлы).
  const tournamentText = pickLocaleText(
    tournament as unknown as Record<string, unknown>,
    locale,
    "regulationsText",
  );

  // Дивизионы + их регламент-текст.
  const classes = await db
    .select()
    .from(tournamentClasses)
    .where(eq(tournamentClasses.tournamentId, tournament.id))
    .orderBy(asc(tournamentClasses.id));

  const docs = docsAvailable
    ? await db
        .select()
        .from(tournamentDocuments)
        .where(eq(tournamentDocuments.tournamentId, tournament.id))
        .orderBy(asc(tournamentDocuments.uploadedAt))
    : [];

  // Локализуем имя документа + готовим compact DocOut.
  function pickDoc(d: typeof docs[number]): DocOut {
    return {
      id: d.id,
      name: pickLocaleText(d as unknown as Record<string, unknown>, locale, "name") || d.name,
      fileUrl: d.fileUrl,
      fileSize: d.fileSize,
      mimeType: d.mimeType,
      uploadedAt: d.uploadedAt.toISOString(),
    };
  }

  // Группируем документы: общие (classId=null) → tournament; иначе → класс.
  const generalDocs = docs.filter((d) => d.classId == null).map(pickDoc);
  const docsByClass = new Map<number, DocOut[]>();
  for (const d of docs) {
    if (d.classId == null) continue;
    const arr = docsByClass.get(d.classId) ?? [];
    arr.push(pickDoc(d));
    docsByClass.set(d.classId, arr);
  }

  const classSections: ClassSection[] = classes.map((c) => ({
    id: c.id,
    name: c.name,
    format: c.format,
    text: pickLocaleText(c as unknown as Record<string, unknown>, locale, "regulationsText"),
    docs: docsByClass.get(c.id) ?? [],
  }));

  // Класс-секции отдаём только если в них что-то есть (текст ИЛИ документы).
  // Иначе на странице был бы пустой заголовок «8x8» без содержимого.
  const nonEmptyClassSections = classSections.filter(
    (s) => s.text.trim().length > 0 || s.docs.length > 0,
  );

  return NextResponse.json({
    tournament: {
      text: tournamentText,
    },
    classes: nonEmptyClassSections,
    generalDocs,
    documentsAvailable: docsAvailable,
  });
}

// Suppress no-unused-vars on the import — `isNull` стоит здесь как
// будущий хелпер для альтернативной выборки общих документов.
void isNull;
