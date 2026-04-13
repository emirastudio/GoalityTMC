"use client";

import { useState } from "react";
import {
  Link2, Copy, Check, Loader2, Mail, MessageCircle, Send,
  ChevronDown, ChevronUp, X,
} from "lucide-react";

interface InvitePanelProps {
  clubId: number;
  t: {
    inviteManager: string;
    inviteTitle: string;
    inviteDesc: string;
    generateLink: string;
    generateNew: string;
    copy: string;
    copied: string;
    sendEmail: string;
    emailPlaceholder: string;
    sending: string;
    emailSent: string;
    emailError: string;
    shareWhatsapp: string;
    shareTelegram: string;
    inviteExpires: string;
  };
}

export function InvitePanel({ clubId, t }: InvitePanelProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [emailMode, setEmailMode] = useState(false);
  const [email, setEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "sent" | "error">("idle");

  async function generateLink(withEmail?: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/clubs/${clubId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withEmail ? { email: withEmail } : {}),
      });
      const data = await res.json();
      if (data.inviteLink) {
        setInviteLink(data.inviteLink);
        setExpiresAt(data.expiresAt);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleOpen() {
    setOpen(true);
    if (!inviteLink) {
      // Try to load existing invite first
      try {
        const res = await fetch(`/api/clubs/${clubId}/invite`);
        const data = await res.json();
        if (data.invite?.inviteLink) {
          setInviteLink(data.invite.inviteLink);
          setExpiresAt(data.invite.expiresAt);
          return;
        }
      } catch {
        // ignore
      }
      // Generate new one
      await generateLink();
    }
  }

  function copyLink() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function sendEmailInvite() {
    if (!email) return;
    setSendingEmail(true);
    setEmailStatus("idle");
    try {
      await generateLink(email);
      setEmailStatus("sent");
      setEmail("");
      setTimeout(() => setEmailStatus("idle"), 3000);
    } catch {
      setEmailStatus("error");
    } finally {
      setSendingEmail(false);
      setEmailMode(false);
    }
  }

  const whatsappUrl = inviteLink
    ? `https://wa.me/?text=${encodeURIComponent(`You've been invited to join our club on Goality: ${inviteLink}`)}`
    : "#";

  const telegramUrl = inviteLink
    ? `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent("You've been invited to join our club on Goality")}`
    : "#";

  const expiryLabel = expiresAt
    ? new Date(expiresAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div>
      <button
        onClick={open ? () => setOpen(false) : handleOpen}
        className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-80 flex items-center gap-1.5"
        style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-secondary)" }}
      >
        <Link2 className="w-3.5 h-3.5" />
        {t.inviteManager}
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {open && (
        <div
          className="mt-4 rounded-2xl p-5 border"
          style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)" }}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--cat-text)" }}>
                {t.inviteTitle}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
                {t.inviteDesc}
              </p>
            </div>
            <button onClick={() => setOpen(false)} className="opacity-40 hover:opacity-70">
              <X className="w-4 h-4" style={{ color: "var(--cat-text)" }} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-3" style={{ color: "var(--cat-text-muted)" }}>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Generating link…</span>
            </div>
          ) : inviteLink ? (
            <>
              {/* Link display */}
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-3 border"
                style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
              >
                <code
                  className="flex-1 text-xs truncate"
                  style={{ color: "var(--cat-text-secondary)" }}
                >
                  {inviteLink}
                </code>
                <button
                  onClick={copyLink}
                  className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-all hover:opacity-80 flex items-center gap-1"
                  style={{
                    background: copied ? "rgba(16,185,129,0.15)" : "var(--cat-accent)",
                    color: copied ? "#10b981" : "#000",
                  }}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? t.copied : t.copy}
                </button>
              </div>

              {/* Expiry */}
              {expiryLabel && (
                <p className="text-xs mb-3" style={{ color: "var(--cat-text-muted)" }}>
                  {t.inviteExpires}: {expiryLabel}
                </p>
              )}

              {/* Share buttons */}
              <div className="flex flex-wrap gap-2 mb-3">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                  style={{ background: "rgba(37,211,102,0.15)", color: "#25d366" }}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {t.shareWhatsapp}
                </a>
                <a
                  href={telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                  style={{ background: "rgba(0,136,204,0.15)", color: "#0088cc" }}
                >
                  <Send className="w-3.5 h-3.5" />
                  {t.shareTelegram}
                </a>
                <button
                  onClick={() => setEmailMode((m) => !m)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                  style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6" }}
                >
                  <Mail className="w-3.5 h-3.5" />
                  {t.sendEmail}
                </button>
              </div>

              {/* Email sub-form */}
              {emailMode && (
                <div className="flex gap-2 mt-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.emailPlaceholder}
                    className="flex-1 px-3 py-2 rounded-xl text-sm outline-none border"
                    style={{
                      background: "var(--cat-card-bg)",
                      borderColor: "var(--cat-card-border)",
                      color: "var(--cat-text)",
                    }}
                  />
                  <button
                    onClick={sendEmailInvite}
                    disabled={sendingEmail || !email}
                    className="px-3 py-2 rounded-xl text-xs font-medium transition-all hover:opacity-80 disabled:opacity-40 flex items-center gap-1"
                    style={{ background: "var(--cat-accent)", color: "#000" }}
                  >
                    {sendingEmail ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    {sendingEmail ? t.sending : t.sendEmail}
                  </button>
                </div>
              )}

              {emailStatus === "sent" && (
                <p className="text-xs mt-2 flex items-center gap-1" style={{ color: "#10b981" }}>
                  <Check className="w-3.5 h-3.5" /> {t.emailSent}
                </p>
              )}
              {emailStatus === "error" && (
                <p className="text-xs mt-2" style={{ color: "#ef4444" }}>
                  {t.emailError}
                </p>
              )}

              {/* Generate new */}
              <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--cat-card-border)" }}>
                <button
                  onClick={() => generateLink()}
                  className="text-xs hover:opacity-70 transition-all"
                  style={{ color: "var(--cat-text-muted)" }}
                >
                  {t.generateNew}
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
