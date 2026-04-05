"use client";
import { useTournamentPublic } from "@/lib/tournament-public-context";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { MapPin, Hotel, ExternalLink, Phone, Loader2 } from "lucide-react";

interface Field {
  id: number;
  name: string;
  address?: string | null;
  mapUrl?: string | null;
  notes?: string | null;
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
  fields: Field[];
  hotels: HotelEntry[];
}

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

export default function ParticipantsPage() {
  const { org, tournament: tourney } = useTournamentPublic();
  const t = useTranslations("tournament");

  const TABS = [
    { key: "fields", label: t("tabFields") },
    { key: "hotels", label: t("tabHotels") },
  ] as const;
  type TabKey = typeof TABS[number]["key"];

  const [tab, setTab] = useState<TabKey>("fields");
  const [data, setData] = useState<FacilitiesData>({ fields: [], hotels: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/public/t/${org.slug}/${tourney.slug}/facilities`)
      .then(r => r.ok ? r.json() : { fields: [], hotels: [] })
      .then(setData)
      .finally(() => setLoading(false));
  }, [org.slug, tourney.slug]);

  const activeTabs = TABS.filter(tb =>
    tb.key === "fields" ? data.fields.length > 0 : data.hotels.length > 0
  );

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)" }}>
      {loading ? (
        <div className="py-16 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--cat-text-muted)" }} />
        </div>
      ) : data.fields.length === 0 && data.hotels.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3" style={{ color: "var(--cat-text-muted)" }}>
          <MapPin className="w-8 h-8 opacity-30" />
          <p className="text-sm font-medium">{t("noFacilitiesInfo")}</p>
        </div>
      ) : (
        <>
          {/* Tabs — show only if both sections have data */}
          {activeTabs.length > 1 && (
            <div className="flex" style={{ borderBottom: "1px solid var(--cat-divider)" }}>
              {activeTabs.map(tb => (
                <button
                  key={tb.key}
                  onClick={() => setTab(tb.key)}
                  className="flex-1 py-3 text-[13px] font-semibold transition-all border-b-2"
                  style={{
                    color: tab === tb.key ? "var(--cat-accent)" : "var(--cat-text-secondary)",
                    borderColor: tab === tb.key ? "var(--cat-accent)" : "transparent",
                    background: "transparent",
                  }}
                >
                  {tb.label}
                </button>
              ))}
            </div>
          )}

          <div className="p-5 space-y-3">
            {/* Fields */}
            {(tab === "fields" || activeTabs.length === 1 && data.fields.length > 0) && (
              data.fields.length === 0
                ? <EmptyState icon={<MapPin className="w-5 h-5" />} text={t("noFields")} />
                : data.fields.map((f, i) => (
                  <div key={f.id} className="flex items-start gap-3 p-4 rounded-xl"
                    style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-tag-border)" }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[13px] font-black"
                      style={{ background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)" }}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold" style={{ color: "var(--cat-text)" }}>{f.name}</p>
                      {f.address && (
                        <p className="flex items-center gap-1 text-[11px] mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
                          <MapPin className="w-3 h-3" />{f.address}
                        </p>
                      )}
                      {f.notes && (
                        <p className="text-[11px] mt-1 leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>{f.notes}</p>
                      )}
                    </div>
                    {f.mapUrl && (
                      <a href={f.mapUrl} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] font-medium flex items-center gap-1 shrink-0"
                        style={{ color: "var(--cat-accent)" }}>
                        <ExternalLink className="w-3 h-3" /> {t("mapLink")}
                      </a>
                    )}
                  </div>
                ))
            )}

            {/* Hotels */}
            {(tab === "hotels" || activeTabs.length === 1 && data.hotels.length > 0) && (
              data.hotels.length === 0
                ? <EmptyState icon={<Hotel className="w-5 h-5" />} text={t("noHotels")} />
                : data.hotels.map(h => (
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
