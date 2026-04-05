"use client";
import { useTournamentPublic } from "@/lib/tournament-public-context";
import { useTranslations } from "next-intl";
import { BookOpen, FileText, Download, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface TournamentDocument {
  id: number;
  name: string;
  nameRu?: string | null;
  nameEt?: string | null;
  fileUrl: string;
  fileSize?: string | null;
  uploadedAt: string;
}

function formatSize(size?: string | null) {
  if (!size) return null;
  const n = parseFloat(size);
  if (isNaN(n)) return size;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function RegulationsPage() {
  const { org, tournament: tourney } = useTournamentPublic();
  const t = useTranslations("tournament");
  const brand = org.brandColor;
  const [docs, setDocs] = useState<TournamentDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/public/t/${org.slug}/${tourney.slug}/documents`)
      .then(r => r.ok ? r.json() : [])
      .then(setDocs)
      .finally(() => setLoading(false));
  }, [org.slug, tourney.slug]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5" style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)" }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: brand + "15" }}>
            <BookOpen className="w-5 h-5" style={{ color: brand }} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--cat-text-muted)" }}>{t("documentsTitle")}</p>
            <p className="text-[14px] font-bold" style={{ color: "var(--cat-text)" }}>{t("documentsSubtitle")}</p>
          </div>
        </div>

        {loading ? (
          <div className="py-8 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--cat-text-muted)" }} />
          </div>
        ) : docs.length === 0 ? (
          <div className="py-10 flex flex-col items-center gap-3" style={{ color: "var(--cat-text-muted)" }}>
            <FileText className="w-10 h-10 opacity-20" />
            <p className="text-sm">{t("noDocuments")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map(doc => {
              const name = doc.nameRu || doc.name;
              const size = formatSize(doc.fileSize);
              return (
                <a
                  key={doc.id}
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-xl transition-opacity hover:opacity-80"
                  style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-tag-border)" }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: brand + "15" }}>
                    <FileText className="w-5 h-5" style={{ color: brand }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate" style={{ color: "var(--cat-text)" }}>{name}</p>
                    {size && (
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--cat-text-muted)" }}>{size}</p>
                    )}
                  </div>
                  <Download className="w-4 h-4 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
