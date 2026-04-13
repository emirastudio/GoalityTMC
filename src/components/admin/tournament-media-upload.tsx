"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2, Loader2, Camera, Shield } from "lucide-react";
import { ImageCropperModal } from "./image-cropper-modal";
import { useTranslations } from "next-intl";

interface Props {
  orgSlug: string;
  tournamentId: number;
  initialCoverUrl: string | null;
  initialLogoUrl: string | null;
  onLogoChange?: (url: string | null) => void;
  onCoverChange?: (url: string | null) => void;
}

export function TournamentMediaUpload({ orgSlug, tournamentId, initialCoverUrl, initialLogoUrl, onLogoChange, onCoverChange }: Props) {
  const t = useTranslations("orgAdmin");
  const [coverUrl, setCoverUrl] = useState(initialCoverUrl);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Cropper state
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<"logo" | "cover" | null>(null);

  const coverRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  function openCropperForFile(file: File, target: "logo" | "cover") {
    const url = URL.createObjectURL(file);
    setCropSrc(url);
    setCropTarget(target);
  }

  async function handleCropDone(blob: Blob) {
    if (!cropTarget) return;
    const file = new File([blob], `${cropTarget}-${Date.now()}.png`, { type: "image/png" });
    setCropSrc(null);
    setCropTarget(null);

    if (cropTarget === "logo") {
      setUploadingLogo(true);
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/logo`, { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        setLogoUrl(data.logoUrl);
        onLogoChange?.(data.logoUrl);
      }
      setUploadingLogo(false);
    } else {
      setUploadingCover(true);
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/cover`, { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        setCoverUrl(data.coverUrl);
        onCoverChange?.(data.coverUrl);
      }
      setUploadingCover(false);
    }
  }

  async function deleteCover() {
    setUploadingCover(true);
    await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/cover`, { method: "DELETE" });
    setCoverUrl(null);
    onCoverChange?.(null);
    setUploadingCover(false);
  }

  return (
    <>
      {/* Cropper modal */}
      {cropSrc && cropTarget && (
        <ImageCropperModal
          src={cropSrc}
          aspect={cropTarget === "logo" ? 1 : 4 / 1}
          shape="rect"
          onDone={handleCropDone}
          onCancel={() => { setCropSrc(null); setCropTarget(null); }}
        />
      )}

      <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>

        {/* ── Cover area ── */}
        <div
          className="relative w-full group cursor-pointer"
          style={{
            height: "180px",
            background: coverUrl ? undefined : "var(--cat-tag-bg)",
          }}
          onClick={() => !uploadingCover && coverRef.current?.click()}
        >
          {coverUrl && (
            <img src={coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}

          {/* Empty state */}
          {!coverUrl && !uploadingCover && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "var(--cat-card-border)" }}>
                <ImagePlus className="w-5 h-5" style={{ color: "var(--cat-text-muted)" }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: "var(--cat-text-muted)" }}>{t("uploadCover")}</p>
              <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>1920×480 · JPG/PNG · до 20MB</p>
            </div>
          )}

          {uploadingCover && (
            <div className="absolute inset-0 flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.4)" }}>
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--cat-accent)" }} />
            </div>
          )}

          {/* Hover controls */}
          {coverUrl && !uploadingCover && (
            <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "rgba(0,0,0,0.5)" }}>
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
                onClick={e => { e.stopPropagation(); coverRef.current?.click(); }}
              >
                <Camera className="w-4 h-4" /> {t("changeCover")}
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: "rgba(239,68,68,0.25)", color: "#EF4444", backdropFilter: "blur(8px)" }}
                onClick={e => { e.stopPropagation(); deleteCover(); }}
              >
                <Trash2 className="w-4 h-4" /> {t("deleteCover")}
              </button>
            </div>
          )}

          <input ref={coverRef} type="file" accept="image/*"
            style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
            onChange={e => { if (e.target.files?.[0]) { openCropperForFile(e.target.files[0], "cover"); e.target.value = ""; } }} />

          <div className="absolute top-3 left-3">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md"
              style={{ background: "rgba(0,0,0,0.45)", color: "rgba(255,255,255,0.75)", backdropFilter: "blur(4px)" }}>
              {t("cover")}
            </span>
          </div>
        </div>

        {/* ── Logo row ── */}
        <div className="flex items-center gap-4 px-5 py-4 border-t" style={{ borderColor: "var(--cat-card-border)" }}>
          {/* Avatar with cropper */}
          <div
            className="relative shrink-0 cursor-pointer group"
            style={{ width: 64, height: 64 }}
            onClick={() => !uploadingLogo && logoRef.current?.click()}
          >
            {/* Rounded square frame */}
            <div
              className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center"
              style={{
                background: "var(--cat-tag-bg)",
                border: `2px solid var(--cat-accent)`,
                boxShadow: "0 0 0 3px var(--cat-accent-glow)",
              }}
            >
              {logoUrl ? (
                <img src={logoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <Shield className="w-6 h-6" style={{ color: "var(--cat-text-muted)" }} />
              )}
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "rgba(0,0,0,0.55)" }}>
              {uploadingLogo
                ? <Loader2 className="w-5 h-5 animate-spin text-white" />
                : <Camera className="w-5 h-5 text-white" />
              }
            </div>

            <input ref={logoRef} type="file" accept="image/*"
              style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
              onChange={e => { if (e.target.files?.[0]) { openCropperForFile(e.target.files[0], "logo"); e.target.value = ""; } }} />
          </div>

          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--cat-text)" }}>{t("tournamentLogo")}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
              {t("logoHint")}
            </p>
            <button className="text-xs font-medium mt-1.5" style={{ color: "var(--cat-accent)" }}
              onClick={() => logoRef.current?.click()}>
              {logoUrl ? t("changeLogo") : t("uploadLogo")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
