"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardTitle } from "@/components/ui/card";
import { useTeam } from "@/lib/team-context";
import { FileText, Download } from "lucide-react";

type Doc = {
  id: number;
  name: string;
  nameRu: string | null;
  nameEt: string | null;
  fileUrl: string;
  fileSize: string | null;
  uploadedAt: string;
};

export default function DocumentsPage() {
  const t = useTranslations("documents");
  const { tournamentId } = useTeam();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) return;
    fetch(`/api/tournaments/${tournamentId}/documents`).then(async (res) => {
      if (res.ok) setDocs(await res.json());
      setLoading(false);
    });
  }, [tournamentId]);

  if (loading) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardTitle>{t("title")}</CardTitle>

        {docs.length > 0 ? (
          <div className="mt-4 divide-y divide-border">
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 py-3">
                <FileText className="w-5 h-5 text-navy shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium th-text">{doc.name}</p>
                  <p className="text-xs th-text-2">
                    {new Date(doc.uploadedAt).toLocaleDateString()}
                    {doc.fileSize && ` · ${doc.fileSize}`}
                  </p>
                </div>
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-navy hover:text-navy/70 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 text-center py-8 th-text-2 text-sm">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            {t("noDocuments")}
          </div>
        )}
      </Card>
    </div>
  );
}
