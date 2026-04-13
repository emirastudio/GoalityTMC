"use client";

import { Link } from "@/i18n/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { ThemeProvider, ThemeToggle } from "@/components/ui/theme-provider";

export default function DataDeletionPage() {
  return (
    <ThemeProvider defaultTheme="light">
      <div style={{ background: "var(--cat-bg)", color: "var(--cat-text)", minHeight: "100vh" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "40px 24px" }}>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
            <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--cat-text-muted)", textDecoration: "none" }}>
              <ArrowLeft style={{ width: "14px", height: "14px" }} /> Back to home
            </Link>
            <ThemeToggle />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "8px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(239,68,68,0.10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Trash2 style={{ width: "24px", height: "24px", color: "#EF4444" }} />
            </div>
            <h1 style={{ fontSize: "30px", fontWeight: 800, color: "var(--cat-text)", margin: 0 }}>Data Deletion</h1>
          </div>
          <p style={{ fontSize: "13px", marginBottom: "32px", color: "var(--cat-text-muted)" }}>
            Goality Sport Group OÜ (17232252) · Tallinn, Estonia
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "32px", fontSize: "14px", lineHeight: "1.7", color: "var(--cat-text-secondary)" }}>

            <section>
              <p>You have the right to request deletion of your personal data that Goality Sport Group OÜ holds about you. This page explains how to submit a deletion request.</p>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>What data will be deleted</h2>
              <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <li>Your account information (name, email, profile picture)</li>
                <li>Your club and team registrations</li>
                <li>Any preferences and settings associated with your account</li>
              </ul>
              <p style={{ marginTop: "12px", fontSize: "12px", color: "var(--cat-text-muted)" }}>
                Note: some financial records may be retained for up to 7 years as required by Estonian accounting law.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>How to request deletion</h2>
              <div style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)", borderRadius: "12px", padding: "20px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <span style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text, #fff)", borderRadius: "9999px", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 800, flexShrink: 0, marginTop: "2px" }}>1</span>
                    <p style={{ margin: 0 }}>If you signed in via Google or Facebook, revoke the Goality app access in your social account settings.</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <span style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text, #fff)", borderRadius: "9999px", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 800, flexShrink: 0, marginTop: "2px" }}>2</span>
                    <p style={{ margin: 0 }}>
                      Send a deletion request to{" "}
                      <a href="mailto:privacy@goality.app" style={{ color: "var(--cat-accent)", fontWeight: 600 }}>privacy@goality.app</a>{" "}
                      with the subject line <strong style={{ color: "var(--cat-text)" }}>&quot;Data Deletion Request&quot;</strong> and your account email address.
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <span style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text, #fff)", borderRadius: "9999px", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 800, flexShrink: 0, marginTop: "2px" }}>3</span>
                    <p style={{ margin: 0 }}>We will confirm receipt and process your request within 30 days.</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>Processing time</h2>
              <p>We will process all deletion requests within 30 days of receipt. You will receive a confirmation email when the process is complete.</p>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>Contact</h2>
              <div style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)", borderRadius: "12px", padding: "16px" }}>
                <p style={{ fontWeight: 700, color: "var(--cat-text)", margin: "0 0 2px 0" }}>Goality Sport Group OÜ (17232252)</p>
                <p style={{ color: "var(--cat-text-muted)", margin: "0 0 2px 0" }}>Tallinn, Estonia</p>
                <a href="mailto:privacy@goality.app" style={{ color: "var(--cat-accent)" }}>privacy@goality.app</a>
              </div>
            </section>

          </div>

          <div style={{ borderTop: "1px solid var(--cat-card-border)", marginTop: "40px", paddingTop: "24px", fontSize: "12px", textAlign: "center", color: "var(--cat-text-muted)" }}>
            <p>© {new Date().getFullYear()} Goality Sport Group OÜ (17232252). ·{" "}
              <Link href="/privacy" style={{ color: "var(--cat-accent)" }}>Privacy Policy</Link> ·{" "}
              <Link href="/terms" style={{ color: "var(--cat-accent)" }}>Terms of Service</Link>
            </p>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}
