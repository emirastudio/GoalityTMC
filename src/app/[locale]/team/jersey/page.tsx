"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useTeam } from "@/lib/team-context";
import { Upload, ImageIcon } from "lucide-react";

const DEFAULT_HOME = "#ffffff";
const DEFAULT_AWAY = "#0a0f1e";

function KitSvg({ color, number }: { color: string; number: string }) {
  const isDark = (() => {
    const hex = color.replace("#", "");
    if (hex.length < 6) return false;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  })();
  const textColor = isDark ? "#ffffff" : "#000000";

  return (
    <svg viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <path
        d="M25,5 L10,25 L20,28 L20,100 L80,100 L80,28 L90,25 L75,5 L62,12 C58,8 42,8 38,12 Z"
        fill={color}
        stroke="rgba(0,0,0,0.15)"
        strokeWidth="1.5"
      />
      <text
        x="50"
        y="68"
        textAnchor="middle"
        fontFamily="sans-serif"
        fontWeight="bold"
        fontSize="28"
        fill={textColor}
        opacity="0.85"
      >
        {number}
      </text>
    </svg>
  );
}

export default function JerseyPage() {
  const t = useTranslations("jersey");
  const { clubId } = useTeam();

  const [badgeUrl, setBadgeUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [homeColor, setHomeColor] = useState(DEFAULT_HOME);
  const [awayColor, setAwayColor] = useState(DEFAULT_AWAY);

  useEffect(() => {
    if (!clubId) return;
    const stored = localStorage.getItem(`kit_colors_${clubId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { home?: string; away?: string };
        if (parsed.home) setHomeColor(parsed.home);
        if (parsed.away) setAwayColor(parsed.away);
      } catch {
        // ignore
      }
    }
    fetch(`/api/clubs/${clubId}/badge`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.badgeUrl) setBadgeUrl(data.badgeUrl); });
  }, [clubId]);

  function saveColors(home: string, away: string) {
    if (!clubId) return;
    localStorage.setItem(`kit_colors_${clubId}`, JSON.stringify({ home, away }));
  }

  function handleHomeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setHomeColor(v);
    saveColors(v, awayColor);
  }

  function handleAwayChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setAwayColor(v);
    saveColors(homeColor, v);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setUploaded(false);
    setUploadError("");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setUploaded(false);
    setUploadError("");
  }

  async function handleUpload() {
    if (!file || !clubId) return;
    setUploading(true);
    setUploadError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/clubs/${clubId}/badge`, { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      if (data.badgeUrl) setBadgeUrl(data.badgeUrl);
      setUploaded(true);
      setFile(null);
      setPreview(null);
    } catch {
      setUploadError(t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  const displayBadge = preview ?? badgeUrl;

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-xl font-black th-text">{t("title")}</h1>

      {/* Club Badge */}
      <div
        className="rounded-2xl border p-5 space-y-4"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
      >
        <h2 className="text-sm font-bold th-text">{t("title")}</h2>

        <div className="flex items-center gap-4">
          <div
            className="w-24 h-24 rounded-2xl border flex items-center justify-center shrink-0 overflow-hidden"
            style={{ background: "var(--cat-bg)", borderColor: "var(--cat-card-border)" }}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
          >
            {displayBadge ? (
              <img src={displayBadge} alt="badge" className="w-full h-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-1 opacity-40">
                <ImageIcon className="w-8 h-8 th-text-2" />
                <span className="text-[10px] th-text-2">{t("noBadge")}</span>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-2">
            <p className="text-xs th-text-2">{t("hint")}</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all hover:opacity-80"
              style={{
                background: "var(--cat-badge-open-bg)",
                borderColor: "var(--cat-badge-open-border)",
                color: "var(--cat-accent)",
              }}
            >
              <Upload className="w-3.5 h-3.5" />
              {t("uploadBadge")}
            </button>
            {file && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50"
                style={{ background: "var(--cat-accent)", color: "#000" }}
              >
                {uploading ? t("submit") + "..." : t("submit")}
              </button>
            )}
            {uploaded && <p className="text-xs" style={{ color: "var(--cat-accent)" }}>{t("submitted")}</p>}
            {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}
          </div>
        </div>
      </div>

      {/* Kit Colors */}
      <div
        className="rounded-2xl border p-5 space-y-4"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
      >
        <h2 className="text-sm font-bold th-text">{t("kitColors")}</h2>

        <div className="grid grid-cols-2 gap-4">
          {/* Home */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold th-text-2">{t("homeKit")}</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={homeColor}
                onChange={handleHomeChange}
                className="w-10 h-10 rounded-xl border cursor-pointer"
                style={{ borderColor: "var(--cat-card-border)" }}
              />
              <span className="text-xs font-mono th-text-2">{homeColor}</span>
            </div>
          </div>
          {/* Away */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold th-text-2">{t("awayKit")}</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={awayColor}
                onChange={handleAwayChange}
                className="w-10 h-10 rounded-xl border cursor-pointer"
                style={{ borderColor: "var(--cat-card-border)" }}
              />
              <span className="text-xs font-mono th-text-2">{awayColor}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Kit Preview */}
      <div
        className="rounded-2xl border p-5 space-y-4"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
      >
        <h2 className="text-sm font-bold th-text">{t("preview")}</h2>

        <div className="grid grid-cols-2 gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="w-28 h-28">
              <KitSvg color={homeColor} number="10" />
            </div>
            <span className="text-xs th-text-2">{t("homeKit")}</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-28 h-28">
              <KitSvg color={awayColor} number="10" />
            </div>
            <span className="text-xs th-text-2">{t("awayKit")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
