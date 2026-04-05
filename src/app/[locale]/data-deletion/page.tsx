import { Link } from "@/i18n/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";

export const metadata = { title: "Data Deletion — Goality TMC" };

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--cat-bg)", color: "var(--cat-text)" }}>
      <div className="max-w-3xl mx-auto px-6 py-10">

        <Link href="/" className="inline-flex items-center gap-1.5 text-sm mb-8 hover:opacity-80 transition-opacity"
          style={{ color: "var(--cat-text-muted)" }}>
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(239,68,68,0.12)" }}>
            <Trash2 className="w-6 h-6" style={{ color: "#EF4444" }} />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: "var(--cat-text)" }}>Data Deletion</h1>
        </div>
        <p className="text-sm mb-8" style={{ color: "var(--cat-text-muted)" }}>
          Goality Sport Group OÜ (17232252) · Tallinn, Estonia
        </p>

        <div className="space-y-8 text-sm leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>

          <section>
            <p>You have the right to request deletion of your personal data that Goality Sport Group OÜ holds about you. This page explains how to submit a deletion request.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cat-text)" }}>What data will be deleted</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your account information (name, email, profile picture)</li>
              <li>Your club and team registrations</li>
              <li>Any preferences and settings associated with your account</li>
            </ul>
            <p className="mt-3 text-xs" style={{ color: "var(--cat-text-muted)" }}>
              Note: some financial records may be retained for up to 7 years as required by Estonian accounting law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cat-text)" }}>How to request deletion</h2>
            <div className="rounded-2xl border p-5 space-y-4"
              style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
                  style={{ background: "var(--cat-accent)", color: "#0A0E14" }}>1</span>
                <p>If you signed in via Google or Facebook, revoke the Goality app access in your social account settings.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
                  style={{ background: "var(--cat-accent)", color: "#0A0E14" }}>2</span>
                <p>
                  Send a deletion request to{" "}
                  <a href="mailto:privacy@goality.app" className="font-semibold hover:opacity-80"
                    style={{ color: "var(--cat-accent)" }}>privacy@goality.app</a>{" "}
                  with the subject line <strong style={{ color: "var(--cat-text)" }}>&quot;Data Deletion Request&quot;</strong> and your account email address.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
                  style={{ background: "var(--cat-accent)", color: "#0A0E14" }}>3</span>
                <p>We will confirm receipt and process your request within 30 days.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cat-text)" }}>Processing time</h2>
            <p>We will process all deletion requests within 30 days of receipt. You will receive a confirmation email when the process is complete.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cat-text)" }}>Contact</h2>
            <div className="rounded-xl border p-4" style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-card-bg)" }}>
              <p className="font-semibold mb-0.5" style={{ color: "var(--cat-text)" }}>Goality Sport Group OÜ (17232252)</p>
              <p>Tallinn, Estonia</p>
              <a href="mailto:privacy@goality.app" className="hover:opacity-80" style={{ color: "var(--cat-accent)" }}>
                privacy@goality.app
              </a>
            </div>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t text-xs text-center" style={{ borderColor: "var(--cat-card-border)", color: "var(--cat-text-muted)" }}>
          <p>© {new Date().getFullYear()} Goality Sport Group OÜ (17232252). ·{" "}
            <Link href="/privacy" className="hover:opacity-80" style={{ color: "var(--cat-accent)" }}>Privacy Policy</Link> ·{" "}
            <Link href="/terms" className="hover:opacity-80" style={{ color: "var(--cat-accent)" }}>Terms of Service</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
