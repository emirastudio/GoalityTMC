import { Link } from "@/i18n/navigation";
import { ArrowLeft, ShieldAlert } from "lucide-react";

export const metadata = { title: "Terms of Service — Goality TMC" };

export default function TermsPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--cat-bg)", color: "var(--cat-text)" }}>
      <div className="max-w-3xl mx-auto px-6 py-10">

        <Link href="/" className="inline-flex items-center gap-1.5 text-sm mb-8 hover:opacity-80 transition-opacity"
          style={{ color: "var(--cat-text-muted)" }}>
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(43,254,186,0.1)" }}>
            <ShieldAlert className="w-6 h-6" style={{ color: "var(--cat-accent)" }} />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: "var(--cat-text)" }}>Terms of Service</h1>
        </div>
        <p className="text-sm mb-8" style={{ color: "var(--cat-text-muted)" }}>
          Last updated: 2025-01-01 · Goality Sport Group OÜ (17232252), Tallinn, Estonia
        </p>

        <div className="rounded-2xl border p-5 mb-8"
          style={{ background: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.25)" }}>
          <p className="text-sm font-semibold mb-1" style={{ color: "#EF4444" }}>⚠️ Important Notice</p>
          <p className="text-sm" style={{ color: "var(--cat-text-secondary)" }}>
            By using Goality TMC you agree to these Terms in full. If you do not agree, you must stop using the platform immediately.
          </p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cat-text)" }}>1. Service Description</h2>
            <p>Goality Sport Group OÜ (17232252) (&quot;Goality&quot;, &quot;we&quot;, &quot;us&quot;) provides Goality TMC — a software-as-a-service platform for managing sports tournaments, including team registration, scheduling, results tracking, and communications. We provide the technology platform only. <strong style={{ color: "var(--cat-text)" }}>We are not a tournament organiser, sports body, or event operator.</strong></p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cat-text)" }}>2. Acceptance of Terms</h2>
            <p className="mb-3">By registering an account, accessing, or using the platform, you confirm that:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>You are at least 18 years of age or have legal authority to act on behalf of an organisation</li>
              <li>You have read and understood these Terms</li>
              <li>You agree to use the platform only for lawful purposes</li>
              <li>If you use the platform on behalf of an organisation, you have authority to bind that organisation to these Terms</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cat-text)" }}>3. Your Obligations</h2>
            <p className="mb-3">As a user of Goality TMC you are solely responsible for:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>The accuracy and legality of all data you enter into the platform (team names, player data, results, etc.)</li>
              <li>Compliance with all applicable laws in your jurisdiction, including data protection, sports regulations, and consumer protection laws</li>
              <li>How you configure, manage, and conduct tournaments using the platform — Goality has no involvement in the actual conduct of any tournament</li>
              <li>Ensuring that all participants in any tournament managed through the platform have given necessary consents for data processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cat-text)" }}>4. No Liability for Tournament Operations</h2>
            <p className="mb-3">Goality TMC is a software tool. We provide infrastructure — we do not participate in, supervise, organise, endorse, or control any tournament, match, event, or activity conducted through the platform.</p>
            <div className="rounded-xl border p-4" style={{ borderColor: "rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.04)" }}>
              <p className="font-semibold mb-2" style={{ color: "var(--cat-text)" }}>Goality accepts no responsibility whatsoever for:</p>
              <ul className="list-disc pl-5 space-y-1">
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
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cat-text)" }}>5. Platform Use Restrictions</h2>
            <p className="mb-3">You may not:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Reverse engineer, copy, or resell the Goality TMC platform or any part of it</li>
              <li>Use the platform to process data for any purpose other than sports tournament management</li>
              <li>Attempt to gain unauthorised access to other users&apos; data or accounts</li>
              <li>Use automated tools, bots, or scrapers to extract data from the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cat-text)" }}>6. Limitation of Liability</h2>
            <p className="mb-3">To the maximum extent permitted by applicable law:</p>
            <div className="rounded-xl border p-4" style={{ borderColor: "rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.04)" }}>
              <p>Goality Sport Group OÜ shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, revenue, data, or goodwill, arising out of or in connection with your use of the platform, even if we have been advised of the possibility of such damages. Our total aggregate liability to you shall not exceed the total fees paid by you to Goality in the twelve (12) months preceding the claim.</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cat-text)" }}>7. Payments and No-Refund Policy</h2>
            <p className="mb-3">Goality TMC is a digital subscription service. All payments are processed electronically.</p>
            <div className="rounded-xl border p-4" style={{ borderColor: "rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.04)" }}>
              <p className="font-semibold mb-2" style={{ color: "var(--cat-text)" }}>No Refunds for Digital Products</p>
              <p>In accordance with the EU Consumer Rights Directive (2011/83/EU) Article 16(m), the right of withdrawal does not apply to digital content that has been fully performed with your prior express consent. By activating a paid plan on Goality TMC, you expressly consent to immediate performance and acknowledge that you lose your right of withdrawal. <strong style={{ color: "var(--cat-text)" }}>All payments are non-refundable.</strong> If you believe there is an error in billing, contact us within 14 days of the charge at legal@goality.app.</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cat-text)" }}>8. Account Termination</h2>
            <p>We reserve the right to suspend or terminate your account at any time if you violate these Terms, engage in fraudulent activity, or use the platform in a way that causes harm to others or to Goality. You may cancel your account at any time by contacting us. <strong style={{ color: "var(--cat-text)" }}>Termination does not entitle you to a refund of any fees already paid.</strong></p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cat-text)" }}>9. Governing Law</h2>
            <p>These Terms are governed by and construed in accordance with the laws of the Republic of Estonia. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts of Estonia. If you are a consumer in the EU, you may also submit a complaint to the EU Online Dispute Resolution platform at ec.europa.eu/consumers/odr.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--cat-text)" }}>10. Contact</h2>
            <div className="rounded-xl border p-4" style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-card-bg)" }}>
              <p className="font-semibold mb-0.5" style={{ color: "var(--cat-text)" }}>Goality Sport Group OÜ (17232252)</p>
              <p>Tallinn, Estonia</p>
              <a href="mailto:legal@goality.app" className="hover:opacity-80" style={{ color: "var(--cat-accent)" }}>legal@goality.app</a>
            </div>
          </section>

        </div>

        <div className="mt-10 pt-6 border-t text-xs text-center" style={{ borderColor: "var(--cat-card-border)", color: "var(--cat-text-muted)" }}>
          <p>© {new Date().getFullYear()} Goality Sport Group OÜ (17232252). All rights reserved. ·{" "}
            <Link href="/privacy" className="hover:opacity-80" style={{ color: "var(--cat-accent)" }}>Privacy Policy</Link> ·{" "}
            <Link href="/data-deletion" className="hover:opacity-80" style={{ color: "var(--cat-accent)" }}>Data Deletion</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
