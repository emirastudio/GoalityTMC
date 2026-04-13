"use client";

// ── Стадионы и площадки ───────────────────────────────────────────────────────
// Двухуровневая модель: Стадион (адрес, контакт, карты) → Площадки (A/B/C/D)
// Все действия сохраняются мгновенно через API

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useTournament } from "@/lib/tournament-context";
import {
  MapPin, Plus, Trash2, Edit2, Save, X, Loader2,
  Phone, Navigation, ExternalLink, ChevronDown, ChevronUp,
  CheckCircle,
} from "lucide-react";

const ACCENT = "#ec4899";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Field {
  id: number;
  stadiumId: number | null;
  tournamentId: number;
  name: string;
  address: string | null;
  mapUrl: string | null;
  notes: string | null;
  sortOrder: number;
}

interface Stadium {
  id: number;
  tournamentId: number;
  name: string;
  address: string | null;
  contactName: string | null;
  contactPhone: string | null;
  mapsUrl: string | null;
  wazeUrl: string | null;
  notes: string | null;
  sortOrder: number;
  fields: Field[];
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: "var(--cat-input-bg, var(--cat-card-bg))",
  border: "1px solid var(--cat-card-border)",
  color: "var(--cat-text)",
  borderRadius: "10px",
  padding: "8px 12px",
  width: "100%",
  fontSize: "14px",
  outline: "none",
};

// ─── Quick-add field buttons (A / B / C / D / custom) ────────────────────────

const QUICK_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

interface QuickAddFieldProps {
  stadiumId: number;
  existingNames: string[];
  onAdded: (field: Field) => void;
  apiBase: string;
}

function QuickAddField({ stadiumId, existingNames, onAdded, apiBase }: QuickAddFieldProps) {
  const [customName, setCustomName] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);

  async function addField(name: string) {
    if (!name.trim() || adding) return;
    setAdding(name);
    try {
      const r = await fetch(`${apiBase}/stadiums/${stadiumId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim() }),
      });
      if (r.ok) {
        const field = await r.json();
        onAdded(field);
        setCustomName("");
        setShowCustom(false);
      }
    } finally {
      setAdding(null);
    }
  }

  const nextLetter = QUICK_LETTERS.find(l => !existingNames.includes(l));

  return (
    <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--cat-card-border)" }}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold" style={{ color: "var(--cat-text-muted)" }}>
          + Площадка:
        </span>
        {QUICK_LETTERS.filter(l => !existingNames.includes(l)).slice(0, 5).map(letter => (
          <button
            key={letter}
            type="button"
            onClick={() => addField(letter)}
            disabled={adding !== null}
            className="w-8 h-8 rounded-lg text-xs font-black transition-all hover:opacity-80 disabled:opacity-40"
            style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}30` }}
          >
            {adding === letter ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : letter}
          </button>
        ))}

        {/* Custom name */}
        {showCustom ? (
          <div className="flex items-center gap-1.5">
            <input
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addField(customName); if (e.key === "Escape") setShowCustom(false); }}
              placeholder="Своё название"
              autoFocus
              style={{ ...inputStyle, width: "130px", padding: "5px 10px", fontSize: "13px" }}
            />
            <button type="button" onClick={() => addField(customName)} disabled={!customName.trim() || adding !== null}
              className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40"
              style={{ background: ACCENT, color: "#fff" }}>
              {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : "OK"}
            </button>
            <button type="button" onClick={() => setShowCustom(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setShowCustom(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
            style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
            <Plus className="w-3 h-3" /> Своё
          </button>
        )}

        {nextLetter && (
          <span className="text-xs ml-1" style={{ color: "var(--cat-text-secondary)" }}>
            {existingNames.length > 0 && `Добавлено: ${existingNames.join(", ")}`}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Field pill (inside stadium card) ────────────────────────────────────────

interface FieldPillProps {
  field: Field;
  onDelete: (id: number) => void;
  deleting: boolean;
}

function FieldPill({ field, onDelete, deleting }: FieldPillProps) {
  const [confirm, setConfirm] = useState(false);

  if (confirm) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
        <span className="text-xs font-semibold" style={{ color: "#ef4444" }}>Удалить {field.name}?</span>
        <button type="button" onClick={() => onDelete(field.id)} disabled={deleting}
          className="text-xs font-black px-2 py-0.5 rounded-md" style={{ background: "#ef4444", color: "#fff" }}>
          {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Да"}
        </button>
        <button type="button" onClick={() => setConfirm(false)}
          className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
          Нет
        </button>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all"
      style={{ background: `${ACCENT}10`, border: `1px solid ${ACCENT}25` }}>
      <MapPin className="w-3 h-3" style={{ color: ACCENT }} />
      <span className="text-sm font-bold" style={{ color: ACCENT }}>{field.name}</span>
      <button type="button" onClick={() => setConfirm(true)}
        className="w-4 h-4 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all ml-0.5"
        style={{ color: "rgba(239,68,68,0.7)" }}>
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── Stadium card ─────────────────────────────────────────────────────────────

interface StadiumCardProps {
  stadium: Stadium;
  apiBase: string;
  onUpdated: (s: Stadium) => void;
  onDeleted: (id: number) => void;
  onFieldAdded: (stadiumId: number, field: Field) => void;
  onFieldDeleted: (stadiumId: number, fieldId: number) => void;
}

function StadiumCard({ stadium, apiBase, onUpdated, onDeleted, onFieldAdded, onFieldDeleted }: StadiumCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletingFieldId, setDeletingFieldId] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  const [draft, setDraft] = useState({
    name: stadium.name,
    address: stadium.address ?? "",
    contactName: stadium.contactName ?? "",
    contactPhone: stadium.contactPhone ?? "",
    mapsUrl: stadium.mapsUrl ?? "",
    wazeUrl: stadium.wazeUrl ?? "",
    notes: stadium.notes ?? "",
  });

  async function saveEdit() {
    if (!draft.name.trim()) return;
    setSaving(true);
    try {
      const r = await fetch(`${apiBase}/stadiums/${stadium.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(draft),
      });
      if (r.ok) {
        const updated = await r.json();
        onUpdated({ ...stadium, ...updated });
        setEditing(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteStadium() {
    setDeleting(true);
    try {
      const r = await fetch(`${apiBase}/stadiums/${stadium.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (r.ok) onDeleted(stadium.id);
    } finally {
      setDeleting(false);
    }
  }

  async function deleteField(fieldId: number) {
    setDeletingFieldId(fieldId);
    try {
      const r = await fetch(`${apiBase}/fields/${fieldId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (r.ok) onFieldDeleted(stadium.id, fieldId);
    } finally {
      setDeletingFieldId(null);
    }
  }

  const fieldNames = stadium.fields.map(f => f.name);

  return (
    <div className="rounded-2xl border overflow-hidden transition-all"
      style={{ background: "var(--cat-card-bg)", borderColor: `${ACCENT}30`, boxShadow: `0 0 20px ${ACCENT}08` }}>

      {/* Stadium header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${ACCENT}14` }}>
            <MapPin className="w-5 h-5" style={{ color: ACCENT }} />
          </div>

          <div className="flex-1 min-w-0">
            {!editing ? (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-base" style={{ color: "var(--cat-text)" }}>{stadium.name}</h3>
                  {saved && <CheckCircle className="w-4 h-4" style={{ color: "#2BFEBA" }} />}
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: `${ACCENT}12`, color: ACCENT }}>
                    {stadium.fields.length} площадок
                  </span>
                </div>

                {stadium.address && (
                  <p className="text-sm mt-0.5" style={{ color: "var(--cat-text-muted)" }}>{stadium.address}</p>
                )}

                {(stadium.contactName || stadium.contactPhone) && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Phone className="w-3 h-3" style={{ color: "var(--cat-text-secondary)" }} />
                    <span className="text-xs" style={{ color: "var(--cat-text-secondary)" }}>
                      {[stadium.contactName, stadium.contactPhone].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                )}

                {/* Map buttons */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {stadium.mapsUrl && (
                    <a href={stadium.mapsUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
                      style={{ background: "rgba(66,133,244,0.12)", color: "#4285f4", border: "1px solid rgba(66,133,244,0.2)" }}>
                      <ExternalLink className="w-3 h-3" />
                      Google Maps
                    </a>
                  )}
                  {stadium.wazeUrl && (
                    <a href={stadium.wazeUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
                      style={{ background: "rgba(0,211,136,0.1)", color: "#00d388", border: "1px solid rgba(0,211,136,0.2)" }}>
                      <Navigation className="w-3 h-3" />
                      Waze
                    </a>
                  )}
                  {stadium.notes && (
                    <span className="text-xs" style={{ color: "var(--cat-text-secondary)" }}>{stadium.notes}</span>
                  )}
                </div>
              </>
            ) : (
              /* Edit form */
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--cat-text-muted)" }}>Название *</label>
                    <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                      placeholder="Infonet Arena" style={{ ...inputStyle, fontSize: "13px", padding: "7px 11px" }} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--cat-text-muted)" }}>Адрес</label>
                    <input value={draft.address} onChange={e => setDraft(d => ({ ...d, address: e.target.value }))}
                      placeholder="Raua 6, Tallinn" style={{ ...inputStyle, fontSize: "13px", padding: "7px 11px" }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--cat-text-muted)" }}>Контакт (имя)</label>
                    <input value={draft.contactName} onChange={e => setDraft(d => ({ ...d, contactName: e.target.value }))}
                      placeholder="Иван Иванов" style={{ ...inputStyle, fontSize: "13px", padding: "7px 11px" }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--cat-text-muted)" }}>Телефон</label>
                    <input value={draft.contactPhone} onChange={e => setDraft(d => ({ ...d, contactPhone: e.target.value }))}
                      placeholder="+372 5xxx xxxx" style={{ ...inputStyle, fontSize: "13px", padding: "7px 11px" }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--cat-text-muted)" }}>Google Maps URL</label>
                    <input value={draft.mapsUrl} onChange={e => setDraft(d => ({ ...d, mapsUrl: e.target.value }))}
                      placeholder="https://maps.google.com/..." style={{ ...inputStyle, fontSize: "13px", padding: "7px 11px" }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--cat-text-muted)" }}>Waze URL</label>
                    <input value={draft.wazeUrl} onChange={e => setDraft(d => ({ ...d, wazeUrl: e.target.value }))}
                      placeholder="https://waze.com/ul?..." style={{ ...inputStyle, fontSize: "13px", padding: "7px 11px" }} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--cat-text-muted)" }}>Примечание</label>
                    <input value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
                      placeholder="Вход с улицы Рауа" style={{ ...inputStyle, fontSize: "13px", padding: "7px 11px" }} />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button type="button" onClick={saveEdit} disabled={saving || !draft.name.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-all"
                    style={{ background: ACCENT, color: "#fff" }}>
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Сохранить
                  </button>
                  <button type="button" onClick={() => { setEditing(false); setDraft({ name: stadium.name, address: stadium.address ?? "", contactName: stadium.contactName ?? "", contactPhone: stadium.contactPhone ?? "", mapsUrl: stadium.mapsUrl ?? "", wazeUrl: stadium.wazeUrl ?? "", notes: stadium.notes ?? "" }); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all hover:opacity-70"
                    style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
                    <X className="w-3.5 h-3.5" /> Отмена
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          {!editing && (
            <div className="flex items-center gap-1 shrink-0">
              <button type="button" onClick={() => setEditing(true)}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:opacity-70"
                style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              {confirmDelete ? (
                <div className="flex items-center gap-1">
                  <button type="button" onClick={deleteStadium} disabled={deleting}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold"
                    style={{ background: "#ef4444", color: "#fff" }}>
                    {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Удалить"}
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)}
                    className="px-2 py-1 rounded-lg text-xs"
                    style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
                    Нет
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:opacity-70"
                  style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444" }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button type="button" onClick={() => setExpanded(e => !e)}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:opacity-70"
                style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>

        {/* Fields section */}
        {expanded && !editing && (
          <div className="mt-4 pl-13">
            {stadium.fields.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {stadium.fields.map(field => (
                  <FieldPill
                    key={field.id}
                    field={field}
                    onDelete={deleteField}
                    deleting={deletingFieldId === field.id}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs" style={{ color: "var(--cat-text-secondary)" }}>
                Нет площадок — добавьте ниже
              </p>
            )}

            <QuickAddField
              stadiumId={stadium.id}
              existingNames={fieldNames}
              onAdded={field => onFieldAdded(stadium.id, field)}
              apiBase={apiBase}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Add stadium form ─────────────────────────────────────────────────────────

interface AddStadiumFormProps {
  apiBase: string;
  onAdded: (stadium: Stadium) => void;
}

function AddStadiumForm({ apiBase, onAdded }: AddStadiumFormProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", address: "", contactName: "", contactPhone: "",
    mapsUrl: "", wazeUrl: "", notes: "",
  });

  async function submit() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const r = await fetch(`${apiBase}/stadiums`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (r.ok) {
        const stadium = await r.json();
        onAdded({ ...stadium, fields: [] });
        setForm({ name: "", address: "", contactName: "", contactPhone: "", mapsUrl: "", wazeUrl: "", notes: "" });
        setOpen(false);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed transition-all hover:opacity-80"
        style={{ borderColor: `${ACCENT}30`, color: ACCENT }}>
        <Plus className="w-5 h-5" />
        <span className="font-bold text-sm">Добавить стадион</span>
      </button>
    );
  }

  return (
    <div className="rounded-2xl border-2 p-5 space-y-4"
      style={{ borderColor: `${ACCENT}40`, background: `${ACCENT}04` }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4" style={{ color: ACCENT }} />
          <span className="font-black text-sm" style={{ color: "var(--cat-text)" }}>Новый стадион</span>
        </div>
        <button type="button" onClick={() => setOpen(false)}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70"
          style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--cat-text-muted)" }}>Название *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && submit()}
            placeholder="Infonet Arena" style={inputStyle} autoFocus />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--cat-text-muted)" }}>Адрес</label>
          <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
            placeholder="Raua 6, Tallinn" style={inputStyle} />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--cat-text-muted)" }}>Контакт (имя)</label>
          <input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
            placeholder="Иван Иванов" style={inputStyle} />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--cat-text-muted)" }}>Телефон</label>
          <input value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))}
            placeholder="+372 5xxx xxxx" style={inputStyle} />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--cat-text-muted)" }}>
            Google Maps URL
          </label>
          <input value={form.mapsUrl} onChange={e => setForm(f => ({ ...f, mapsUrl: e.target.value }))}
            placeholder="https://maps.google.com/..." style={inputStyle} />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--cat-text-muted)" }}>
            Waze URL
          </label>
          <input value={form.wazeUrl} onChange={e => setForm(f => ({ ...f, wazeUrl: e.target.value }))}
            placeholder="https://waze.com/ul?..." style={inputStyle} />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--cat-text-muted)" }}>Примечание</label>
          <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Вход с улицы Рауа..." style={inputStyle} />
        </div>
      </div>

      <p className="text-xs" style={{ color: "var(--cat-text-secondary)" }}>
        После создания стадиона добавьте площадки (A, B, C, D...) кнопками внутри карточки.
      </p>

      <div className="flex items-center gap-2">
        <button type="button" onClick={submit} disabled={saving || !form.name.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50 transition-all"
          style={{ background: `linear-gradient(135deg, ${ACCENT}, #db2777)`, color: "#fff" }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Создать стадион
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-70"
          style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
          Отмена
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function StadiumsPageContent({ onCountChange }: { onCountChange?: (count: number) => void } = {}) {
  const ctx = useTournament();
  const orgSlug = ctx?.orgSlug ?? "";
  const tournamentId = ctx?.tournamentId ?? 0;
  const apiBase = `/api/org/${orgSlug}/tournament/${tournamentId}`;

  const [stadiums, setStadiums] = useState<Stadium[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${apiBase}/stadiums`, { credentials: "include" });
      if (r.ok) {
        const d = await r.json();
        setStadiums(d.stadiums ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => { load(); }, [load]);

  // Notify parent when field count changes
  useEffect(() => {
    if (onCountChange) {
      const total = stadiums.reduce((sum, s) => sum + s.fields.length, 0);
      onCountChange(total);
    }
  }, [stadiums, onCountChange]);

  function handleUpdated(updated: Stadium) {
    setStadiums(prev => prev.map(s => s.id === updated.id ? { ...updated, fields: s.fields } : s));
  }
  function handleDeleted(id: number) {
    setStadiums(prev => prev.filter(s => s.id !== id));
  }
  function handleFieldAdded(stadiumId: number, field: Field) {
    setStadiums(prev => prev.map(s =>
      s.id === stadiumId ? { ...s, fields: [...s.fields, field] } : s
    ));
  }
  function handleFieldDeleted(stadiumId: number, fieldId: number) {
    setStadiums(prev => prev.map(s =>
      s.id === stadiumId ? { ...s, fields: s.fields.filter(f => f.id !== fieldId) } : s
    ));
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-20 justify-center" style={{ color: "var(--cat-text-muted)" }}>
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Загрузка...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: `${ACCENT}14` }}>
          <MapPin className="w-5 h-5" style={{ color: ACCENT }} />
        </div>
        <div>
          <h1 className="text-xl font-black" style={{ color: "var(--cat-text)" }}>Стадионы и площадки</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
            Стадион → адрес и контакт · Площадки (A/B/C/D) → идут в расписание матчей
          </p>
        </div>
      </div>

      {/* Empty state */}
      {stadiums.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed py-14 flex flex-col items-center gap-3"
          style={{ borderColor: `${ACCENT}20` }}>
          <MapPin className="w-10 h-10" style={{ color: `${ACCENT}40` }} />
          <p className="font-bold text-sm" style={{ color: "var(--cat-text-muted)" }}>Стадионов пока нет</p>
          <p className="text-xs text-center max-w-xs" style={{ color: "var(--cat-text-secondary)" }}>
            Добавьте стадион — укажите адрес и контакт, затем разделите на площадки A, B, C...
          </p>
        </div>
      )}

      {/* Stadium cards */}
      {stadiums.map(stadium => (
        <StadiumCard
          key={stadium.id}
          stadium={stadium}
          apiBase={apiBase}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
          onFieldAdded={handleFieldAdded}
          onFieldDeleted={handleFieldDeleted}
        />
      ))}

      {/* Add stadium */}
      <AddStadiumForm apiBase={apiBase} onAdded={s => setStadiums(prev => [...prev, s])} />
    </div>
  );
}
