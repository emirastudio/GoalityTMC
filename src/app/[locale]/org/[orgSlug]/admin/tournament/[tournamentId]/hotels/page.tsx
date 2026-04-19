"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Hotel, Plus, Trash2, Loader2, MapPin, Phone, Mail, User, StickyNote, ImagePlus, X } from "lucide-react";
import { useAdminFetch } from "@/lib/tournament-context";

interface TournamentHotel {
  id: number;
  name: string;
  address: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  notes: string | null;
  photoUrl: string | null;
  sortOrder: number;
}

// Дебаунс на одной карточке: копим локальные правки в state, шлём PATCH
// при blur каждого поля — достаточно для «настроек-раз-в-несколько-секунд»
// и не плодим лишних запросов при вводе символа за символом.
export default function HotelsPage() {
  const params = useParams<{ orgSlug: string; tournamentId: string; locale: string }>();
  const tournamentId = Number(params.tournamentId);
  const t = useTranslations("hotelsAdmin");
  const adminFetch = useAdminFetch();

  const [hotels, setHotels] = useState<TournamentHotel[] | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const res = await adminFetch("/api/admin/tournament-hotels");
    if (res.ok) {
      const d = await res.json();
      setHotels(Array.isArray(d) ? d : []);
    } else {
      setHotels([]);
    }
  }, [adminFetch]);

  useEffect(() => { if (Number.isFinite(tournamentId)) load(); }, [load, tournamentId]);

  async function addHotel() {
    setAdding(true);
    try {
      const res = await adminFetch("/api/admin/tournament-hotels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: t("newHotelDefault"), sortOrder: (hotels?.length ?? 0) }),
      });
      if (res.ok) await load();
    } finally {
      setAdding(false);
    }
  }

  async function patchHotel(h: TournamentHotel, next: Partial<TournamentHotel>) {
    const merged = { ...h, ...next };
    setHotels((list) => list?.map((x) => x.id === h.id ? merged : x) ?? null);
    await adminFetch("/api/admin/tournament-hotels", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(merged),
    });
  }

  async function deleteHotel(h: TournamentHotel) {
    if (!confirm(t("confirmDelete", { name: h.name }))) return;
    setHotels((list) => list?.filter((x) => x.id !== h.id) ?? null);
    await adminFetch(`/api/admin/tournament-hotels?id=${h.id}`, { method: "DELETE" });
  }

  return (
    <div className="space-y-7 max-w-5xl">
      {/* ── Premium page header ───────────────────────────── */}
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
          style={{
            background: "linear-gradient(135deg, var(--cat-badge-open-bg) 0%, rgba(16,185,129,0.08) 100%)",
            border: "1px solid var(--cat-card-border)",
            boxShadow: "0 0 24px var(--cat-accent-glow)",
          }}>
          <Hotel className="w-6 h-6" style={{ color: "var(--cat-accent)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-black tracking-tight" style={{ color: "var(--cat-text)" }}>
            {t("pageTitle")}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--cat-text-muted)" }}>
            {t("pageSubtitle")}
          </p>
        </div>
        <button
          onClick={addHotel}
          disabled={adding || !hotels}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-95 disabled:opacity-50"
          style={{
            background: "var(--cat-accent)",
            color: "var(--cat-accent-text)",
            boxShadow: "0 0 22px var(--cat-accent-glow)",
            cursor: adding ? "wait" : "pointer",
          }}
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {t("addHotel")}
        </button>
      </div>

      {/* ── Body ──────────────────────────────────────────── */}
      {!hotels ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--cat-text-muted)" }} />
        </div>
      ) : hotels.length === 0 ? (
        <EmptyHotels t={t} onAdd={addHotel} />
      ) : (
        <div className="space-y-4">
          {hotels.map((h, i) => (
            <HotelCard
              key={h.id}
              hotel={h}
              index={i + 1}
              label={{
                namePlaceholder: t("namePlaceholder"),
                address: t("address"),
                contactName: t("contactName"),
                contactPhone: t("contactPhone"),
                contactEmail: t("contactEmail"),
                notes: t("notes"),
                notesPlaceholder: t("notesPlaceholder"),
                delete: t("delete"),
                addPhoto: t("addPhoto"),
                removePhoto: t("removePhoto"),
                uploading: t("uploading"),
              }}
              onPatch={(next) => patchHotel(h, next)}
              onDelete={() => deleteHotel(h)}
              uploadImage={async (file) => {
                const fd = new FormData();
                fd.append("file", file);
                const res = await adminFetch("/api/admin/upload", { method: "POST", body: fd });
                if (!res.ok) {
                  const err = await res.json().catch(() => ({}));
                  const msg = err.error ?? `Upload failed (${res.status})`;
                  alert(msg);
                  return null;
                }
                const d = await res.json();
                return d.url as string;
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyHotels({ t, onAdd }: { t: (k: string) => string; onAdd: () => void }) {
  return (
    <div className="rounded-3xl p-12 border text-center"
      style={{
        background: "linear-gradient(135deg, var(--cat-card-bg) 0%, rgba(16,185,129,0.04) 100%)",
        borderColor: "var(--cat-card-border)",
      }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{
          background: "var(--cat-badge-open-bg)",
          border: "1px solid var(--cat-card-border)",
          boxShadow: "0 0 24px var(--cat-accent-glow)",
        }}>
        <Hotel className="w-7 h-7" style={{ color: "var(--cat-accent)" }} />
      </div>
      <h3 className="text-lg font-bold mb-1" style={{ color: "var(--cat-text)" }}>
        {t("emptyTitle")}
      </h3>
      <p className="text-sm mb-5 max-w-md mx-auto" style={{ color: "var(--cat-text-muted)" }}>
        {t("emptyHint")}
      </p>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
        style={{
          background: "var(--cat-accent)",
          color: "var(--cat-accent-text)",
          boxShadow: "0 0 22px var(--cat-accent-glow)",
        }}
      >
        <Plus className="w-4 h-4" /> {t("addHotel")}
      </button>
    </div>
  );
}

function HotelCard({
  hotel,
  index,
  label,
  onPatch,
  onDelete,
  uploadImage,
}: {
  hotel: TournamentHotel;
  index: number;
  label: {
    namePlaceholder: string;
    address: string;
    contactName: string;
    contactPhone: string;
    contactEmail: string;
    notes: string;
    notesPlaceholder: string;
    delete: string;
    addPhoto: string;
    removePhoto: string;
    uploading: string;
  };
  onPatch: (next: Partial<TournamentHotel>) => void;
  onDelete: () => void;
  uploadImage: (file: File) => Promise<string | null>;
}) {
  // Local working copy — commits to parent on blur. Stops every keystroke
  // from triggering a PATCH while still feeling immediate in the UI.
  const [local, setLocal] = useState(hotel);
  const [uploading, setUploading] = useState(false);
  useEffect(() => { setLocal(hotel); }, [hotel]);

  const commit = (field: keyof TournamentHotel) => () => {
    if (local[field] !== hotel[field]) {
      onPatch({ [field]: local[field] ?? null });
    }
  };

  async function onFilePicked(file: File) {
    setUploading(true);
    try {
      const url = await uploadImage(file);
      if (url) {
        setLocal((l) => ({ ...l, photoUrl: url }));
        onPatch({ photoUrl: url });
      }
    } finally {
      setUploading(false);
    }
  }

  const input = "w-full px-3 py-2.5 rounded-lg text-sm border outline-none transition-colors";
  const inputStyle: React.CSSProperties = {
    background: "var(--cat-bg)",
    borderColor: "var(--cat-card-border)",
    color: "var(--cat-text)",
  };

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        background: "linear-gradient(135deg, var(--cat-card-bg) 0%, rgba(16,185,129,0.03) 100%)",
        borderColor: "var(--cat-card-border)",
      }}
    >
      {/* Header row: index badge + name + delete */}
      <div className="flex items-center gap-3 p-5 pb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0"
          style={{
            background: "var(--cat-badge-open-bg)",
            color: "var(--cat-accent)",
            border: "1px solid var(--cat-card-border)",
          }}
        >
          {index}
        </div>
        <input
          value={local.name}
          onChange={(e) => setLocal({ ...local, name: e.target.value })}
          onBlur={commit("name")}
          placeholder={label.namePlaceholder}
          className="flex-1 px-3 py-2.5 rounded-lg text-base font-bold border outline-none"
          style={inputStyle}
        />
        <button
          onClick={onDelete}
          className="p-2.5 rounded-lg transition-colors hover:opacity-80 shrink-0"
          title={label.delete}
          style={{
            background: "rgba(239,68,68,0.08)",
            color: "#ef4444",
            border: "1px solid rgba(239,68,68,0.25)",
          }}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Photo strip */}
      <div className="px-5 pb-3">
        {local.photoUrl ? (
          <div className="relative w-full rounded-xl overflow-hidden border"
            style={{ borderColor: "var(--cat-card-border)", aspectRatio: "21 / 9" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={local.photoUrl} alt={local.name}
              className="w-full h-full object-cover" />
            <button
              onClick={() => {
                setLocal((l) => ({ ...l, photoUrl: null }));
                onPatch({ photoUrl: null });
              }}
              title={label.removePhoto}
              className="absolute top-2 right-2 w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:opacity-90"
              style={{
                background: "rgba(0,0,0,0.55)",
                color: "#fff",
                backdropFilter: "blur(8px)",
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label
            className="flex items-center justify-center gap-2 w-full h-20 rounded-xl border border-dashed cursor-pointer transition-colors hover:opacity-80"
            style={{
              borderColor: "var(--cat-card-border)",
              background: "var(--cat-bg)",
              color: "var(--cat-text-muted)",
            }}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-semibold">{label.uploading}</span>
              </>
            ) : (
              <>
                <ImagePlus className="w-4 h-4" />
                <span className="text-sm font-semibold">{label.addPhoto}</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              // Visually hidden (vs `display:none` which Safari/Firefox
              // refuse to trigger via label click).
              style={{
                position: "absolute",
                width: 1,
                height: 1,
                padding: 0,
                margin: -1,
                overflow: "hidden",
                clip: "rect(0,0,0,0)",
                whiteSpace: "nowrap",
                border: 0,
              }}
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFilePicked(f);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>

      {/* Fields grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-5 pb-5">
        <FieldInput
          icon={MapPin}
          value={local.address ?? ""}
          onChange={(v) => setLocal({ ...local, address: v })}
          onBlur={commit("address")}
          placeholder={label.address}
        />
        <FieldInput
          icon={User}
          value={local.contactName ?? ""}
          onChange={(v) => setLocal({ ...local, contactName: v })}
          onBlur={commit("contactName")}
          placeholder={label.contactName}
        />
        <FieldInput
          icon={Phone}
          value={local.contactPhone ?? ""}
          onChange={(v) => setLocal({ ...local, contactPhone: v })}
          onBlur={commit("contactPhone")}
          placeholder={label.contactPhone}
          inputMode="tel"
        />
        <FieldInput
          icon={Mail}
          value={local.contactEmail ?? ""}
          onChange={(v) => setLocal({ ...local, contactEmail: v })}
          onBlur={commit("contactEmail")}
          placeholder={label.contactEmail}
          inputMode="email"
          type="email"
        />
        <div className="md:col-span-2">
          <div className="relative">
            <StickyNote className="w-4 h-4 absolute left-3 top-3.5" style={{ color: "var(--cat-text-muted)" }} />
            <textarea
              rows={2}
              value={local.notes ?? ""}
              onChange={(e) => setLocal({ ...local, notes: e.target.value })}
              onBlur={commit("notes")}
              placeholder={label.notesPlaceholder}
              className={`${input} pl-10 resize-none`}
              style={inputStyle}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldInput({
  icon: Icon,
  value,
  onChange,
  onBlur,
  placeholder,
  inputMode,
  type,
}: {
  icon: React.ElementType;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  placeholder: string;
  inputMode?: "tel" | "email" | "text";
  type?: string;
}) {
  return (
    <div className="relative">
      <Icon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
        style={{ color: "var(--cat-text-muted)" }} />
      <input
        type={type ?? "text"}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className="w-full pl-10 pr-3 py-2.5 rounded-lg text-sm border outline-none"
        style={{
          background: "var(--cat-bg)",
          borderColor: "var(--cat-card-border)",
          color: "var(--cat-text)",
        }}
      />
    </div>
  );
}
