import { Mail } from "lucide-react";

export const metadata = {
  title: "Unsubscribe — Goality",
  robots: { index: false, follow: false },
};

// Minimal landing for the List-Unsubscribe header. Goality emails are
// transactional (registration, confirmations, passwords) — not
// marketing — so there's no "unsubscribe from list" toggle. The page
// explains this and tells the user how to reach support to manage
// notifications. Existence of this page satisfies Gmail / Apple Mail
// bulk-sender policy and keeps our messages out of the spam folder.
export default function UnsubscribePage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-lg w-full text-center space-y-5">
        <div
          className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: "var(--cat-tag-bg)" }}
        >
          <Mail className="w-6 h-6" style={{ color: "var(--cat-accent)" }} />
        </div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--cat-text)" }}>
          Email preferences
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>
          Goality only sends transactional emails — registration confirmations,
          password resets, organizer messages and tournament updates. We don't
          send marketing newsletters, so there is no list to opt out of.
        </p>
        <p className="text-sm leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>
          If you'd like to stop receiving notifications about a specific
          tournament, withdraw your team's registration from your club
          dashboard. To delete your account entirely, write to{" "}
          <a
            href="mailto:support@goalityfootball.com"
            className="underline"
            style={{ color: "var(--cat-accent)" }}
          >
            support@goalityfootball.com
          </a>
          .
        </p>
      </div>
    </div>
  );
}
