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
            Last updated: 2026-04-17 · Goality Sport Group OÜ (17232252), Tallinn, Estonia
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
                <li><strong style={{ color: "var(--cat-text)" }}>Technical data:</strong> IP address, browser type, device information — used for security, fraud prevention and essential service operation only. If analytics cookies are enabled via consent banner, we may collect anonymised usage statistics; by default this is off.</li>
                <li><strong style={{ color: "var(--cat-text)" }}>Player data:</strong> first name, last name and date of birth of players registered by a club. This is the minimum data needed to verify age categories and produce match reports. We do not actively solicit or require special category data (health, allergies, religion etc.). If an organiser chooses to collect such data through their own configuration, that organiser — not Goality — is the controller of that data and must obtain the appropriate legal basis independently.</li>
                <li><strong style={{ color: "var(--cat-text)" }}>Payment data:</strong> transaction records, invoice data. Full card numbers, CVV and bank account numbers are <strong>never</strong> stored on our servers — they are handled directly by Stripe (see § 6).</li>
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
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>6. Third-party processors</h2>
              <p style={{ marginBottom: "10px" }}>We rely on the following processors to run the service. Each has its own privacy policy, which we encourage you to read.</p>
              <div style={{ borderRadius: "12px", border: "1px solid var(--cat-card-border)", overflow: "hidden" }}>
                <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--cat-tag-bg)", borderBottom: "1px solid var(--cat-card-border)" }}>
                      <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 700, color: "var(--cat-text)" }}>Processor</th>
                      <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 700, color: "var(--cat-text)" }}>Purpose</th>
                      <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 700, color: "var(--cat-text)" }}>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Stripe Payments Europe, Ltd.", "Payment processing", "Ireland / USA"],
                      ["Google LLC", "Social login (OAuth 2.0)", "USA"],
                      ["Meta Platforms Ireland Ltd.", "Social login (OAuth 2.0)", "Ireland / USA"],
                      ["Our hosting provider (VPS, EU)", "Application and database hosting", "European Union"],
                      ["SMTP email relay (self-hosted)", "Transactional email (registrations, invites)", "European Union"],
                    ].map(([p, purpose, loc], i) => (
                      <tr key={i} style={{ borderTop: "1px solid var(--cat-card-border)" }}>
                        <td style={{ padding: "10px 16px", fontWeight: 600, color: "var(--cat-text)" }}>{p}</td>
                        <td style={{ padding: "10px 16px" }}>{purpose}</td>
                        <td style={{ padding: "10px 16px" }}>{loc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ marginTop: "10px", fontSize: "13px", color: "var(--cat-text-muted)" }}>
                We do <strong style={{ color: "var(--cat-text)" }}>not</strong> run Google Analytics or third-party behavioural tracking by default. If this changes, we will update this policy and require fresh consent through the cookie banner.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>7. International data transfers</h2>
              <p>Some of our processors (Stripe, Google, Meta) are located outside the European Economic Area, including in the United States. Where data is transferred outside the EEA, we rely on one or more of the following safeguards recognised under GDPR Chapter V:</p>
              <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "4px", marginTop: "8px" }}>
                <li>The EU-US Data Privacy Framework adequacy decision (Commission Decision C(2023) 4745) where the recipient is certified</li>
                <li>Standard Contractual Clauses (2021/914) incorporated in our processor agreements</li>
                <li>Your explicit consent where no other safeguard applies</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>8. Cookies</h2>
              <p style={{ marginBottom: "10px" }}>We use the minimum set of cookies required for the service. A consent banner is shown on your first visit. You can revisit your choice at any time via the footer link.</p>
              <div style={{ borderRadius: "12px", border: "1px solid var(--cat-card-border)", overflow: "hidden" }}>
                <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--cat-tag-bg)", borderBottom: "1px solid var(--cat-card-border)" }}>
                      <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 700, color: "var(--cat-text)" }}>Cookie</th>
                      <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 700, color: "var(--cat-text)" }}>Purpose</th>
                      <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 700, color: "var(--cat-text)" }}>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Session / JWT auth", "Keep you signed in (strictly necessary)", "Session / up to 30 days"],
                      ["goality_cookie_consent", "Record your cookie preferences", "365 days"],
                      ["Stripe cookies", "Fraud prevention during checkout (set by Stripe)", "Varies"],
                    ].map(([c, p, d], i) => (
                      <tr key={i} style={{ borderTop: "1px solid var(--cat-card-border)" }}>
                        <td style={{ padding: "10px 16px", fontWeight: 600, color: "var(--cat-text)", fontFamily: "monospace", fontSize: "12px" }}>{c}</td>
                        <td style={{ padding: "10px 16px" }}>{p}</td>
                        <td style={{ padding: "10px 16px" }}>{d}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>9. Data retention</h2>
              <p>We retain your personal data for as long as your account is active. If you request deletion, we will remove your personal data without undue delay and in any case within 30 days of receipt. Financial and accounting records (invoices, payment receipts) are retained for 7 years as required by the Estonian Accounting Act (Raamatupidamise seadus § 12).</p>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>10. Your rights (GDPR)</h2>
              <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <li>Access the personal data we hold about you (Art. 15)</li>
                <li>Correct inaccurate or incomplete data (Art. 16)</li>
                <li>Request deletion (Art. 17) — see our <Link href="/data-deletion" style={{ color: "var(--cat-accent)" }}>Data Deletion</Link> page</li>
                <li>Object to processing based on legitimate interests (Art. 21)</li>
                <li>Restrict processing (Art. 18)</li>
                <li>Data portability (Art. 20)</li>
                <li>Withdraw consent at any time — this does not affect the lawfulness of processing before withdrawal</li>
                <li>Lodge a complaint with the Estonian Data Protection Inspectorate (<a href="https://www.aki.ee" target="_blank" rel="noopener noreferrer" style={{ color: "var(--cat-accent)" }}>aki.ee</a>) or your local supervisory authority</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>11. Contact</h2>
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
