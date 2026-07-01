"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FileText, Upload, Trash2, Loader2, Pencil, Check, X, AlertCircle } from "lucide-react";

interface DocumentRow {
  id: number;
  name: string;
  nameRu: string | null;
  nameEt: string | null;
  fileUrl: string;
  fileSize: string | null;
  uploadedAt: string;
}

// Self-contained block: load + upload + rename + delete tournament
// regulations & other public documents. Pasted into the Setup wizard
// (Basics step). All file actions hit the org-scoped admin route.
export function TournamentDocumentsBlock({
  orgSlug,
  tournamentId,
}: {
  orgSlug: string;
  tournamentId: number;
}) {
  const t = useTranslations("orgAdmin");
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [planLocked, setPlanLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/documents`);
      if (res.status === 402) {
        const data = await res.json().catch(() => ({}));
        setPlanLocked(true);
        setError(data.error ?? t("docsPlanLockedMsg"));
        setDocs([]);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        // API теперь возвращает `{ docs, storage }` (см. migration 0037).
        // Поддерживаем и старый плоский массив на случай отката.
        setDocs(Array.isArray(data) ? data : (data.docs ?? []));
        setPlanLocked(false);
      }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [orgSlug, tournamentId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", file.name.replace(/\.[^.]+$/, ""));
      const res = await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/documents`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? t("docsUploadFailed"));
        return;
      }
      await load();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function deleteDoc(id: number, name: string) {
    if (!confirm(t("docsDeleteConfirm", { name }))) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/documents/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? t("docsDeleteFailed"));
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function saveRename() {
    if (!editing) return;
    setBusyId(editing.id);
    setError(null);
    try {
      const res = await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/documents/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editing.name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? t("docsRenameFailed"));
        return;
      }
      setEditing(null);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  function fmtSize(raw: string | null): string {
    if (!raw) return "";
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return raw;
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>
            {t("docsTitle")}
          </p>
          <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
            {t("docsSubtitle")}
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadFile(f);
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || planLocked}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80 disabled:opacity-40 cursor-pointer"
          style={{ background: "var(--cat-accent)", color: "#000" }}
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {uploading ? t("docsUploading") : t("docsUploadBtn")}
        </button>
      </div>

      {planLocked && (
        <div className="px-3 py-2 rounded-xl border text-[12px] flex items-start gap-2"
          style={{ background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.35)", color: "#b45309" }}>
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{t("docsPlanLockedMsg")}</span>
        </div>
      )}

      {error && !planLocked && (
        <p className="text-[11px]" style={{ color: "#ef4444" }}>{error}</p>
      )}

      {loading ? (
        <div className="py-4 flex items-center justify-center" style={{ color: "var(--cat-text-muted)" }}>
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      ) : docs.length === 0 && !planLocked ? (
        <div className="py-6 rounded-xl border border-dashed text-center text-[12px]"
          style={{ borderColor: "var(--cat-card-border)", color: "var(--cat-text-muted)" }}>
          {t("docsEmpty")}
        </div>
      ) : (
        <ul className="space-y-2">
          {docs.map((doc) => {
            const busy = busyId === doc.id;
            const isEditing = editing?.id === doc.id;
            return (
              <li
                key={doc.id}
                className="flex items-center gap-3 px-3 py-2 rounded-xl border"
                style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)" }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "var(--cat-card-bg)" }}>
                  <FileText className="w-4 h-4" style={{ color: "var(--cat-accent)" }} />
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editing.name}
                    onChange={(e) => setEditing({ id: doc.id, name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveRename();
                      if (e.key === "Escape") setEditing(null);
                    }}
                    className="flex-1 rounded-lg px-2 py-1 text-sm border outline-none"
                    style={{ background: "var(--cat-input-bg)", borderColor: "var(--cat-input-border)", color: "var(--cat-text)" }}
                    autoFocus
                  />
                ) : (
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-0 hover:opacity-80"
                  >
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--cat-text)" }}>
                      {doc.name}
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>
                      {fmtSize(doc.fileSize)}
                    </p>
                  </a>
                )}
                {isEditing ? (
                  <>
                    <button type="button" onClick={saveRename} disabled={busy}
                      className="p-1.5 rounded-lg hover:opacity-70 cursor-pointer"
                      style={{ color: "#10b981" }}>
                      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button type="button" onClick={() => setEditing(null)}
                      className="p-1.5 rounded-lg hover:opacity-70 cursor-pointer"
                      style={{ color: "var(--cat-text-muted)" }}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button"
                      onClick={() => setEditing({ id: doc.id, name: doc.name })}
                      disabled={busy}
                      title={t("docsRenameTitle")}
                      className="p-1.5 rounded-lg hover:opacity-70 cursor-pointer disabled:opacity-40"
                      style={{ color: "var(--cat-text-muted)" }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button type="button"
                      onClick={() => deleteDoc(doc.id, doc.name)}
                      disabled={busy}
                      title={t("deleteCover")}
                      className="p-1.5 rounded-lg hover:opacity-70 cursor-pointer disabled:opacity-40"
                      style={{ color: "#ef4444" }}>
                      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
