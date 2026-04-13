"use client";
import { useTournamentPublic } from "@/lib/tournament-public-context";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { MapPin, Hotel, ExternalLink, Phone, Loader2, Navigation } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Field {
  id: number;
  name: string;
  stadiumId: number | null;
  address?: string | null;
  mapUrl?: string | null;
  notes?: string | null;
}

interface Stadium {
  id: number;
  name: string;
  address?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  mapsUrl?: string | null;
  wazeUrl?: string | null;
  notes?: string | null;
  fields: Field[];
}

interface HotelEntry {
  id: number;
  name: string;
  address?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  notes?: string | null;
}

interface FacilitiesData {
  stadiums: Stadium[];
  standaloneFields: Field[];
  hotels: HotelEntry[];
}

// ─── Stadium card ─────────────────────────────────────────────────────────────

function StadiumCard({ stadium }: { stadium: Stadium }) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-tag-border)" }}>

      {/* Stadium header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--cat-badge-open-bg)" }}>
            <MapPin className="w-5 h-5" style={{ color: "var(--cat-accent)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-[15px]" style={{ color: "var(--cat-text)" }}>{stadium.name}</p>

            {stadium.address && (
              <p className="text-[12px] mt-0.5 flex items-center gap-1" style={{ color: "var(--cat-text-muted)" }}>
                <MapPin className="w-3 h-3 shrink-0" />
                {stadium.address}
              </p>
            )}

            {(stadium.contactName || stadium.contactPhone) && (
              <div className="flex items-center gap-1.5 mt-1">
                <Phone className="w-3 h-3" style={{ color: "var(--cat-text-secondary)" }} />
                <span className="text-[12px]" style={{ color: "var(--cat-text-secondary)" }}>
                  {[stadium.contactName, stadium.contactPhone].filter(Boolean).join(" · ")}
                </span>
              </div>
            )}

            {stadium.notes && (
              <p className="text-[12px] mt-1" style={{ color: "var(--cat-text-secondary)" }}>{stadium.notes}</p>
            )}

            {/* Map buttons */}
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              {stadium.mapsUrl && (
                <a href={stadium.mapsUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all hover:opacity-80"
                  style={{ background: "rgba(66,133,244,0.15)", color: "#4285f4", border: "1px solid rgba(66,133,244,0.25)" }}>
                  <ExternalLink className="w-3 h-3" />
                  Google Maps
                </a>
              )}
              {stadium.wazeUrl && (
                <a href={stadium.wazeUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all hover:opacity-80"
                  style={{ background: "rgba(0,211,136,0.12)", color: "#00d388", border: "1px solid rgba(0,211,136,0.2)" }}>
                  <Navigation className="w-3 h-3" />
                  Waze
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Fields (площадки) */}
        {stadium.fields.length > 0 && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--cat-divider)" }}>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-2"
              style={{ color: "var(--cat-text-secondary)" }}>
              Площадки
            </p>
            <div className="flex flex-wrap gap-2">
              {stadium.fields.map(field => (
                <div key={field.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                  style={{ background: "var(--cat-badge-open-bg)", border: "1px solid var(--cat-accent-subtle, rgba(43,254,186,0.2))" }}>
                  <MapPin className="w-3 h-3" style={{ color: "var(--cat-accent)" }} />
                  <span className="text-[13px] font-bold" style={{ color: "var(--cat-accent)" }}>
                    {field.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Standalone field card ────────────────────────────────────────────────────

function StandaloneFieldCard({ field, index }: { field: Field; index: number }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl"
      style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-tag-border)" }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[13px] font-black"
        style={{ background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)" }}>
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold" style={{ color: "var(--cat-text)" }}>{field.name}</p>
        {field.address && (
          <p className="flex items-center gap-1 text-[11px] mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
            <MapPin className="w-3 h-3" />{field.address}
          </p>
        )}
        {field.notes && (
          <p className="text-[11px] mt-1 leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>{field.notes}</p>
        )}
      </div>
      {field.mapUrl && (
        <a href={field.mapUrl} target="_blank" rel="noopener noreferrer"
          className="text-[11px] font-medium flex items-center gap-1 shrink-0"
          style={{ color: "var(--cat-accent)" }}>
          <ExternalLink className="w-3 h-3" /> Карта
        </a>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="py-12 flex flex-col items-center gap-3" style={{ color: "var(--cat-text-muted)" }}>
      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "var(--cat-tag-bg)" }}>
        {icon}
      </div>
      <p className="text-sm">{text}</p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ParticipantsPage() {
  const { org, tournament: tourney } = useTournamentPublic();
  const t = useTranslations("tournament");

  const [data, setData] = useState<FacilitiesData>({ stadiums: [], standaloneFields: [], hotels: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"fields" | "hotels">("fields");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/public/t/${org.slug}/${tourney.slug}/facilities`)
      .then(r => r.ok ? r.json() : { stadiums: [], standaloneFields: [], hotels: [] })
      .then(d => {
        // Support both old (fields[]) and new (stadiums[]) API shape
        if (d.stadiums) {
          setData(d);
        } else {
          setData({ stadiums: [], standaloneFields: d.fields ?? [], hotels: d.hotels ?? [] });
        }
      })
      .finally(() => setLoading(false));
  }, [org.slug, tourney.slug]);

  const hasFields = data.stadiums.length > 0 || data.standaloneFields.length > 0;
  const hasHotels = data.hotels.length > 0;
  const showTabs = hasFields && hasHotels;

  const TABS = [
    { key: "fields" as const, label: t("tabFields") },
    { key: "hotels" as const, label: t("tabHotels") },
  ];

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)" }}>
      {loading ? (
        <div className="py-16 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--cat-text-muted)" }} />
        </div>
      ) : !hasFields && !hasHotels ? (
        <div className="py-16 flex flex-col items-center gap-3" style={{ color: "var(--cat-text-muted)" }}>
          <MapPin className="w-8 h-8 opacity-30" />
          <p className="text-sm font-medium">{t("noFacilitiesInfo")}</p>
        </div>
      ) : (
        <>
          {showTabs && (
            <div className="flex" style={{ borderBottom: "1px solid var(--cat-divider)" }}>
              {TABS.filter(tb => tb.key === "fields" ? hasFields : hasHotels).map(tb => (
                <button key={tb.key} onClick={() => setTab(tb.key)}
                  className="flex-1 py-3 text-[13px] font-semibold transition-all border-b-2"
                  style={{
                    color: tab === tb.key ? "var(--cat-accent)" : "var(--cat-text-secondary)",
                    borderColor: tab === tb.key ? "var(--cat-accent)" : "transparent",
                    background: "transparent",
                  }}>
                  {tb.label}
                </button>
              ))}
            </div>
          )}

          <div className="p-4 space-y-3">

            {/* Stadiums + fields */}
            {(tab === "fields" || !showTabs) && hasFields && (
              <>
                {data.stadiums.map(stadium => (
                  <StadiumCard key={stadium.id} stadium={stadium} />
                ))}
                {data.standaloneFields.map((f, i) => (
                  <StandaloneFieldCard key={f.id} field={f} index={i} />
                ))}
              </>
            )}

            {/* Hotels */}
            {(tab === "hotels" || !showTabs) && hasHotels && (
              data.hotels.map(h => (
                <div key={h.id} className="flex items-start gap-3 p-4 rounded-xl"
                  style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-tag-border)" }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "var(--cat-badge-open-bg)" }}>
                    <Hotel className="w-4 h-4" style={{ color: "var(--cat-accent)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold" style={{ color: "var(--cat-text)" }}>{h.name}</p>
                    {h.address && (
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--cat-text-muted)" }}>{h.address}</p>
                    )}
                    {h.notes && (
                      <p className="text-[11px] mt-1 leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>{h.notes}</p>
                    )}
                  </div>
                  {h.contactPhone && (
                    <a href={`tel:${h.contactPhone}`}
                      className="p-2 rounded-lg transition-colors hover:opacity-80 shrink-0"
                      style={{ color: "var(--cat-text-secondary)" }}>
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ))
            )}

          </div>
        </>
      )}
    </div>
  );
}
