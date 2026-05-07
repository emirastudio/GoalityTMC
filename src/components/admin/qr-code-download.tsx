"use client";

import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useTranslations } from "next-intl";
import { Download } from "lucide-react";

export function QrCodeDownload({ url, tournamentName }: { url: string; tournamentName: string }) {
  const t = useTranslations("orgAdmin");
  const containerRef = useRef<HTMLDivElement>(null);

  function handleDownload() {
    const canvas = containerRef.current?.querySelector("canvas");
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${tournamentName}-qr.png`;
    a.click();
  }

  return (
    <div className="flex items-center gap-4 p-3 rounded-xl" style={{ background: "var(--cat-tag-bg)" }}>
      <div ref={containerRef} className="shrink-0 rounded-lg overflow-hidden" style={{ background: "#fff", padding: 4 }}>
        <QRCodeCanvas value={url} size={96} level="M" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold th-text">{t("qrCode")}</p>
        <p className="text-[10px] th-text-2 truncate">{url}</p>
      </div>
      <button
        onClick={handleDownload}
        className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold border transition-all hover:opacity-80"
        style={{ background: "var(--cat-badge-open-bg)", borderColor: "var(--cat-badge-open-border)", color: "var(--cat-accent)" }}
      >
        <Download className="w-3.5 h-3.5" />
        {t("qrDownload")}
      </button>
    </div>
  );
}
