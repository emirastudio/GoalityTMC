/**
 * Legacy /features page — permanently moved to /about/overview as
 * part of the About TMC reference hub consolidation. We keep this
 * route as a 308 (Permanent Redirect, preserves method) so existing
 * backlinks and shared social previews still land users on the right
 * place, and search engines transfer authority cleanly.
 */

import { permanentRedirect } from "next/navigation";

export default async function FeaturesLegacyRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  permanentRedirect(`/${locale}/about/overview`);
}
