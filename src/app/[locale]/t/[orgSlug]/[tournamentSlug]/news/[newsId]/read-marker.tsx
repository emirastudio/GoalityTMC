"use client";

import { useEffect, useRef } from "react";

/**
 * Fires once on mount for logged-in clubs viewing a published news
 * post. Idempotent server-side (UNIQUE conflict → no-op) so even a
 * double-mount in dev StrictMode does no harm.
 */
export function NewsReadMarker({
  clubId,
  newsId,
}: {
  clubId: number;
  newsId: number;
}) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void fetch(`/api/clubs/${clubId}/news-reads/${newsId}`, { method: "POST" }).catch(() => {});
  }, [clubId, newsId]);
  return null;
}
