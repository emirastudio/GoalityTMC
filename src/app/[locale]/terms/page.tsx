"use client";

import { Link } from "@/i18n/navigation";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { ThemeProvider, ThemeToggle } from "@/components/ui/theme-provider";

export default function TermsPage() {
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
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(5,150,105,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <ShieldAlert style={{ width: "24px", height: "24px", color: "var(--cat-accent)" }} />
            </div>
            <h1 style={{ fontSize: "30px", fontWeight: 800, color: "var(--cat-text)", margin: 0 }}>Terms of Service</h1>
          </div>
          <p style={{ fontSize: "13px", marginBottom: "32px", color: "var(--cat-text-muted)" }}>
            Last updated: 2025-01-01 · Goality Sport Group OÜ (17232252), Tallinn, Estonia
          </p>

          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "12px", padding: "16px", marginBottom: "32px" }}>
            <p style={{ fontSize: "13px", fontWeight: 700, color: "#DC2626", marginBottom: "6px" }}>⚠️ Important Notice</p>
            <p style={{ fontSize: "13px", color: "var(--cat-text-secondary)", margin: 0 }}>
              By using Goality TMC you agree to these Terms in full. If you do not agree, you must stop using the platform immediately.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "32px", fontSize: "14px", lineHeight: "1.7", color: "var(--cat-text-secondary)" }}>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>1. Service Description</h2>
              <p>Goality Sport Group OÜ (17232252) (&quot;Goality&quot;, &quot;we&quot;, &quot;us&quot;) provides Goality TMC — a software-as-a-service platform for managing sports tournaments, including team registration, scheduling, results tracking, and communications. We provide the technology platform only. <strong style={{ color: "var(--cat-text)" }}>We are not a tournament organiser, sports body, or event operator.</strong></p>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>2. Acceptance of Terms</h2>
              <p style={{ marginBottom: "10px" }}>By registering an account, accessing, or using the platform, you confirm that:</p>
              <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <li>You are at least 18 years of age or have legal authority to act on behalf of an organisation</li>
                <li>You have read and understood these Terms</li>
                <li>You agree to use the platform only for lawful purposes</li>
                <li>If you use the platform on behalf of an organisation, you have authority to bind that organisation to these Terms</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>3. Your Obligations</h2>
              <p style={{ marginBottom: "10px" }}>As a user of Goality TMC you are solely responsible for:</p>
              <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <li>The accuracy and legality of all data you enter into the platform (team names, player data, results, etc.)</li>
                <li>Compliance with all applicable laws in your jurisdiction, including data protection, sports regulations, and consumer protection laws</li>
                <li>How you configure, manage, and conduct tournaments using the platform — Goality has no involvement in the actual conduct of any tournament</li>
                <li>Ensuring that all participants in any tournament managed through the platform have given necessary consents for data processing</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>4. No Liability for Tournament Operations</h2>
              <p style={{ marginBottom: "12px" }}>Goality TMC is a software tool. We provide infrastructure — we do not participate in, supervise, organise, endorse, or control any tournament, match, event, or activity conducted through the platform.</p>
              <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "12px", padding: "16px" }}>
                <p style={{ fontWeight: 700, color: "var(--cat-text)", marginBottom: "8px" }}>Goality accepts no responsibility whatsoever for:</p>
                <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "4px", margin: 0 }}>
                  <li>Disputes between clubs, teams, or players</li>
                  <li>Injuries, accidents, or incidents at events</li>
                  <li>Incorrect results or data entered by users</li>
                  <li>Disqualifications, scheduling errors, or any organisational decisions made by tournament operators</li>
                  <li>Any loss, damage, or harm arising from how the platform is used by any party</li>
                  <li>Technical downtime, data loss, or service interruptions</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>5. Platform Use Restrictions</h2>
              <p style={{ marginBottom: "10px" }}>You may not:</p>
              <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <li>Reverse engineer, copy, or resell the Goality TMC platform or any part of it</li>
                <li>Use the platform to process data for any purpose other than sports tournament management</li>
                <li>Attempt to gain unauthorised access to other users&apos; data or accounts</li>
                <li>Use automated tools, bots, or scrapers to extract data from the platform</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>6. Limitation of Liability</h2>
              <p style={{ marginBottom: "12px" }}>To the maximum extent permitted by applicable law:</p>
              <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "12px", padding: "16px" }}>
                <p style={{ margin: 0 }}>Goality Sport Group OÜ shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, revenue, data, or goodwill, arising out of or in connection with your use of the platform, even if we have been advised of the possibility of such damages. Our total aggregate liability to you shall not exceed the total fees paid by you to Goality in the twelve (12) months preceding the claim.</p>
              </div>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>7. Payments and No-Refund Policy</h2>
              <p style={{ marginBottom: "12px" }}>Goality TMC is a digital subscription service. All payments are processed electronically.</p>
              <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "12px", padding: "16px" }}>
                <p style={{ fontWeight: 700, color: "var(--cat-text)", marginBottom: "8px" }}>No Refunds for Digital Products</p>
                <p style={{ margin: 0 }}>In accordance with the EU Consumer Rights Directive (2011/83/EU) Article 16(m), the right of withdrawal does not apply to digital content that has been fully performed with your prior express consent. By activating a paid plan on Goality TMC, you expressly consent to immediate performance and acknowledge that you lose your right of withdrawal. <strong style={{ color: "var(--cat-text)" }}>All payments are non-refundable.</strong> If you believe there is an error in billing, contact us within 14 days of the charge at <a href="mailto:legal@goality.app" style={{ color: "var(--cat-accent)" }}>legal@goality.app</a>.</p>
              </div>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>8. Account Termination</h2>
              <p>We reserve the right to suspend or terminate your account at any time if you violate these Terms, engage in fraudulent activity, or use the platform in a way that causes harm to others or to Goality. You may cancel your account at any time by contacting us. <strong style={{ color: "var(--cat-text)" }}>Termination does not entitle you to a refund of any fees already paid.</strong></p>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>9. Governing Law</h2>
              <p>These Terms are governed by and construed in accordance with the laws of the Republic of Estonia. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts of Estonia. If you are a consumer in the EU, you may also submit a complaint to the EU Online Dispute Resolution platform at ec.europa.eu/consumers/odr.</p>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>10. Contact</h2>
              <div style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)", borderRadius: "12px", padding: "16px" }}>
                <p style={{ fontWeight: 700, color: "var(--cat-text)", margin: "0 0 2px 0" }}>Goality Sport Group OÜ (17232252)</p>
                <p style={{ color: "var(--cat-text-muted)", margin: "0 0 2px 0" }}>Tallinn, Estonia</p>
                <a href="mailto:legal@goality.app" style={{ color: "var(--cat-accent)" }}>legal@goality.app</a>
              </div>
            </section>

          </div>

          <div style={{ borderTop: "1px solid var(--cat-card-border)", marginTop: "40px", paddingTop: "24px", fontSize: "12px", textAlign: "center", color: "var(--cat-text-muted)" }}>
            <p>© {new Date().getFullYear()} Goality Sport Group OÜ (17232252). All rights reserved. ·{" "}
              <Link href="/privacy" style={{ color: "var(--cat-accent)" }}>Privacy Policy</Link> ·{" "}
              <Link href="/data-deletion" style={{ color: "var(--cat-accent)" }}>Data Deletion</Link>
            </p>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}
