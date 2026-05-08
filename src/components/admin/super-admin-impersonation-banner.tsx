import { Link } from "@/i18n/navigation";
import { Shield, ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

/**
 * Sticky top banner shown when a super-admin views an org-admin or
 * club-area page. Makes it obvious you're "impersonating" / inspecting
 * someone else's environment, with a one-click way back to the platform
 * super-admin area.
 *
 * Server component — reads i18n at render time, no client interactivity.
 */
export async function SuperAdminImpersonationBanner({
  orgName,
  backHref = "/admin/organizations",
}: {
  orgName?: string | null;
  backHref?: string;
}) {
  const t = await getTranslations("superAdmin");

  return (
    <div
      className="sticky top-0 z-40 w-full flex items-center justify-between gap-3 px-4 py-2 text-xs sm:text-sm font-medium border-b"
      style={{
        background: "linear-gradient(90deg, #fef3c7 0%, #fde68a 100%)",
        color: "#78350f",
        borderColor: "#fbbf24",
      }}
      role="alert"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Shield className="w-4 h-4 shrink-0" />
        <span className="truncate">
          {orgName
            ? t("impersonationBannerWithOrg", { org: orgName })
            : t("impersonationBanner")}
        </span>
      </div>
      <Link
        href={backHref}
        className="flex items-center gap-1 shrink-0 px-2.5 py-1 rounded-md hover:bg-amber-200 transition-colors"
        style={{ color: "#78350f" }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{t("impersonationBackToSuper")}</span>
      </Link>
    </div>
  );
}
