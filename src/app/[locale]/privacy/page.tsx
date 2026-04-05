import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Privacy Policy — Goality TMC" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--cat-bg)", color: "var(--cat-text)" }}>
      <div className="max-w-3xl mx-auto px-6 py-10">

        <Link href="/" className="inline-flex items-center gap-1.5 text-sm mb-8 hover:opacity-80 transition-opacity"
          style={{ color: "var(--cat-text-muted)" }}>
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--cat-text)" }}>Privacy Policy</h1>
        <p className="text-sm mb-8" style={{ color: "var(--cat-text-muted)" }}>
          Last updated: 2025-01-01 · Goality Sport Group OÜ (17232252), Tallinn, Estonia
        </p>

        <div className="space-y-8 text-sm leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cat-text)" }}>1. Who we are</h2>
            <p>Goality Sport Group OÜ (registry code 17232252) is a company registered in Estonia that operates the Goality TMC platform — a tournament management system for sports organisations. Our registered address is Tallinn, Estonia.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cat-text)" }}>2. Data Controllers</h2>
            <div className="space-y-3">
              <div className="rounded-xl border p-4" style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-card-bg)" }}>
                <p className="font-semibold mb-1" style={{ color: "var(--cat-text)" }}>Tournament Organiser</p>
                <p>Primary data controller for all tournament-related personal data. Responsible for decisions regarding data collected during registration and participation.</p>
              </div>
              <div className="rounded-xl border p-4" style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-card-bg)" }}>
                <p className="font-semibold mb-1" style={{ color: "var(--cat-text)" }}>Goality Sport Group OÜ (17232252)</p>
                <p>Data processor providing the Goality TMC platform. Also an independent data controller for account and authentication data (Google / Facebook OAuth).</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cat-text)" }}>3. What data we collect</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><span className="font-medium" style={{ color: "var(--cat-text)" }}>Account data:</span> name, email address, profile picture (via Google or Facebook login)</li>
              <li><span className="font-medium" style={{ color: "var(--cat-text)" }}>Club and team data:</span> club name, city, country, contact information</li>
              <li><span className="font-medium" style={{ color: "var(--cat-text)" }}>Tournament data:</span> registrations, match results, standings</li>
              <li><span className="font-medium" style={{ color: "var(--cat-text)" }}>Usage data:</span> page visits, browser type, IP address (via Google Analytics)</li>
              <li><span className="font-medium" style={{ color: "var(--cat-text)" }}>Medical & dietary data:</span> allergies, dietary requirements (collected only where voluntarily submitted)</li>
              <li><span className="font-medium" style={{ color: "var(--cat-text)" }}>Financial data:</span> payment records — no full card or bank account numbers are stored</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cat-text)" }}>4. Purposes and legal basis</h2>
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--cat-card-border)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "var(--cat-tag-bg)", borderBottom: "1px solid var(--cat-card-border)" }}>
                    <th className="text-left px-4 py-2.5 font-semibold" style={{ color: "var(--cat-text)" }}>Purpose</th>
                    <th className="text-left px-4 py-2.5 font-semibold" style={{ color: "var(--cat-text)" }}>Legal basis</th>
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
                      <td className="px-4 py-2.5">{p}</td>
                      <td className="px-4 py-2.5">{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cat-text)" }}>5. How we use your data</h2>
            <p>We use your data to provide and improve our services: account authentication, tournament management, communication about your registrations, and platform analytics. We do not sell your personal data to third parties.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cat-text)" }}>6. Third-party services</h2>
            <p>We use Google and Facebook for social login (OAuth 2.0). By logging in through these services, you agree to their respective privacy policies. We also use Google Analytics for anonymised usage statistics.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cat-text)" }}>7. Data retention</h2>
            <p>We retain your personal data for as long as your account is active. If you request deletion, we will remove your personal data within 30 days. Some data may be retained longer if required by law (e.g. financial records for 7 years under Estonian law).</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cat-text)" }}>8. Your rights (GDPR)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Request deletion — see our <Link href="/data-deletion" className="font-medium hover:opacity-80" style={{ color: "var(--cat-accent)" }}>Data Deletion</Link> page</li>
              <li>Object to processing based on legitimate interests</li>
              <li>Request restriction of processing</li>
              <li>Data portability (where applicable)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cat-text)" }}>9. Contact</h2>
            <div className="rounded-xl border p-4" style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-card-bg)" }}>
              <p className="font-semibold mb-0.5" style={{ color: "var(--cat-text)" }}>Goality Sport Group OÜ (17232252)</p>
              <p>Tallinn, Estonia</p>
              <a href="mailto:privacy@goality.app" className="hover:opacity-80" style={{ color: "var(--cat-accent)" }}>privacy@goality.app</a>
            </div>
          </section>

        </div>

        <div className="mt-10 pt-6 border-t text-xs text-center" style={{ borderColor: "var(--cat-card-border)", color: "var(--cat-text-muted)" }}>
          <p>© {new Date().getFullYear()} Goality Sport Group OÜ (17232252). All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
