import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { RefereePanelClient } from "@/components/referee/referee-panel";

type Props = {
  params: Promise<{ locale: string; token: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "refereePanel" });
  return { title: t("pageTitle") };
}

export default async function RefereeTokenPage({ params }: Props) {
  const { token } = await params;

  // Fetch from the public API — no cookies/session needed
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3001");

  const res = await fetch(`${baseUrl}/api/referee/${token}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    notFound();
  }

  const data = await res.json();

  return <RefereePanelClient data={data} token={token} />;
}
