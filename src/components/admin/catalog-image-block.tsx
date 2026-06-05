"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import { ImageCropperModal } from "@/components/admin/image-cropper-modal";

const ACCENT = "#2BFEBA";

/**
 * Self-contained "Catalog image" upload block. Used inside StepMedia of the
 * tournament Setup wizard so logo + cover + catalog image live in one section.
 *
 * Loads + saves via `/api/org/{orgSlug}/tournament/{tournamentId}/settings`
 * and the dedicated `/card-image` upload endpoint. Crops to 7:4 (700×400)
 * before upload.
 */
export function CatalogImageBlock({
  orgSlug,
  tournamentId,
}: {
  orgSlug: string;
  tournamentId: number;
}) {
  const t = useTranslations("orgAdmin");
  const apiBase = `/api/org/${orgSlug}/tournament/${tournamentId}`;

  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  // Surface upload failures — same silent-fail anti-pattern as tournament
  // logo/cover (no setError on !res.ok / no try/catch on network reject).
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${apiBase}/settings`);
        if (res.ok) {
          const d = await res.json();
          if (!cancelled) setUrl(d.cardImageUrl ?? null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [apiBase]);

  async function uploadBlob(blob: Blob, filename = "upload.jpg") {
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", blob, filename);
      const res = await fetch(`${apiBase}/card-image`, { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({} as { error?: string; message?: string }));
        setUploadError(d.message || d.error || `HTTP ${res.status}`);
        return;
      }
      const d = await res.json();
      setUrl(d.url ?? d.cardImageUrl ?? null);
    } catch {
      setUploadError("Network error — check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => setCropSrc((e.target?.result as string) ?? null);
    reader.readAsDataURL(file);
  }

  async function handleCropDone(blob: Blob) {
    setCropSrc(null);
    await uploadBlob(blob);
  }

  const inputId = `card-image-${orgSlug}-${tournamentId}`;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-bold mb-1" style={{ color: "var(--cat-text)" }}>
          {t("catalogImageSection")}
        </p>
        <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
          {t("catalogImageHint")}
        </p>
      </div>
      <label
        htmlFor={inputId}
        className="relative w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all hover:opacity-80 cursor-pointer select-none"
        style={{
          borderColor: url ? ACCENT : "var(--cat-card-border)",
          background: url ? `${ACCENT}08` : "var(--cat-tag-bg)",
          overflow: "hidden",
          aspectRatio: "700 / 400",
        }}
      >
        {url && <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        <div className="relative z-10 flex flex-col items-center gap-1 pointer-events-none px-3 py-1.5 rounded-lg"
          style={{ background: url ? "rgba(0,0,0,0.55)" : "transparent" }}>
          {(uploading || loading)
            ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: url ? "#fff" : ACCENT }} />
            : <ImageIcon className="w-5 h-5" style={{ color: url ? "#fff" : "var(--cat-text-muted)" }} />}
          <span className="text-xs font-semibold" style={{ color: url ? "#fff" : "var(--cat-text-muted)" }}>
            {url ? t("change") : t("catalogImageUpload")}
          </span>
        </div>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={uploading || loading}
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) { handleFile(f); e.target.value = ""; }
          }}
        />
      </label>
      {uploadError && (
        <p className="text-xs mt-2" style={{ color: "#ef4444" }}>{uploadError}</p>
      )}
      {cropSrc && (
        <ImageCropperModal
          src={cropSrc}
          aspect={700 / 400}
          shape="rect"
          onDone={handleCropDone}
          onCancel={() => setCropSrc(null)}
        />
      )}
    </div>
  );
}
