"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";

type Props = {
  clubId: number;
  tournamentId: number;
  initialFollowing: boolean;
};

/**
 * Star/heart toggle on the tournament sidebar. Renders only when the
 * viewer is a logged-in club (see TournamentSidebar — `clubId` must
 * be defined for this component to be mounted).
 *
 * Optimistic state flip; rolls back on API error.
 *
 * Mounts under the existing register CTA so the visual hierarchy is
 * preserved: a club either *registers* (primary action) or *follows*
 * (secondary action). No interference with the legacy CTA gradient.
 */
export function FollowButton({ clubId, tournamentId, initialFollowing }: Props) {
  const t = useTranslations("tournament.follow");
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();
  const [errored, setErrored] = useState(false);

  const toggle = () => {
    if (pending) return;
    const next = !isFollowing;
    // Optimistic flip.
    setIsFollowing(next);
    setErrored(false);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/clubs/${clubId}/follows/${tournamentId}`, {
          method: next ? "POST" : "DELETE",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        // Server is authoritative.
        if (typeof data?.isFollowing === "boolean") {
          setIsFollowing(data.isFollowing);
        }
      } catch {
        // Roll back optimistic state.
        setIsFollowing(!next);
        setErrored(true);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={isFollowing}
      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[12px] font-bold border transition-all"
      style={{
        background: isFollowing ? "rgba(43,254,186,0.12)" : "var(--cat-tag-bg)",
        borderColor: isFollowing ? "rgba(43,254,186,0.45)" : "var(--cat-card-border)",
        color: isFollowing ? "var(--cat-accent)" : "var(--cat-text-secondary)",
        opacity: pending ? 0.6 : 1,
      }}
      title={errored ? "Try again" : undefined}
    >
      <Star
        className="w-3.5 h-3.5"
        fill={isFollowing ? "currentColor" : "none"}
        strokeWidth={2}
      />
      <span>{isFollowing ? t("followingButton") : t("followButton")}</span>
    </button>
  );
}
