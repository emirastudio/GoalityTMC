import { ReactNode } from "react";

/**
 * Public (marketing) layout.
 *
 * Wraps every page under src/app/[locale]/(public)/* in a `.public-root`
 * container. CSS in globals.css bumps the typical Tailwind text sizes
 * (text-[11px] ... text-[15px], text-xs/sm/base) so marketing reads
 * comfortably on desktop without touching the admin / club interface.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return <div className="public-root">{children}</div>;
}
