"use client";

import { useTournamentPublic } from "@/lib/tournament-public-context";
import { useTranslations, useLocale } from "next-intl";
import { BookOpen, FileText, Download, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { formatBytes } from "@/lib/format-bytes";

interface DocOut {
  id: number;
  name: string;
  fileUrl: string;
  fileSize: string | null;
  mimeType: string | null;
  uploadedAt: string;
}

interface ClassSection {
  id: number;
  name: string;
  format: string | null;
  text: string;
  docs: DocOut[];
}

interface RegulationsResponse {
  tournament: { text: string };
  classes: ClassSection[];
  generalDocs: DocOut[];
  documentsAvailable: boolean;
}

export default function RegulationsPage() {
  const { org, tournament: tourney } = useTournamentPublic();
  const t = useTranslations("tournament");
  const locale = useLocale();
  const brand = org.brandColor;
  const [data, setData] = useState<RegulationsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(
      `/api/public/t/${org.slug}/${tourney.slug}/regulations?locale=${locale}`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, [org.slug, tourney.slug, locale]);

  if (loading || !data) {
    return (
      <div className="rounded-2xl p-12 flex items-center justify-center"
        style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)" }}>
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--cat-text-muted)" }} />
      </div>
    );
  }

  const hasGeneralText = data.tournament.text.trim().length > 0;
  const hasGeneralDocs = data.generalDocs.length > 0;
  const hasClassSections = data.classes.length > 0;
  const isEmpty = !hasGeneralText && !hasGeneralDocs && !hasClassSections;

  if (isEmpty) {
    return (
      <Card brand={brand}>
        <Header brand={brand} title={t("regulationsTitle")} subtitle={t("regulationsSubtitle")} />
        <div className="py-10 flex flex-col items-center gap-3" style={{ color: "var(--cat-text-muted)" }}>
          <FileText className="w-10 h-10 opacity-20" />
          <p className="text-sm">{t("regulationsEmpty")}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* General regulations — text + general docs */}
      {(hasGeneralText || hasGeneralDocs) && (
        <Card brand={brand}>
          <Header brand={brand} title={t("regulationsTitle")} subtitle={t("regulationsSubtitle")} />

          {hasGeneralText && (
            <div className="mt-4">
              <RegulationText text={data.tournament.text} />
            </div>
          )}

          {hasGeneralDocs && (
            <div className="mt-5">
              <DocsList docs={data.generalDocs} brand={brand} />
            </div>
          )}
        </Card>
      )}

      {/* Per-class sections */}
      {data.classes.map((cls) => (
        <Card key={cls.id} brand={brand}>
          <Header
            brand={brand}
            title={cls.name}
            subtitle={cls.format ?? undefined}
            icon={<FileText className="w-5 h-5" style={{ color: brand }} />}
          />
          {cls.text.trim().length > 0 && (
            <div className="mt-4">
              <RegulationText text={cls.text} />
            </div>
          )}
          {cls.docs.length > 0 && (
            <div className="mt-5">
              <DocsList docs={cls.docs} brand={brand} />
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

// ─── UI bits ──────────────────────────────────────────────────────────

function Card({ children, brand: _brand }: { children: React.ReactNode; brand: string }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "var(--cat-card-bg)",
        border: "1px solid var(--cat-card-border)",
      }}
    >
      {children}
    </div>
  );
}

function Header({
  brand,
  title,
  subtitle,
  icon,
}: {
  brand: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: brand + "15" }}
      >
        {icon ?? <BookOpen className="w-5 h-5" style={{ color: brand }} />}
      </div>
      <div>
        <p className="text-[14px] font-bold" style={{ color: "var(--cat-text)" }}>
          {title}
        </p>
        {subtitle && (
          <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

// Regulations text rendered with paragraph-preserving whitespace —
// проще чем тащить markdown-парсер для длинных тем регламента, и не
// вводит XSS-риск (просто строки через CSS pre-line).
function RegulationText({ text }: { text: string }) {
  return (
    <div
      className="text-[14px] leading-relaxed"
      style={{
        color: "var(--cat-text-secondary)",
        whiteSpace: "pre-line",
        wordBreak: "break-word",
      }}
    >
      {text}
    </div>
  );
}

function DocsList({ docs, brand }: { docs: DocOut[]; brand: string }) {
  return (
    <div className="space-y-2">
      {docs.map((doc) => (
        <a
          key={doc.id}
          href={doc.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 rounded-xl transition-opacity hover:opacity-80"
          style={{
            background: "var(--cat-tag-bg)",
            border: "1px solid var(--cat-tag-border)",
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: brand + "15" }}
          >
            <FileText className="w-5 h-5" style={{ color: brand }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate" style={{ color: "var(--cat-text)" }}>
              {doc.name}
            </p>
            {doc.fileSize && (
              <p className="text-[11px] mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
                {formatBytes(doc.fileSize)}
              </p>
            )}
          </div>
          <Download className="w-4 h-4 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
        </a>
      ))}
    </div>
  );
}
