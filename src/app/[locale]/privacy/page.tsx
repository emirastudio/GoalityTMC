"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Back */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-navy hover:underline mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="text-3xl font-bold text-text-primary mb-2">Privacy Policy</h1>
        <p className="text-sm text-text-secondary mb-8">
          Last updated: January 2026
        </p>

        <div className="space-y-8 text-sm text-text-primary leading-relaxed">

          {/* 1 */}
          <section>
            <h2 className="text-lg font-semibold mb-3">1. Introduction</h2>
            <p>
              This Privacy Policy explains how personal data is collected, used, and protected
              when you register a team for a tournament managed through the{" "}
              <strong>Goality Tournament Management Core (Goality TMC)</strong> platform,
              operated by <strong>Goality Sport Group</strong>.
            </p>
            <p className="mt-2">
              The tournament is organised by <strong>Football Planet</strong>, which acts as
              the primary data controller. Goality Sport Group processes personal data on
              behalf of Football Planet as a data processor, and also holds an independent
              legal basis for using contact data for the purposes described in Section 5.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-lg font-semibold mb-3">2. Data Controllers</h2>
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-white p-4">
                <p className="font-semibold">Football Planet</p>
                <p className="text-text-secondary mt-1">
                  Primary data controller for all tournament-related personal data. Responsible
                  for decisions regarding data collected during tournament registration and
                  participation.
                </p>
              </div>
              <div className="rounded-lg border border-border bg-white p-4">
                <p className="font-semibold">Goality Sport Group</p>
                <p className="text-text-secondary mt-1">
                  Data processor providing the Goality TMC platform. Also an independent data
                  controller for marketing communications as described in Section 5.
                </p>
              </div>
            </div>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-lg font-semibold mb-3">3. Personal Data We Collect</h2>
            <p className="mb-3">We collect the following categories of personal data:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-text-secondary">
              <li>
                <span className="text-text-primary font-medium">Identity data:</span> first
                name, last name, date of birth
              </li>
              <li>
                <span className="text-text-primary font-medium">Contact data:</span> email
                address, phone number
              </li>
              <li>
                <span className="text-text-primary font-medium">Club &amp; team data:</span>{" "}
                club name, country, city, team name, age class, jersey number, playing position,
                role (coach, physio, etc.)
              </li>
              <li>
                <span className="text-text-primary font-medium">
                  Medical &amp; dietary data:
                </span>{" "}
                allergies, dietary requirements, medical notes, medical documents (collected
                only where voluntarily submitted)
              </li>
              <li>
                <span className="text-text-primary font-medium">Logistics data:</span> travel
                details (arrival/departure dates, flight or train numbers), hotel accommodation
                preferences and dates
              </li>
              <li>
                <span className="text-text-primary font-medium">Financial data:</span> payment
                records (amounts, dates, payment method references — no full card or bank
                account numbers are stored)
              </li>
              <li>
                <span className="text-text-primary font-medium">Club badge/logo:</span> image
                files uploaded for use in the match schedule and public materials
              </li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-lg font-semibold mb-3">4. Purposes and Legal Basis</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="text-left py-2 pr-4 font-semibold">Purpose</th>
                    <th className="text-left py-2 font-semibold">Legal basis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="py-2.5 pr-4 text-text-secondary">Tournament registration and administration</td>
                    <td className="py-2.5 text-text-secondary">Contract performance</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 text-text-secondary">Hotel booking and transfer coordination</td>
                    <td className="py-2.5 text-text-secondary">Contract performance</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 text-text-secondary">Medical &amp; dietary needs management</td>
                    <td className="py-2.5 text-text-secondary">Vital interests / explicit consent</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 text-text-secondary">Publishing names in match schedules and results</td>
                    <td className="py-2.5 text-text-secondary">Legitimate interests</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 text-text-secondary">Financial accounting and payment records</td>
                    <td className="py-2.5 text-text-secondary">Legal obligation</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 text-text-secondary">Communications about the tournament</td>
                    <td className="py-2.5 text-text-secondary">Contract performance / legitimate interests</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-lg font-semibold mb-3">5. Marketing Communications</h2>
            <p>
              By submitting a registration through the Goality TMC platform,{" "}
              <strong>Goality Sport Group</strong> may use the contact information provided
              (name, email address, phone number) to send communications regarding:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-text-secondary">
              <li>Future tournaments and events organised or facilitated by Goality Sport Group</li>
              <li>Services offered by Goality Sport Group and its platform partners</li>
              <li>Promotional offers related to sports travel, accommodation, and event services</li>
            </ul>
            <p className="mt-3">
              This processing is based on the legitimate interests of Goality Sport Group in
              promoting its services to existing clients. You have the right to object to this
              processing at any time by contacting us at the address below.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-lg font-semibold mb-3">6. Data Sharing</h2>
            <p className="text-text-secondary">
              Personal data may be shared with:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-text-secondary">
              <li>Hotel and accommodation providers (for booking fulfilment)</li>
              <li>Transfer and transportation providers (for logistics coordination)</li>
              <li>Tournament officials and referees (for player/team identification)</li>
              <li>Supabase / PostgreSQL cloud database infrastructure (data hosting)</li>
            </ul>
            <p className="mt-2 text-text-secondary">
              We do not sell personal data to third parties.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-lg font-semibold mb-3">7. Data Retention</h2>
            <p className="text-text-secondary">
              Personal data is retained for a minimum of 3 years after the end of the
              tournament for accounting and legal compliance purposes. Medical and dietary
              data is deleted no later than 6 months after the tournament. You may request
              earlier deletion of your data subject to legal retention obligations.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-lg font-semibold mb-3">8. Your Rights</h2>
            <p className="mb-2 text-text-secondary">
              Under applicable data protection law (including GDPR where applicable), you have
              the right to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-text-secondary">
              <li>Access the personal data we hold about you</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Request deletion of your data (right to erasure)</li>
              <li>Object to processing based on legitimate interests</li>
              <li>Request restriction of processing</li>
              <li>Data portability (where applicable)</li>
            </ul>
            <p className="mt-2 text-text-secondary">
              To exercise any of these rights, contact us using the details in Section 9.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-lg font-semibold mb-3">9. Contact</h2>
            <div className="rounded-lg border border-border bg-white p-4 space-y-3 text-text-secondary">
              <div>
                <p className="font-semibold text-text-primary">Football Planet</p>
                <p>Data controller for tournament operations.</p>
                <p>Contact via the tournament registration platform.</p>
              </div>
              <div className="border-t border-border pt-3">
                <p className="font-semibold text-text-primary">Goality Sport Group</p>
                <p>
                  For questions regarding platform data processing or marketing communications:
                </p>
                <p className="mt-1">
                  <a
                    href="mailto:support@goality360.com"
                    className="text-navy hover:underline"
                  >
                    support@goality360.com
                  </a>
                </p>
              </div>
            </div>
          </section>

        </div>

        {/* Footer note */}
        <div className="mt-10 pt-6 border-t border-border text-xs text-text-secondary/60 text-center space-y-1">
          <p>
            Goality Tournament Management Core (Goality TMC) is developed by{" "}
            <strong className="text-text-secondary">Goality Sport Group</strong>.
          </p>
          <p>© {new Date().getFullYear()} Goality Sport Group. All rights reserved.</p>
        </div>

      </div>
    </div>
  );
}
