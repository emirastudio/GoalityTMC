"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export function SiteFooter() {
  const params = useParams();
  const locale = (params?.locale as string) ?? "en";

  return (
    <footer className="mt-auto border-t border-border bg-white">
      <div className="max-w-5xl mx-auto px-4 py-5">
        {/* Top row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-text-secondary">
          <div className="space-y-0.5">
            <p>
              Tournament organised by{" "}
              <span className="font-semibold text-text-primary">Football Planet</span>.
              Tournament management system provided by{" "}
              <span className="font-semibold text-text-primary">Goality Sport Group</span> — Goality TMC.
            </p>
          </div>
          <Link
            href={`/${locale}/privacy`}
            className="shrink-0 text-navy hover:underline font-medium"
          >
            Privacy Policy
          </Link>
        </div>

        {/* Bottom row */}
        <div className="mt-3 pt-3 border-t border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs text-text-secondary/60">
          <p>
            © {new Date().getFullYear()}{" "}
            <span className="font-medium">Goality Sport Group</span>. All rights reserved.
          </p>
          <p>
            Powered by{" "}
            <span className="font-medium text-text-secondary">
              Goality Tournament Management Core (Goality TMC)
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
