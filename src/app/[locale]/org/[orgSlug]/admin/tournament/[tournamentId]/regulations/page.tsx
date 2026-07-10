"use client";

/**
 * Admin → Регламент турнира.
 *
 * Одна страница для управления:
 *   1) Общий текст регламента (4 локали, multiline)
 *   2) Текст регламента отдельно для каждого дивизиона
 *   3) Загрузка файлов (.pdf/.doc/.docx/.ppt/.xls/.epub и т.д.)
 *      — общие или привязанные к дивизиону
 *
 * Лимиты: 30 MB на файл, 100 MB всего на турнир.
 *
 * Public читает то же самое через /api/public/t/.../regulations и
 * рендерит на /t/<slug>/regulations.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAdminFetch } from "@/lib/tournament-context";
import { Loader2, FileText, Upload, Pencil, Trash2, Check, X, BookOpen, Database } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlanGate } from "@/components/ui/plan-gate";
import { MultilangInput } from "@/components/ui/multilang-input";
import { multilangFromRow, type MultilangValue } from "@/lib/i18n-text";
import { formatBytes, usagePercent } from "@/lib/format-bytes";

type ClassEntry = {
  id: number;
  name: string;
  format: string | null;
  textML: MultilangValue;
};

type RegulationsData = {
  tournament: { textML: MultilangValue };
  classes: ClassEntry[];
};

type DocumentRow = {
  id: number;
  classId: number | null;
  name: string;
  nameRu: string | null;
  nameEt: string | null;
  nameEs: string | null;
  fileUrl: string;
  fileSize: string | null;
  mimeType: string | null;
  uploadedAt: string;
};

type StorageInfo = {
  usedBytes: number;
  maxBytes: number;
  maxFileBytes: number;
  allowedExtensions: string[];
};

export default function RegulationsAdminPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const tournamentId = Number(params.tournamentId);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/billing-info`)
      .then((r) => r.json())
      .then((d) => setHasAccess(d.features?.hasDocuments === true))
      .catch(() => setHasAccess(false));
  }, [orgSlug, tournamentId]);

  if (hasAccess === null) return null;
  if (!hasAccess) {
    return (
      <PlanGate feature="hasDocuments" orgSlug={orgSlug} tournamentId={tournamentId} />
    );
  }
  return <RegulationsContent orgSlug={orgSlug} tournamentId={tournamentId} />;
}

function RegulationsContent({
  orgSlug,
  tournamentId,
}: {
  orgSlug: string;
  tournamentId: number;
}) {
  const t = useTranslations("regulationsAdmin");
  const adminFetch = useAdminFetch();
  const [data, setData] = useState<RegulationsData | null>(null);
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingText, setSavingText] = useState<"none" | "tournament" | number>("none");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [regsRes, docsRes] = await Promise.all([
        adminFetch(`/api/org/${orgSlug}/tournament/${tournamentId}/regulations`),
        adminFetch(`/api/org/${orgSlug}/tournament/${tournamentId}/documents`),
      ]);
      if (regsRes.ok) setData(await regsRes.json());
      if (docsRes.ok) {
        const d = await docsRes.json();
        setDocs(d.docs ?? []);
        setStorage(d.storage ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [orgSlug, tournamentId]);

  useEffect(() => {
    load();
  }, [load]);

  // Save general regulations text. Per-class — отдельная функция
  // ниже, чтобы кнопки сохранения по классам работали независимо.
  async function saveTournamentText(textML: MultilangValue) {
    setSavingText("tournament");
    setError(null);
    try {
      const res = await adminFetch(
        `/api/org/${orgSlug}/tournament/${tournamentId}/regulations`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tournament: textML }),
        },
      );
      if (!res.ok) throw new Error(t("saveFailed"));
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("saveFailed"));
    } finally {
      setSavingText("none");
    }
  }

  async function saveClassText(classId: number, textML: MultilangValue) {
    setSavingText(classId);
    setError(null);
    try {
      const res = await adminFetch(
        `/api/org/${orgSlug}/tournament/${tournamentId}/regulations`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classes: { [classId]: textML } }),
        },
      );
      if (!res.ok) throw new Error(t("saveFailed"));
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("saveFailed"));
    } finally {
      setSavingText("none");
    }
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  const generalDocs = docs.filter((d) => d.classId == null);
  const classDocs = (cid: number) => docs.filter((d) => d.classId === cid);

  return (
    <div className="space-y-6 w-full max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold th-text flex items-center gap-2">
            <BookOpen className="w-6 h-6" /> {t("title")}
          </h1>
          <p className="text-sm th-text-2 mt-1">{t("subtitle")}</p>
        </div>
        {storage && <StorageBadge storage={storage} t={t} />}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-error/20 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {/* Section 1 — общий текст + общие документы */}
      <Section
        icon={<BookOpen className="w-5 h-5" />}
        title={t("generalSectionTitle")}
        subtitle={t("generalSectionSubtitle")}
      >
        <RegulationTextEditor
          initial={data.tournament.textML}
          saving={savingText === "tournament"}
          onSave={saveTournamentText}
          t={t}
        />
        <DocumentList
          orgSlug={orgSlug}
          tournamentId={tournamentId}
          classId={null}
          docs={generalDocs}
          storage={storage}
          onChange={load}
          t={t}
        />
      </Section>

      {/* Section 2..N — по дивизионам */}
      {data.classes.length > 0 && (
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold th-text mt-6 flex items-center gap-2">
            {t("classesSectionTitle")}
          </h2>
          <p className="text-sm th-text-2">{t("classesSectionSubtitle")}</p>
        </div>
      )}

      {data.classes.map((cls) => (
        <Section
          key={cls.id}
          icon={<FileText className="w-5 h-5" />}
          title={cls.name}
          subtitle={cls.format ? `${cls.format}` : undefined}
        >
          <RegulationTextEditor
            initial={cls.textML}
            saving={savingText === cls.id}
            onSave={(v) => saveClassText(cls.id, v)}
            t={t}
          />
          <DocumentList
            orgSlug={orgSlug}
            tournamentId={tournamentId}
            classId={cls.id}
            docs={classDocs(cls.id)}
            storage={storage}
            onChange={load}
            t={t}
          />
        </Section>
      ))}
    </div>
  );
}

// ─── UI helpers ──────────────────────────────────────────────────────

function StorageBadge({
  storage,
  t,
}: {
  storage: StorageInfo;
  t: (k: string, p?: Record<string, string | number | Date>) => string;
}) {
  const pct = usagePercent(storage.usedBytes, storage.maxBytes);
  const color =
    pct > 90 ? "#ef4444" : pct > 70 ? "#f59e0b" : "var(--cat-accent)";
  return (
    <div
      className="rounded-xl border px-4 py-2.5 min-w-[220px]"
      style={{
        background: "var(--cat-card-bg)",
        borderColor: "var(--cat-card-border)",
      }}
    >
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider th-text-2 mb-1.5">
        <Database className="w-3.5 h-3.5" />
        {t("storageLabel")}
      </div>
      <div className="text-sm font-mono">
        <span style={{ color, fontWeight: 700 }}>
          {formatBytes(storage.usedBytes)}
        </span>{" "}
        / {formatBytes(storage.maxBytes)}
      </div>
      <div
        className="mt-2 h-1.5 rounded-full overflow-hidden"
        style={{ background: "rgba(0,0,0,0.06)" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)" }}
        >
          {icon}
        </div>
        <div className="flex-1">
          <CardTitle>{title}</CardTitle>
          {subtitle && <p className="text-xs th-text-2 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </Card>
  );
}

function RegulationTextEditor({
  initial,
  saving,
  onSave,
  t,
}: {
  initial: MultilangValue;
  saving: boolean;
  onSave: (v: MultilangValue) => void;
  t: (k: string) => string;
}) {
  const [value, setValue] = useState<MultilangValue>(initial);
  const [savedTick, setSavedTick] = useState(false);

  useEffect(() => {
    setValue(initial);
  }, [initial]);

  const dirty =
    value.en !== initial.en ||
    value.ru !== initial.ru ||
    value.et !== initial.et ||
    value.es !== initial.es;

  async function handleSave() {
    onSave(value);
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 1500);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-semibold th-text">{t("textLabel")}</label>
        {savedTick && (
          <span className="text-[11px] inline-flex items-center gap-1" style={{ color: "var(--cat-accent)" }}>
            <Check className="w-3.5 h-3.5" /> {t("saved")}
          </span>
        )}
      </div>
      <MultilangInput value={value} onChange={setValue} multiline rows={8} />
      <p className="text-[11px] th-text-2">{t("textHint")}</p>
      <div>
        <Button onClick={handleSave} disabled={!dirty || saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {t("saveText")}
        </Button>
      </div>
    </div>
  );
}

function DocumentList({
  orgSlug,
  tournamentId,
  classId,
  docs,
  storage,
  onChange,
  t,
}: {
  orgSlug: string;
  tournamentId: number;
  classId: number | null;
  docs: DocumentRow[];
  storage: StorageInfo | null;
  onChange: () => void;
  t: (k: string, p?: Record<string, string | number | Date>) => string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: number; ml: MultilangValue } | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (storage && file.size > storage.maxFileBytes) {
      setError(t("fileTooLarge", { max: formatBytes(storage.maxFileBytes) }));
      e.target.value = "";
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (classId != null) fd.append("classId", String(classId));
      const res = await fetch(
        `/api/org/${orgSlug}/tournament/${tournamentId}/documents`,
        { method: "POST", body: fd, credentials: "include" },
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? t("uploadFailed"));
      }
      onChange();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("uploadFailed"));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function deleteDoc(id: number) {
    if (!confirm(t("confirmDelete"))) return;
    const res = await fetch(
      `/api/org/${orgSlug}/tournament/${tournamentId}/documents/${id}`,
      { method: "DELETE", credentials: "include" },
    );
    if (res.ok) onChange();
  }

  async function saveRename() {
    if (!editing) return;
    const res = await fetch(
      `/api/org/${orgSlug}/tournament/${tournamentId}/documents/${editing.id}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:   editing.ml.en,
          nameRu: editing.ml.ru || null,
          nameEt: editing.ml.et || null,
          nameEs: editing.ml.es || null,
        }),
      },
    );
    if (res.ok) {
      setEditing(null);
      onChange();
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold th-text">{t("docsLabel")}</p>
        <Button
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          {t("upload")}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.rtf,.txt,.epub"
          onChange={handleUpload}
          className="hidden"
        />
      </div>

      {error && (
        <div className="text-xs rounded-lg bg-red-50 border border-error/20 px-3 py-2 text-error">
          {error}
        </div>
      )}

      {docs.length === 0 ? (
        <p className="text-xs th-text-2">{t("noDocs")}</p>
      ) : (
        <ul className="space-y-1.5">
          {docs.map((d) => (
            <li
              key={d.id}
              className="flex items-center gap-3 rounded-lg border px-3 py-2"
              style={{
                background: "var(--cat-card-bg)",
                borderColor: "var(--cat-card-border)",
              }}
            >
              <FileText className="w-4 h-4 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
              <div className="flex-1 min-w-0">
                {editing?.id === d.id ? (
                  <MultilangInput
                    value={editing.ml}
                    onChange={(ml) => setEditing({ id: d.id, ml })}
                    required
                  />
                ) : (
                  <>
                    <p className="text-sm font-semibold th-text truncate">{d.name}</p>
                    <p className="text-[11px] th-text-2">
                      {formatBytes(d.fileSize)} · {new Date(d.uploadedAt).toLocaleDateString()}
                    </p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {editing?.id === d.id ? (
                  <>
                    <button onClick={saveRename} className="th-text-2 hover:opacity-80">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditing(null)} className="th-text-2 hover:opacity-80">
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <a
                      href={d.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="th-text-2 hover:opacity-80 text-xs uppercase tracking-wider font-bold"
                    >
                      {t("open")}
                    </a>
                    <button
                      onClick={() =>
                        setEditing({
                          id: d.id,
                          ml: multilangFromRow(d as unknown as Record<string, unknown>, "name"),
                        })
                      }
                      className="th-text-2 hover:opacity-80"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteDoc(d.id)}
                      className="th-text-2 hover:text-error"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {storage && (
        <p className="text-[11px] th-text-2">
          {t("limitsHint", {
            file: formatBytes(storage.maxFileBytes),
            total: formatBytes(storage.maxBytes),
            ext: storage.allowedExtensions.join(", "),
          })}
        </p>
      )}
    </div>
  );
}
