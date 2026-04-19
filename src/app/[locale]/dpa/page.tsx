"use client";

import { Link } from "@/i18n/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { ThemeProvider, ThemeToggle } from "@/components/ui/theme-provider";

/**
 * Data Processing Agreement (GDPR Article 28).
 *
 * Binds Goality Sport Group OÜ (processor) and the Organiser (controller)
 * every time a new organisation is registered. Acceptance is captured
 * through a mandatory checkbox on the onboarding form and persisted in
 * `organizations.dpaAcceptedAt` / `dpaVersion`.
 */
export default function DPAPage() {
  return (
    <ThemeProvider defaultTheme="light">
      <div style={{ background: "var(--cat-bg)", color: "var(--cat-text)", minHeight: "100vh" }}>
        <div style={{ maxWidth: "780px", margin: "0 auto", padding: "40px 24px" }}>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
            <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--cat-text-muted)", textDecoration: "none" }}>
              <ArrowLeft style={{ width: "14px", height: "14px" }} /> Back to home
            </Link>
            <ThemeToggle />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "8px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(59,130,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <ShieldCheck style={{ width: "24px", height: "24px", color: "#3B82F6" }} />
            </div>
            <h1 style={{ fontSize: "30px", fontWeight: 800, color: "var(--cat-text)", margin: 0 }}>
              Data Processing Agreement
            </h1>
          </div>
          <p style={{ fontSize: "13px", marginBottom: "32px", color: "var(--cat-text-muted)" }}>
            Version 1 · Last updated: 2026-04-17 · Goality Sport Group OÜ (17232252), Tallinn, Estonia
          </p>

          <div style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: "12px", padding: "16px", marginBottom: "32px" }}>
            <p style={{ fontSize: "13px", color: "var(--cat-text-secondary)", margin: 0 }}>
              This Data Processing Agreement (&quot;DPA&quot;) is entered into pursuant to Article 28 of the General Data Protection Regulation (EU) 2016/679 (&quot;GDPR&quot;) between you (the &quot;Controller&quot;) and Goality Sport Group OÜ (the &quot;Processor&quot;) whenever you register an organisation account on Goality TMC. Your acceptance is captured at registration and recorded in our systems as evidence of conclusion of this DPA in writing by electronic means.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "28px", fontSize: "14px", lineHeight: "1.7", color: "var(--cat-text-secondary)" }}>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>1. Parties &amp; Roles</h2>
              <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <li><strong style={{ color: "var(--cat-text)" }}>Controller:</strong> the legal or natural person that registers an organisation on Goality TMC. Determines the purposes and means of processing of personal data of its own clubs, teams, players and staff.</li>
                <li><strong style={{ color: "var(--cat-text)" }}>Processor:</strong> Goality Sport Group OÜ, registry code 17232252, Tallinn, Estonia. Provides the Goality TMC platform and processes personal data on the Controller&apos;s behalf under this DPA.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>2. Subject-matter &amp; duration</h2>
              <p>The Processor processes personal data solely for the purpose of providing the Goality TMC service (tournament registration, scheduling, results, billing). This DPA is effective from the moment of acceptance and remains in force for as long as the Controller has an active organisation account, and thereafter as long as data remains stored in accordance with Section 9.</p>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>3. Nature and purpose of processing</h2>
              <p>Storage, retrieval, alteration, structuring and transmission of personal data strictly as required to operate the platform: creation of accounts, registration of teams and players, match scheduling, publication of fixtures and standings, processing of payments, sending transactional communications. No automated decision-making with legal effects is performed.</p>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>4. Types of personal data &amp; categories of data subjects</h2>
              <div style={{ borderRadius: "12px", border: "1px solid var(--cat-card-border)", overflow: "hidden" }}>
                <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--cat-tag-bg)", borderBottom: "1px solid var(--cat-card-border)" }}>
                      <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 700, color: "var(--cat-text)" }}>Data subject</th>
                      <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 700, color: "var(--cat-text)" }}>Typical data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Organisation administrators", "Name, email, password hash, IP address, role, login timestamps"],
                      ["Club managers", "Name, email, phone, club affiliation"],
                      ["Players (incl. minors)", "First name, last name, date of birth, team, shirt number"],
                      ["Match participants (referees, staff)", "Name, role, contact email (optional)"],
                      ["Payers / billing contacts", "Name, email, billing address, transaction IDs (card data is handled by Stripe, never stored by Processor)"],
                    ].map(([s, d], i) => (
                      <tr key={i} style={{ borderTop: "1px solid var(--cat-card-border)" }}>
                        <td style={{ padding: "10px 16px", fontWeight: 600, color: "var(--cat-text)" }}>{s}</td>
                        <td style={{ padding: "10px 16px" }}>{d}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ marginTop: "10px", fontSize: "13px", color: "var(--cat-text-muted)" }}>
                Goality TMC is not designed for special category data (GDPR Art. 9). The Controller shall not enter health, religious, political or other special category data into free-text fields. If the Controller does so, it bears sole responsibility for the appropriate legal basis.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>5. Controller&apos;s instructions</h2>
              <p>The Processor processes personal data only on documented instructions from the Controller, which are given through the normal use of the platform (e.g. adding a team, triggering a report, exporting data) and through this DPA. The Processor will inform the Controller without delay if an instruction appears to infringe the GDPR or other EU / Member-State law.</p>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>6. Confidentiality</h2>
              <p>The Processor ensures that personnel authorised to process personal data have committed themselves to confidentiality, either by contract or by statutory duty. Access is limited to what is strictly necessary to operate and support the service.</p>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>7. Security (Art. 32)</h2>
              <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <li>Transport encryption (TLS 1.2+) for all traffic between user and platform</li>
                <li>Passwords stored as salted hashes (bcrypt); session tokens are signed JWTs with short lifetime</li>
                <li>Role-based access control; customer data is isolated per organisation (multi-tenant with tenant-scoped queries)</li>
                <li>Regular off-host backups of the production database with restore drills</li>
                <li>Log retention for access and modification events to support incident investigation</li>
                <li>Defence-in-depth: dependency updates, code review, server-side plan and permission gates</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>8. Sub-processors (Art. 28(2) &amp; (4))</h2>
              <p style={{ marginBottom: "10px" }}>The Controller provides general authorisation for the Processor to engage the following sub-processors. The Processor remains fully liable to the Controller for the performance of each sub-processor&apos;s obligations.</p>
              <div style={{ borderRadius: "12px", border: "1px solid var(--cat-card-border)", overflow: "hidden" }}>
                <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--cat-tag-bg)", borderBottom: "1px solid var(--cat-card-border)" }}>
                      <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 700, color: "var(--cat-text)" }}>Sub-processor</th>
                      <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 700, color: "var(--cat-text)" }}>Purpose</th>
                      <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 700, color: "var(--cat-text)" }}>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Stripe Payments Europe, Ltd.", "Payment processing, billing", "Ireland / USA"],
                      ["Google LLC", "OAuth 2.0 sign-in (optional)", "USA"],
                      ["Meta Platforms Ireland Ltd.", "OAuth 2.0 sign-in (optional)", "Ireland / USA"],
                      ["VPS hosting provider (EU)", "Application and database hosting", "European Union"],
                      ["SMTP email provider (self-hosted)", "Transactional email (invites, receipts)", "European Union"],
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
                The Processor will give at least 30 days&apos; advance notice (by in-app notice or email) of the addition or replacement of any sub-processor. The Controller may object to such changes by terminating the service before the change takes effect.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>9. International transfers</h2>
              <p>Where a sub-processor is located outside the European Economic Area (notably the United States), transfers take place on the basis of (i) the EU-US Data Privacy Framework adequacy decision where the recipient is certified, or (ii) Standard Contractual Clauses (Commission Implementing Decision 2021/914). A copy of the relevant transfer mechanism is available on written request.</p>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>10. Assistance to the Controller</h2>
              <p>Taking into account the nature of the processing, the Processor assists the Controller by appropriate technical and organisational measures, insofar as possible, in responding to data-subject requests (Art. 15–21), in security and breach-notification duties (Art. 32–34), in data-protection impact assessments (Art. 35) and in prior consultations (Art. 36).</p>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>11. Personal data breach notification</h2>
              <p>The Processor will notify the Controller without undue delay, and no later than <strong style={{ color: "var(--cat-text)" }}>72 hours</strong> after becoming aware, of any personal data breach affecting the Controller&apos;s data. The notification will include the information required under GDPR Art. 33(3) insofar as available at the time.</p>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>12. Deletion or return of data</h2>
              <p>On termination of the Controller&apos;s account (or on written request of the Controller), the Processor will, at the Controller&apos;s choice, delete or return all personal data to the Controller and delete existing copies, unless EU or Member-State law requires continued storage. Accounting records are retained for 7 years under the Estonian Accounting Act.</p>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>13. Audits (Art. 28(3)(h))</h2>
              <p>The Processor makes available to the Controller all information necessary to demonstrate compliance with Art. 28, and allows for and contributes to audits, including inspections, conducted by the Controller or a mandated auditor. Audits are limited to once per calendar year unless a reasonable suspicion of non-compliance arises, and must not unreasonably disrupt the Processor&apos;s operations.</p>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>14. Liability &amp; governing law</h2>
              <p>The liability provisions of the <Link href="/terms" style={{ color: "var(--cat-accent)" }}>Terms of Service</Link> apply to this DPA. This DPA is governed by the laws of the Republic of Estonia. Disputes shall be subject to the exclusive jurisdiction of the courts of Estonia.</p>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>15. Order of precedence</h2>
              <p>In case of conflict between this DPA and the Terms of Service, this DPA prevails with respect to personal data protection matters.</p>
            </section>

            <section>
              <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", color: "var(--cat-text)" }}>16. Contact</h2>
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
              <Link href="/terms" style={{ color: "var(--cat-accent)" }}>Terms of Service</Link> ·{" "}
              <Link href="/data-deletion" style={{ color: "var(--cat-accent)" }}>Data Deletion</Link>
            </p>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}
