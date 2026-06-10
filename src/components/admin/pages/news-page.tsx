"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Newspaper, Plus, Trash2, Edit, Send, Clock, Archive, Image as ImageIcon, X } from "lucide-react";

type Post = {
  id: number;
  subject: string;
  bodyMarkdown: string;
  coverUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  status: "draft" | "scheduled" | "published" | "archived";
  publishAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ApiList = { posts: Post[]; followerCount: number };

const STATUSES = ["draft", "scheduled", "published", "archived"] as const;
type Status = (typeof STATUSES)[number];

export function OrgNewsPageContent({
  orgSlug,
  tournamentId,
}: {
  orgSlug: string;
  tournamentId: number;
}) {
  const t = useTranslations("orgAdmin.news");
  const [activeTab, setActiveTab] = useState<Status>("draft");
  const [data, setData] = useState<ApiList | null>(null);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<Post | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/org/${orgSlug}/tournament/${tournamentId}/news?status=${activeTab}`,
      );
      if (!res.ok) throw new Error("fetch failed");
      const json = (await res.json()) as ApiList;
      setData(json);
    } catch {
      setData({ posts: [], followerCount: 0 });
    } finally {
      setLoading(false);
    }
  }, [orgSlug, tournamentId, activeTab]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const counts = data
    ? {
        followerCount: data.followerCount,
      }
    : { followerCount: 0 };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <header className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "var(--cat-tag-bg)" }}
          >
            <Newspaper className="w-5 h-5" style={{ color: "var(--cat-accent)" }} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black" style={{ color: "var(--cat-text)" }}>
              {t("pageTitle")}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
              {t("followerCount", { count: counts.followerCount })}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setComposerOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
          style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)" }}
        >
          <Plus className="w-4 h-4" /> {t("composeTitle")}
        </button>
      </header>

      {/* Status tabs */}
      <div
        className="flex gap-1 mb-4 p-1 rounded-xl border"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
      >
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setActiveTab(s)}
            className="flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all"
            style={{
              background: activeTab === s ? "var(--cat-tag-bg)" : "transparent",
              color: activeTab === s ? "var(--cat-accent)" : "var(--cat-text-muted)",
            }}
          >
            {t(
              s === "draft"
                ? "tabDraft"
                : s === "scheduled"
                  ? "tabScheduled"
                  : s === "published"
                    ? "tabPublished"
                    : "tabArchived",
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>
          {t("loading", { default: "Loading…" })}
        </p>
      ) : !data || data.posts.length === 0 ? (
        <div
          className="rounded-2xl border p-12 text-center"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
        >
          <Newspaper className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--cat-text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--cat-text-secondary)" }}>{t("emptyState")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.posts.map((post) => (
            <PostRow
              key={post.id}
              post={post}
              orgSlug={orgSlug}
              tournamentId={tournamentId}
              onChanged={reload}
              onEdit={() => {
                setEditing(post);
                setComposerOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {composerOpen && (
        <Composer
          orgSlug={orgSlug}
          tournamentId={tournamentId}
          editing={editing}
          onClose={() => {
            setComposerOpen(false);
            setEditing(null);
          }}
          onSaved={async () => {
            setComposerOpen(false);
            setEditing(null);
            await reload();
          }}
        />
      )}
    </div>
  );
}

function PostRow({
  post,
  orgSlug,
  tournamentId,
  onChanged,
  onEdit,
}: {
  post: Post;
  orgSlug: string;
  tournamentId: number;
  onChanged: () => Promise<void>;
  onEdit: () => void;
}) {
  const t = useTranslations("orgAdmin.news");
  const [busy, setBusy] = useState(false);

  const callPublish = async () => {
    if (!confirm(t("confirmPublish"))) return;
    setBusy(true);
    try {
      await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/news/${post.id}/publish`, {
        method: "POST",
      });
      await onChanged();
    } finally {
      setBusy(false);
    }
  };

  const callArchive = async () => {
    if (!confirm(t("confirmArchive"))) return;
    setBusy(true);
    try {
      await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/news/${post.id}`, {
        method: "DELETE",
      });
      await onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="rounded-2xl border p-4"
      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
    >
      <div className="flex items-start gap-3">
        {post.coverUrl ? (
          <img src={post.coverUrl} alt="" className="w-20 h-20 rounded-xl object-cover shrink-0" />
        ) : (
          <div
            className="w-20 h-20 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--cat-tag-bg)" }}
          >
            <ImageIcon className="w-6 h-6" style={{ color: "var(--cat-text-muted)" }} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-base font-bold truncate" style={{ color: "var(--cat-text)" }}>
            {post.subject}
          </p>
          <p
            className="text-xs mt-1 line-clamp-2"
            style={{ color: "var(--cat-text-secondary)" }}
          >
            {post.bodyMarkdown.slice(0, 200)}
          </p>
          <div className="flex items-center gap-3 mt-2 text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
            <span>{new Date(post.updatedAt).toLocaleString()}</span>
            {post.publishAt && post.status === "scheduled" && (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" /> {new Date(post.publishAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1 shrink-0">
          {(post.status === "draft" || post.status === "scheduled") && (
            <>
              <button
                type="button"
                onClick={callPublish}
                disabled={busy}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)" }}
              >
                <Send className="w-3 h-3" /> {t("actionPublishNow")}
              </button>
              <button
                type="button"
                onClick={onEdit}
                disabled={busy}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border"
                style={{
                  background: "var(--cat-tag-bg)",
                  borderColor: "var(--cat-card-border)",
                  color: "var(--cat-text-secondary)",
                }}
              >
                <Edit className="w-3 h-3" /> {t("actionEdit")}
              </button>
              <button
                type="button"
                onClick={callArchive}
                disabled={busy}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ color: "var(--cat-text-muted)" }}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </>
          )}
          {post.status === "published" && (
            <>
              <button
                type="button"
                onClick={onEdit}
                disabled={busy}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border"
                style={{
                  background: "var(--cat-tag-bg)",
                  borderColor: "var(--cat-card-border)",
                  color: "var(--cat-text-secondary)",
                }}
              >
                <Edit className="w-3 h-3" /> {t("actionEdit")}
              </button>
              <button
                type="button"
                onClick={callArchive}
                disabled={busy}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ color: "var(--cat-text-muted)" }}
              >
                <Archive className="w-3 h-3" /> {t("actionArchive")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Composer({
  orgSlug,
  tournamentId,
  editing,
  onClose,
  onSaved,
}: {
  orgSlug: string;
  tournamentId: number;
  editing: Post | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const t = useTranslations("orgAdmin.news");
  const [subject, setSubject] = useState(editing?.subject ?? "");
  const [body, setBody] = useState(editing?.bodyMarkdown ?? "");
  const [coverUrl, setCoverUrl] = useState<string | null>(editing?.coverUrl ?? null);
  const [ctaLabel, setCtaLabel] = useState(editing?.ctaLabel ?? "");
  const [ctaUrl, setCtaUrl] = useState(editing?.ctaUrl ?? "");
  const [publishAt, setPublishAt] = useState<string>(
    editing?.publishAt ? new Date(editing.publishAt).toISOString().slice(0, 16) : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ensureDraft = async (): Promise<number | null> => {
    if (editing) return editing.id;
    const res = await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/news`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        bodyMarkdown: body,
        coverUrl,
        ctaLabel: ctaLabel || null,
        ctaUrl: ctaUrl || null,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error ?? "Save failed");
    }
    const json = await res.json();
    return json.post?.id ?? null;
  };

  const patchExisting = async (id: number, partial: Record<string, unknown>) => {
    const res = await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/news/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partial),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error ?? "Save failed");
    }
  };

  const onUpload = async (file: File, id: number) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(
      `/api/org/${orgSlug}/tournament/${tournamentId}/news/${id}/cover`,
      { method: "POST", body: form },
    );
    if (!res.ok) throw new Error("Upload failed");
    const j = await res.json();
    setCoverUrl(j.coverUrl);
  };

  const saveDraft = async () => {
    if (!subject.trim() || !body.trim()) {
      setError(t("validationRequired", { default: "Subject and body required" }));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await patchExisting(editing.id, {
          subject,
          bodyMarkdown: body,
          coverUrl,
          ctaLabel: ctaLabel || null,
          ctaUrl: ctaUrl || null,
        });
      } else {
        await ensureDraft();
      }
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const publishNow = async () => {
    if (!subject.trim() || !body.trim()) {
      setError(t("validationRequired", { default: "Subject and body required" }));
      return;
    }
    if (!confirm(t("confirmPublish"))) return;
    setSaving(true);
    setError(null);
    try {
      const id = editing ? editing.id : await ensureDraft();
      if (!id) throw new Error("Could not create draft");
      if (editing) {
        await patchExisting(id, {
          subject,
          bodyMarkdown: body,
          coverUrl,
          ctaLabel: ctaLabel || null,
          ctaUrl: ctaUrl || null,
        });
      }
      const res = await fetch(
        `/api/org/${orgSlug}/tournament/${tournamentId}/news/${id}/publish`,
        { method: "POST" },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Publish failed");
      }
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setSaving(false);
    }
  };

  const schedule = async () => {
    if (!subject.trim() || !body.trim()) {
      setError(t("validationRequired", { default: "Subject and body required" }));
      return;
    }
    if (!publishAt) {
      setError(t("validationPublishAt", { default: "Set publish date" }));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const id = editing ? editing.id : await ensureDraft();
      if (!id) throw new Error("Could not create draft");
      if (editing) {
        await patchExisting(id, {
          subject,
          bodyMarkdown: body,
          coverUrl,
          ctaLabel: ctaLabel || null,
          ctaUrl: ctaUrl || null,
        });
      }
      const res = await fetch(
        `/api/org/${orgSlug}/tournament/${tournamentId}/news/${id}/schedule`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publishAt: new Date(publishAt).toISOString() }),
        },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Schedule failed");
      }
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Schedule failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
    >
      <div
        className="rounded-2xl border w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
      >
        <div
          className="px-5 py-4 border-b flex items-center justify-between"
          style={{ borderColor: "var(--cat-card-border)" }}
        >
          <h2 className="text-base font-bold" style={{ color: "var(--cat-text)" }}>
            {editing ? t("editTitle", { default: "Edit post" }) : t("composeTitle")}
          </h2>
          <button type="button" onClick={onClose}>
            <X className="w-5 h-5" style={{ color: "var(--cat-text-muted)" }} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
              {error}
            </p>
          )}

          <Field label={t("subjectLabel")}>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={280}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                background: "var(--cat-tag-bg)",
                color: "var(--cat-text)",
                border: "1px solid var(--cat-card-border)",
              }}
            />
          </Field>

          <Field label={t("bodyLabel")} hint={t("bodyHelpMarkdown")}>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={20000}
              rows={10}
              className="w-full px-3 py-2 rounded-lg text-sm font-mono"
              style={{
                background: "var(--cat-tag-bg)",
                color: "var(--cat-text)",
                border: "1px solid var(--cat-card-border)",
              }}
            />
          </Field>

          <Field label={t("coverLabel")}>
            <CoverPicker
              coverUrl={coverUrl}
              onPick={async (file) => {
                let id = editing?.id;
                if (!id) {
                  // Need a draft first to upload against.
                  if (!subject.trim() || !body.trim()) {
                    setError(t("validationRequired", { default: "Subject and body required" }));
                    return;
                  }
                  id = (await ensureDraft()) ?? undefined;
                }
                if (!id) return;
                await onUpload(file, id);
              }}
              onClear={() => setCoverUrl(null)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t("ctaLabelField")}>
              <input
                type="text"
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                placeholder="Download schedule"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  background: "var(--cat-tag-bg)",
                  color: "var(--cat-text)",
                  border: "1px solid var(--cat-card-border)",
                }}
              />
            </Field>
            <Field label={t("ctaUrlField")}>
              <input
                type="url"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                placeholder="https://"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  background: "var(--cat-tag-bg)",
                  color: "var(--cat-text)",
                  border: "1px solid var(--cat-card-border)",
                }}
              />
            </Field>
          </div>

          <Field label={t("publishAtLabel")}>
            <input
              type="datetime-local"
              value={publishAt}
              onChange={(e) => setPublishAt(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                background: "var(--cat-tag-bg)",
                color: "var(--cat-text)",
                border: "1px solid var(--cat-card-border)",
              }}
            />
          </Field>
        </div>

        <div
          className="px-5 py-4 border-t flex items-center gap-2 justify-end"
          style={{ borderColor: "var(--cat-card-border)" }}
        >
          <button
            type="button"
            onClick={saveDraft}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-xs font-bold border"
            style={{
              background: "var(--cat-tag-bg)",
              borderColor: "var(--cat-card-border)",
              color: "var(--cat-text-secondary)",
            }}
          >
            {t("actionSaveDraft")}
          </button>
          {publishAt && (
            <button
              type="button"
              onClick={schedule}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-xs font-bold"
              style={{ background: "rgba(43,254,186,0.12)", color: "var(--cat-accent)" }}
            >
              <Clock className="w-3 h-3 inline mr-1" /> {t("actionSchedule")}
            </button>
          )}
          <button
            type="button"
            onClick={publishNow}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-xs font-bold"
            style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)" }}
          >
            <Send className="w-3 h-3 inline mr-1" /> {t("actionPublishNow")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span
        className="block text-xs font-bold mb-1 uppercase tracking-wide"
        style={{ color: "var(--cat-text-muted)" }}
      >
        {label}
      </span>
      {children}
      {hint && (
        <span className="block text-[10px] mt-1" style={{ color: "var(--cat-text-faint)" }}>
          {hint}
        </span>
      )}
    </label>
  );
}

function CoverPicker({
  coverUrl,
  onPick,
  onClear,
}: {
  coverUrl: string | null;
  onPick: (file: File) => Promise<void>;
  onClear: () => void;
}) {
  const t = useTranslations("orgAdmin.news");
  return (
    <div className="flex items-start gap-3">
      {coverUrl ? (
        <div className="relative">
          <img src={coverUrl} alt="" className="w-32 h-20 object-cover rounded-lg" />
          <button
            type="button"
            onClick={onClear}
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black text-white flex items-center justify-center"
            aria-label="Remove cover"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : null}
      <label
        className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border"
        style={{
          background: "var(--cat-tag-bg)",
          borderColor: "var(--cat-card-border)",
          color: "var(--cat-text-secondary)",
        }}
      >
        <ImageIcon className="w-3.5 h-3.5" />
        {t("coverUpload")}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onPick(f);
          }}
        />
      </label>
    </div>
  );
}
