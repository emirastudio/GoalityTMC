"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Image, Upload, Trash2, AlertCircle } from "lucide-react";

const MAX_PHOTOS = 5;

export default function ListingPhotosPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const listingId = params.listingId as string;
  const t = useTranslations("adminListing");

  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/org/${orgSlug}/listing/${listingId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.listing) {
          try {
            setPhotos(JSON.parse(data.listing.photos ?? "[]"));
          } catch {
            setPhotos([]);
          }
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [orgSlug, listingId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photos.length >= MAX_PHOTOS) {
      setError(t("maxPhotosAllowed", { max: MAX_PHOTOS }));
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/org/${orgSlug}/listing/${listingId}/photos`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setPhotos(data.photos);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(photoUrl: string) {
    setDeletingUrl(photoUrl);
    setError(null);
    try {
      const res = await fetch(`/api/org/${orgSlug}/listing/${listingId}/photos`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      setPhotos(data.photos);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete error");
    } finally {
      setDeletingUrl(null);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Back link */}
      <Link href={`/org/${orgSlug}/admin/listing/${listingId}`} className="text-sm hover:underline" style={{ color: "var(--cat-text-secondary)" }}>
        {t("backToListing")}
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--cat-text)" }}>
            {t("photosTitle")}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--cat-text-secondary)" }}>
            {t("photosDesc", { max: MAX_PHOTOS })}
          </p>
        </div>
        <span className="text-sm font-bold" style={{ color: "var(--cat-text-secondary)" }}>
          {t("photosCount", { count: photos.length, max: MAX_PHOTOS })}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div
          className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444" }}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Upload button */}
      {photos.length < MAX_PHOTOS && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
            id="photo-upload"
          />
          <label
            htmlFor="photo-upload"
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-bold text-sm cursor-pointer transition-all hover:opacity-90"
            style={{ background: "var(--cat-accent)", color: "#0A0E14", opacity: uploading ? 0.6 : undefined, pointerEvents: uploading ? "none" : undefined }}
          >
            <Upload className="w-4 h-4" />
            {uploading ? t("uploadingPhoto") : t("uploadPhoto")}
          </label>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-sm" style={{ color: "var(--cat-text-secondary)" }}>{t("loading")}</div>
      )}

      {/* Photos grid */}
      {!loading && photos.length === 0 && (
        <div
          className="rounded-2xl border-2 border-dashed p-12 flex flex-col items-center gap-3 text-center"
          style={{ borderColor: "var(--cat-card-border)" }}
        >
          <Image className="w-10 h-10" style={{ color: "var(--cat-text-muted)" }} />
          <p className="font-medium" style={{ color: "var(--cat-text-secondary)" }}>{t("noPhotosYet")}</p>
          <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>{t("noPhotosHint")}</p>
        </div>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {photos.map((url) => (
            <div
              key={url}
              className="relative group rounded-2xl overflow-hidden border aspect-video"
              style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-tag-bg)" }}
            >
              <img
                src={url}
                alt="Tournament photo"
                className="w-full h-full object-cover"
              />
              {/* Delete overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "rgba(0,0,0,0.5)" }}>
                <button
                  onClick={() => handleDelete(url)}
                  disabled={deletingUrl === url}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition-all hover:opacity-80 disabled:opacity-40"
                  style={{ background: "rgba(239,68,68,0.9)", color: "#fff" }}
                >
                  <Trash2 className="w-4 h-4" />
                  {deletingUrl === url ? t("deletingPhoto") : t("deletePhoto")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
