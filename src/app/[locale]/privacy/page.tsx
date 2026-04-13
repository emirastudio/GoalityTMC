"use client";

import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { ThemeProvider, ThemeToggle } from "@/components/ui/theme-provider";

export default function PrivacyPage() {
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

          <h1 style={{ fontSize: "30px", fontWeight: 800, color: "var(--cat-text)", marginBottom: "8px" }}>Privacy Policy</h1>
          <p style={{ fontSize: "13px", marginBottom: "32px", color: "var(--cat-text-muted)" }}>
            Last updated: 2025-01-01 · Goality Sport Group OÜ (17232252), Tallinn, Estonia
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "32px", fontSize: "14px", lineHeight: "1.7", color: "var(--cat-text-secondary)" }}>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>1. Who we are</h2>
              <p>Goality Sport Group OÜ (registry code 17232252) is a company registered in Estonia that operates the Goality TMC platform — a tournament management system for sports organisations. Our registered address is Tallinn, Estonia.</p>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>2. Data Controllers</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)", borderRadius: "12px", padding: "16px" }}>
                  <p style={{ fontWeight: 700, color: "var(--cat-text)", margin: "0 0 4px 0" }}>Tournament Organiser</p>
                  <p style={{ margin: 0 }}>Primary data controller for all tournament-related personal data. Responsible for decisions regarding data collected during registration and participation.</p>
                </div>
                <div style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)", borderRadius: "12px", padding: "16px" }}>
                  <p style={{ fontWeight: 700, color: "var(--cat-text)", margin: "0 0 4px 0" }}>Goality Sport Group OÜ (17232252)</p>
                  <p style={{ margin: 0 }}>Data processor providing the Goality TMC platform. Also an independent data controller for account and authentication data (Google / Facebook OAuth).</p>
                </div>
              </div>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>3. What data we collect</h2>
              <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <li><strong style={{ color: "var(--cat-text)" }}>Account data:</strong> name, email address, profile picture (via Google or Facebook login)</li>
                <li><strong style={{ color: "var(--cat-text)" }}>Club and team data:</strong> club name, city, country, contact information</li>
                <li><strong style={{ color: "var(--cat-text)" }}>Tournament data:</strong> registrations, match results, standings</li>
                <li><strong style={{ color: "var(--cat-text)" }}>Usage data:</strong> page visits, browser type, IP address (via Google Analytics)</li>
                <li><strong style={{ color: "var(--cat-text)" }}>Medical & dietary data:</strong> allergies, dietary requirements (collected only where voluntarily submitted)</li>
                <li><strong style={{ color: "var(--cat-text)" }}>Financial data:</strong> payment records — no full card or bank account numbers are stored</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>4. Purposes and legal basis</h2>
              <div style={{ borderRadius: "12px", border: "1px solid var(--cat-card-border)", overflow: "hidden" }}>
                <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--cat-tag-bg)", borderBottom: "1px solid var(--cat-card-border)" }}>
                      <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 700, color: "var(--cat-text)" }}>Purpose</th>
                      <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 700, color: "var(--cat-text)" }}>Legal basis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Tournament registration and administration", "Contract performance"],
                      ["Authentication via Google / Facebook", "Legitimate interests / consent"],
                      ["Hotel booking and logistics", "Contract performance"],
                      ["Publishing names in match schedules", "Legitimate interests"],
                      ["Financial accounting", "Legal obligation"],
                      ["Marketing communications from Goality", "Legitimate interests (opt-out available)"],
                    ].map(([p, b], i) => (
                      <tr key={i} style={{ borderTop: "1px solid var(--cat-card-border)" }}>
                        <td style={{ padding: "10px 16px" }}>{p}</td>
                        <td style={{ padding: "10px 16px" }}>{b}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>5. How we use your data</h2>
              <p>We use your data to provide and improve our services: account authentication, tournament management, communication about your registrations, and platform analytics. We do not sell your personal data to third parties.</p>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>6. Third-party services</h2>
              <p>We use Google and Facebook for social login (OAuth 2.0). By logging in through these services, you agree to their respective privacy policies. We also use Google Analytics for anonymised usage statistics.</p>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>7. Data retention</h2>
              <p>We retain your personal data for as long as your account is active. If you request deletion, we will remove your personal data within 30 days. Some data may be retained longer if required by law (e.g. financial records for 7 years under Estonian law).</p>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>8. Your rights (GDPR)</h2>
              <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <li>Access the personal data we hold about you</li>
                <li>Correct inaccurate or incomplete data</li>
                <li>Request deletion — see our <Link href="/data-deletion" style={{ color: "var(--cat-accent)" }}>Data Deletion</Link> page</li>
                <li>Object to processing based on legitimate interests</li>
                <li>Request restriction of processing</li>
                <li>Data portability (where applicable)</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>9. Contact</h2>
              <div style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)", borderRadius: "12px", padding: "16px" }}>
                <p style={{ fontWeight: 700, color: "var(--cat-text)", margin: "0 0 2px 0" }}>Goality Sport Group OÜ (17232252)</p>
                <p style={{ color: "var(--cat-text-muted)", margin: "0 0 2px 0" }}>Tallinn, Estonia</p>
                <a href="mailto:privacy@goality.app" style={{ color: "var(--cat-accent)" }}>privacy@goality.app</a>
              </div>
            </section>

          </div>

          <div style={{ borderTop: "1px solid var(--cat-card-border)", marginTop: "40px", paddingTop: "24px", fontSize: "12px", textAlign: "center", color: "var(--cat-text-muted)" }}>
            <p>© {new Date().getFullYear()} Goality Sport Group OÜ (17232252). All rights reserved. ·{" "}
              <Link href="/terms" style={{ color: "var(--cat-accent)" }}>Terms of Service</Link> ·{" "}
              <Link href="/data-deletion" style={{ color: "var(--cat-accent)" }}>Data Deletion</Link>
            </p>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}
