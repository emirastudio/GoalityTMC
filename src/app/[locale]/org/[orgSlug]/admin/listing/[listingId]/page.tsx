"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Edit3, Image, ExternalLink, CheckCircle2, Clock, CreditCard, AlertCircle, Sparkles, CalendarDays, MapPin, Trash2,
} from "lucide-react";

type Listing = {
  id: number;
  slug: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  country: string | null;
  city: string | null;
  logoUrl: string | null;
  photos: string;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  subscriptionPeriodEnd: string | null;
};

export default function ListingDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orgSlug = params.orgSlug as string;
  const listingId = params.listingId as string;
  const t = useTranslations("adminListing");

  const [listing, setListing] = useState<Listing | null | undefined>(undefined);
  const [subscribing, setSubscribing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionResult = searchParams.get("subscription");

  useEffect(() => {
    fetch(`/api/org/${orgSlug}/listing/${listingId}`)
      .then((r) => r.json())
      .then((data) => setListing(data.listing ?? null))
      .catch(() => setListing(null));
  }, [orgSlug, listingId]);

  async function subscribe() {
    setSubscribing(true);
    setError(null);
    try {
      const res = await fetch(`/api/org/${orgSlug}/listing/${listingId}/subscribe`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start subscription");
      if (data.url) window.location.href = data.url;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSubscribing(false);
    }
  }

  async function deleteListing() {
    if (!confirm(t("deleteConfirm"))) return;
    setDeleting(true);
    try {
      await fetch(`/api/org/${orgSlug}/listing/${listingId}`, { method: "DELETE" });
      window.location.href = `/${window.location.pathname.split("/")[1]}/org/${orgSlug}/admin/listing`;
    } catch {
      setDeleting(false);
    }
  }

  const isSubscribed = listing?.subscriptionStatus === "active" || listing?.subscriptionStatus === "trialing";

  if (listing === undefined) return <div className="text-sm" style={{ color: "var(--cat-text-secondary)" }}>{t("loading")}</div>;
  if (!listing) return <div className="text-sm text-red-400">Listing not found</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back link */}
      <Link href={`/org/${orgSlug}/admin/listing`} className="text-sm hover:underline" style={{ color: "var(--cat-text-secondary)" }}>
        {t("backToListings")}
      </Link>

      {/* Notifications */}
      {subscriptionResult === "success" && (
        <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "rgba(43,254,186,0.1)", border: "1px solid rgba(43,254,186,0.3)" }}>
          <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "var(--cat-accent)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--cat-accent)" }}>{t("subscriptionSuccess")}</p>
        </div>
      )}
      {subscriptionResult === "cancelled" && (
        <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <p className="text-sm font-medium text-red-400">{t("paymentCancelled")}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--cat-text)" }}>{listing.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
              style={isSubscribed
                ? { background: "rgba(43,254,186,0.12)", color: "var(--cat-accent)", border: "1px solid rgba(43,254,186,0.3)" }
                : { background: "var(--cat-tag-bg)", color: "var(--cat-text-secondary)", border: "1px solid var(--cat-card-border)" }
              }>
              {isSubscribed ? <><CheckCircle2 className="w-3 h-3" /> {t("statusActive")}</> : <><Clock className="w-3 h-3" /> {t("statusDraft")}</>}
            </span>
            {listing.startDate && (
              <span className="text-sm" style={{ color: "var(--cat-text-secondary)" }}>
                {listing.startDate}{listing.endDate ? ` – ${listing.endDate}` : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      {(listing.startDate || listing.city || listing.country) && (
        <div className="grid grid-cols-2 gap-4">
          {listing.startDate && (
            <div className="rounded-2xl border p-4" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--cat-text-secondary)" }}>{t("sectionDates")}</p>
              <div className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 shrink-0" style={{ color: "var(--cat-accent)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--cat-text)" }}>
                  {listing.startDate}{listing.endDate ? ` – ${listing.endDate}` : ""}
                </span>
              </div>
            </div>
          )}
          {(listing.city || listing.country) && (
            <div className="rounded-2xl border p-4" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--cat-text-secondary)" }}>{t("sectionLocation")}</p>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 shrink-0" style={{ color: "var(--cat-accent)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--cat-text)" }}>
                  {[listing.city, listing.country].filter(Boolean).join(", ")}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action cards */}
      <div className="grid grid-cols-2 gap-4">
        <Link href={`/org/${orgSlug}/admin/listing/${listingId}/edit`}
          className="rounded-2xl border p-5 flex items-start gap-3 transition-all hover:opacity-80 group"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(43,254,186,0.1)" }}>
            <Edit3 className="w-4 h-4" style={{ color: "var(--cat-accent)" }} />
          </div>
          <div>
            <p className="font-bold text-sm mb-0.5" style={{ color: "var(--cat-text)" }}>{t("sectionEdit")}</p>
            <p className="text-xs" style={{ color: "var(--cat-text-secondary)" }}>{t("sectionEditDesc")}</p>
          </div>
        </Link>

        <Link href={`/org/${orgSlug}/admin/listing/${listingId}/photos`}
          className="rounded-2xl border p-5 flex items-start gap-3 transition-all hover:opacity-80 group"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(59,130,246,0.1)" }}>
            <Image className="w-4 h-4" style={{ color: "#3B82F6" }} />
          </div>
          <div>
            <p className="font-bold text-sm mb-0.5" style={{ color: "var(--cat-text)" }}>{t("sectionPhotos")}</p>
            <p className="text-xs" style={{ color: "var(--cat-text-secondary)" }}>
              {(() => { try { const count = JSON.parse(listing.photos ?? "[]").length; return t("sectionPhotosCount", { count }); } catch { return t("sectionPhotosDesc"); } })()}
            </p>
          </div>
        </Link>
      </div>

      {/* Subscription card */}
      <div className="rounded-2xl border p-5"
        style={{ background: "var(--cat-card-bg)", borderColor: isSubscribed ? "rgba(43,254,186,0.35)" : "var(--cat-card-border)" }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: isSubscribed ? "rgba(43,254,186,0.12)" : "rgba(250,204,21,0.12)" }}>
              {isSubscribed
                ? <CheckCircle2 className="w-5 h-5" style={{ color: "var(--cat-accent)" }} />
                : <CreditCard className="w-5 h-5" style={{ color: "#FACC15" }} />
              }
            </div>
            <div>
              <p className="font-bold mb-0.5" style={{ color: "var(--cat-text)" }}>
                {isSubscribed ? t("subscriptionActive") : t("activateTitle")}
              </p>
              {isSubscribed ? (
                <p className="text-sm" style={{ color: "var(--cat-text-secondary)" }}>
                  {t("activatePrice")}
                  {listing.subscriptionPeriodEnd && <> · {t("activateNextRenewal")} {new Date(listing.subscriptionPeriodEnd).toLocaleDateString()}</>}
                </p>
              ) : (
                <p className="text-sm" style={{ color: "var(--cat-text-secondary)" }}>
                  {listing.endDate ? t("activateActiveUntil") : t("activateNeedEndDate")}
                </p>
              )}
              {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
            </div>
          </div>
          {!isSubscribed && (
            <button onClick={subscribe} disabled={subscribing || !listing.endDate}
              className="shrink-0 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: listing.endDate ? "#FACC15" : "var(--cat-tag-bg)", color: listing.endDate ? "#0A0E14" : "var(--cat-text-secondary)" }}>
              <Sparkles className="w-4 h-4" />
              {subscribing ? t("subscribing") : t("subscribeCta")}
            </button>
          )}
        </div>
      </div>

      {/* Public page link */}
      <div className="rounded-2xl border p-4 flex items-center gap-3" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
        <ExternalLink className="w-4 h-4 shrink-0" style={{ color: "var(--cat-accent)" }} />
        <p className="text-sm flex-1" style={{ color: "var(--cat-text-secondary)" }}>{t("publicPage")}</p>
        <a href={`/t/${orgSlug}/listing/${listing.slug}`} target="_blank" rel="noopener noreferrer"
          className="text-sm font-bold hover:underline" style={{ color: "var(--cat-accent)" }}>
          /t/{orgSlug}/listing/{listing.slug} →
        </a>
      </div>

      {/* Delete listing */}
      <div className="flex justify-end">
        <button onClick={deleteListing} disabled={deleting}
          className="flex items-center gap-2 text-sm rounded-xl px-4 py-2 transition-all hover:opacity-80"
          style={{ color: "var(--cat-text-muted)", background: "transparent", border: "1px solid var(--cat-card-border)" }}>
          <Trash2 className="w-4 h-4" />
          {deleting ? t("deleting") : t("deleteListing")}
        </button>
      </div>
    </div>
  );
}
