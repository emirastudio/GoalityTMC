"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Trophy, Plus, CheckCircle2, Clock,
  CalendarDays, MapPin, ChevronRight, Zap,
} from "lucide-react";

type Listing = {
  id: number;
  slug: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  country: string | null;
  city: string | null;
  subscriptionStatus: string | null;
  subscriptionPeriodEnd: string | null;
  stripeSubscriptionId: string | null;
};

export default function ListingAdminPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const t = useTranslations("adminListing");

  const [listings, setListings] = useState<Listing[] | undefined>(undefined);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/org/${orgSlug}/listing`)
      .then((r) => r.json())
      .then((data) => setListings(data.listings ?? []))
      .catch(() => setListings([]));
  }, [orgSlug]);

  async function createListing() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`/api/org/${orgSlug}/listing`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "New Tournament" }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create listing");
      setListings((prev) => [...(prev ?? []), data.listing]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--cat-text)" }}>
            {t("pageTitle")}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--cat-text-secondary)" }}>
            {t("pageDesc")}
          </p>
        </div>
        <button
          onClick={createListing}
          disabled={creating}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 font-bold text-sm transition-all hover:opacity-90 disabled:opacity-60"
          style={{ background: "var(--cat-accent)", color: "#0A0E14" }}
        >
          <Plus className="w-4 h-4" />
          {creating ? t("creating") : t("newTournament")}
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Loading */}
      {listings === undefined && (
        <div className="text-sm" style={{ color: "var(--cat-text-secondary)" }}>{t("loading")}</div>
      )}

      {/* Empty state */}
      {listings !== undefined && listings.length === 0 && (
        <div
          className="rounded-2xl border p-12 flex flex-col items-center gap-4 text-center"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(43,254,186,0.1)" }}>
            <Trophy className="w-8 h-8" style={{ color: "var(--cat-accent)" }} />
          </div>
          <div>
            <h2 className="text-lg font-bold mb-1" style={{ color: "var(--cat-text)" }}>{t("empty")}</h2>
            <p className="text-sm" style={{ color: "var(--cat-text-secondary)" }}>
              {t("emptyDesc")}
            </p>
          </div>
          <button
            onClick={createListing}
            disabled={creating}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 font-bold text-sm transition-all hover:opacity-90 disabled:opacity-60"
            style={{ background: "var(--cat-accent)", color: "#0A0E14" }}
          >
            <Plus className="w-4 h-4" />
            {creating ? t("creating") : t("createFirst")}
          </button>
        </div>
      )}

      {/* Listings list */}
      {listings && listings.length > 0 && (
        <div className="space-y-3">
          {listings.map((listing) => {
            const isSubscribed = listing.subscriptionStatus === "active" || listing.subscriptionStatus === "trialing";
            const hasEndDate = !!listing.endDate;
            return (
              <Link
                key={listing.id}
                href={`/org/${orgSlug}/admin/listing/${listing.id}`}
                className="flex items-center gap-4 rounded-2xl border p-5 transition-all hover:opacity-80 group"
                style={{ background: "var(--cat-card-bg)", borderColor: isSubscribed ? "rgba(43,254,186,0.3)" : "var(--cat-card-border)" }}
              >
                {/* Status icon */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: isSubscribed ? "rgba(43,254,186,0.12)" : "rgba(250,204,21,0.1)" }}
                >
                  {isSubscribed
                    ? <CheckCircle2 className="w-5 h-5" style={{ color: "var(--cat-accent)" }} />
                    : <Clock className="w-5 h-5" style={{ color: "#FACC15" }} />
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold truncate" style={{ color: "var(--cat-text)" }}>{listing.name}</p>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={isSubscribed
                        ? { background: "rgba(43,254,186,0.12)", color: "var(--cat-accent)" }
                        : { background: "var(--cat-tag-bg)", color: "var(--cat-text-secondary)" }
                      }
                    >
                      {isSubscribed ? t("statusActive") : t("statusDraft")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs" style={{ color: "var(--cat-text-secondary)" }}>
                    {listing.startDate && (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {listing.startDate}{listing.endDate ? ` – ${listing.endDate}` : ""}
                      </span>
                    )}
                    {(listing.city || listing.country) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {[listing.city, listing.country].filter(Boolean).join(", ")}
                      </span>
                    )}
                    {!listing.startDate && !listing.city && (
                      <span>{t("noDetails")}</span>
                    )}
                  </div>
                  {!isSubscribed && (
                    <p className="text-xs mt-1" style={{ color: "#FACC15" }}>
                      {hasEndDate ? t("readyToActivate") : t("setEndDate")}
                    </p>
                  )}
                </div>

                <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
              </Link>
            );
          })}
        </div>
      )}

      {/* Upgrade banner */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "var(--cat-card-bg)", border: "1.5px solid rgba(43,254,186,0.2)" }}
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(43,254,186,0.1)" }}>
            <Zap className="w-4 h-4" style={{ color: "var(--cat-accent)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm mb-0.5" style={{ color: "var(--cat-text)" }}>
              {t("upgradeTitle")}
            </p>
            <p className="text-xs mb-2" style={{ color: "var(--cat-text-secondary)" }}>
              {t("upgradeDesc")}
            </p>
            <Link
              href={`/org/${orgSlug}/admin/billing`}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, var(--cat-accent), #00e5a0)", color: "#0A0E14" }}
            >
              <Zap className="w-3.5 h-3.5" />
              {t("upgradeCta")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
