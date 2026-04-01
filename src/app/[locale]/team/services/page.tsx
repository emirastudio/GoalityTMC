"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useTeam } from "@/lib/team-context";
import {
  Package,
  Loader2,
  BedDouble,
  Utensils,
  Bus,
  Car,
  Plane,
  Shirt,
  Trophy,
  Camera,
  Music,
  Dumbbell,
  Heart,
  Star,
  ShoppingBag,
  Wifi,
  Coffee,
  MapPin,
  FileText,
  Users,
  AlertCircle,
} from "lucide-react";

/* ─── icon resolver ─────────────────────────────────────── */
const ICONS: Record<string, React.ElementType> = {
  BedDouble, Utensils, Bus, Car, Plane, Shirt, Trophy,
  Camera, Music, Dumbbell, Heart, Star, ShoppingBag,
  Wifi, Coffee, MapPin, Package,
};
function resolveIcon(name: string | null | undefined): React.ElementType {
  if (!name) return FileText;
  return ICONS[name] ?? FileText;
}

/* ─── types ─────────────────────────────────────────────── */
interface PackageItem {
  id: number;
  serviceName: string | null;
  serviceIcon: string | null;
  details: string | null;
  note: string | null;
  imageUrl: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  pricingMode: string;
  basePrice: string;
  effectivePrice: string;
  effectiveQty: number | null;
  days: number | null;
  isDisabled: boolean;
  isOverridden: boolean;
  overrideReason: string | null;
  calculatedTotal: string;
}

interface Summary {
  available: boolean;
  package?: { id: number; name: string; description: string | null };
  items?: PackageItem[];
  peopleCounts?: { players: number; staff: number; accompanying: number };
  grandTotal?: string;
}

/* ─── pricing label helper ──────────────────────────────── */
function PricingLabel({
  item,
  counts,
  t,
}: {
  item: PackageItem;
  counts: { players: number; staff: number; accompanying: number };
  t: ReturnType<typeof useTranslations<"packageSummary">>;
}) {
  const total = counts.players + counts.staff + counts.accompanying;
  const price = `€${Number(item.effectivePrice).toFixed(2)}`;

  switch (item.pricingMode) {
    case "per_person":
      return <span>{price} × {total} {t("people")}</span>;
    case "per_player":
      return <span>{price} × {counts.players} {t("players")}</span>;
    case "per_staff":
      return <span>{price} × {counts.staff} {t("staff")}</span>;
    case "per_accompanying":
      return <span>{price} × {counts.accompanying} {t("accompanying")}</span>;
    case "per_team":
      return <span>{price} — {t("perTeam")}</span>;
    case "per_person_per_day":
      return <span>{price} × {total} {t("people")} × {item.days ?? 1} days</span>;
    case "per_unit":
      return <span>{price} × {item.effectiveQty ?? 1} units</span>;
    case "flat":
      return <span>{t("flat")}</span>;
    default:
      return <span>{price}</span>;
  }
}

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/* ─── page ──────────────────────────────────────────────── */
export default function ServicesPage() {
  const t = useTranslations("packageSummary");
  const { teamId } = useTeam();
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) return;
    fetch(`/api/teams/${teamId}/package-summary`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ available: false }))
      .finally(() => setLoading(false));
  }, [teamId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] gap-3 text-text-secondary">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">{t("loading")}</span>
      </div>
    );
  }

  if (!data?.available || !data.items || !data.peopleCounts) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <div className="rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
          <AlertCircle className="w-10 h-10 text-text-secondary/40 mx-auto mb-4" />
          <h2 className="text-base font-semibold text-text-primary mb-2">{t("notAvailable")}</h2>
          <p className="text-sm text-text-secondary">{t("notAvailableDesc")}</p>
        </div>
      </div>
    );
  }

  const { package: pkg, items, peopleCounts, grandTotal } = data;
  const total = peopleCounts.players + peopleCounts.staff + peopleCounts.accompanying;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary flex items-center gap-2.5">
          <Package className="w-5 h-5 text-navy" />
          {t("title")}
        </h1>
        <p className="text-sm text-text-secondary mt-1">{t("description")}</p>
      </div>

      {/* Package name */}
      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-1">Package</p>
            <h2 className="text-lg font-bold text-navy">{pkg?.name}</h2>
            {pkg?.description && (
              <p className="text-sm text-text-secondary mt-1">{pkg.description}</p>
            )}
          </div>
        </div>

        {/* Team size summary */}
        <div className="mt-4 pt-4 border-t border-border flex items-center gap-6">
          <div className="flex items-center gap-1.5 text-sm text-text-secondary">
            <Users className="w-4 h-4" />
            <span>{t("teamSize")}:</span>
          </div>
          <span className="text-sm font-medium text-navy">
            {peopleCounts.players} {t("players")}
            {peopleCounts.staff > 0 && ` + ${peopleCounts.staff} ${t("staff")}`}
            {peopleCounts.accompanying > 0 && ` + ${peopleCounts.accompanying} ${t("accompanying")}`}
            {" "}= {total} {t("people")}
          </span>
        </div>
      </div>

      {/* Items list */}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-8 text-center text-sm text-text-secondary">
          No services in this package yet.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const Icon = resolveIcon(item.serviceIcon);
            return (
              <div
                key={item.id}
                className={`rounded-2xl border bg-white shadow-sm overflow-hidden ${
                  item.isDisabled ? "border-border opacity-50" : "border-border"
                }`}
              >
                <div className="flex items-start gap-4 p-4">
                  {/* Image or icon */}
                  {item.imageUrl ? (
                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-navy/8 flex items-center justify-center shrink-0">
                      <Icon className="w-6 h-6 text-navy" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-navy">
                          {item.serviceName ?? "—"}
                        </h3>
                        {item.details && (
                          <p className="text-xs text-text-secondary mt-0.5">{item.details}</p>
                        )}
                      </div>

                      {/* Price */}
                      <div className="text-right shrink-0">
                        {item.isDisabled ? (
                          <span className="text-xs text-text-secondary italic">{t("disabled")}</span>
                        ) : (
                          <>
                            {item.isOverridden && item.basePrice !== item.effectivePrice && (
                              <p className="text-xs text-text-secondary line-through">
                                €{Number(item.basePrice).toFixed(2)}
                              </p>
                            )}
                            <p className="text-base font-bold text-navy">
                              €{Number(item.calculatedTotal).toFixed(2)}
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Pricing breakdown */}
                    {!item.isDisabled && (
                      <p className="text-xs text-text-secondary mt-1.5">
                        <PricingLabel item={item} counts={peopleCounts} t={t} />
                        {item.isOverridden && (
                          <span className="ml-2 text-amber-600 font-medium">
                            ({t("customPrice")}
                            {item.overrideReason ? `: ${item.overrideReason}` : ""})
                          </span>
                        )}
                      </p>
                    )}

                    {/* Date range */}
                    {(item.dateFrom || item.dateTo) && (
                      <p className="text-xs text-text-secondary mt-1">
                        {t("from")} {fmtDate(item.dateFrom)} {t("to")} {fmtDate(item.dateTo)}
                      </p>
                    )}

                    {/* Note */}
                    {item.note && (
                      <p className="text-xs text-text-secondary/70 mt-1.5 italic border-l-2 border-border pl-2">
                        {item.note}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Grand total */}
      <div className="rounded-2xl border border-navy/20 bg-navy text-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium opacity-80">{t("grandTotal")}</span>
          <span className="text-2xl font-bold">€{Number(grandTotal).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
