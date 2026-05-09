import { Resend } from "resend";
import { EMAIL_STRINGS, t, normaliseLocale } from "./email-i18n";

// ─── Transport ────────────────────────────────────────────────────────────────
const resend = new Resend(process.env.RESEND_API_KEY);

const FROM    = process.env.EMAIL_FROM ?? "Goality <noreply@send.goalityfootball.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://goalityfootball.com";

// Recipient for GDPR notices and internal admin alerts.
const PRIVACY_TO = process.env.PRIVACY_EMAIL ?? "goal@goalityfootball.com";

async function send(opts: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}) {
  const { error } = await resend.emails.send({
    from: FROM,
    to: Array.isArray(opts.to) ? opts.to : [opts.to],
    subject: opts.subject,
    html: opts.html,
    ...(opts.text ? { text: opts.text } : {}),
    ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
  });
  if (error) throw error;
}

// ─── Premium Base Template ────────────────────────────────────────────────────
function base({
  preheader,
  body,
  cta,
}: {
  preheader: string;
  body: string;
  cta?: { label: string; url: string; color?: string };
}) {
  const ctaColor = cta?.color ?? "#e8b84b";
  const ctaTextColor = cta?.color ? "#ffffff" : "#0a0f1e";

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="color-scheme" content="light"/>
  <title>${preheader}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

  <!-- Preheader (hidden preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;color:#f0f2f5;font-size:1px;">
    ${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:580px;" cellpadding="0" cellspacing="0">

        <!-- ── LOGO HEADER ── -->
        <tr>
          <td style="padding:0 0 8px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
              style="background:linear-gradient(135deg,#0a0f1e 0%,#111827 100%);border-radius:16px 16px 0 0;overflow:hidden;">
              <tr>
                <td style="padding:28px 36px;">
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="vertical-align:middle;">
                        <!-- Logo mark -->
                        <div style="display:inline-block;width:38px;height:38px;background:#e8b84b;border-radius:10px;
                                    text-align:center;line-height:38px;font-size:20px;font-weight:900;
                                    color:#0a0f1e;margin-right:12px;vertical-align:middle;">G</div>
                      </td>
                      <td style="vertical-align:middle;">
                        <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Goality</span>
                        <span style="display:block;font-size:11px;color:rgba(255,255,255,0.45);
                                     letter-spacing:2px;text-transform:uppercase;margin-top:1px;">
                          Tournament Management
                        </span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Gold accent line -->
              <tr><td style="height:3px;background:linear-gradient(90deg,#e8b84b,#f5d07a,#e8b84b);"></td></tr>
            </table>
          </td>
        </tr>

        <!-- ── CONTENT CARD ── -->
        <tr>
          <td>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
              style="background:#ffffff;border-radius:0 0 16px 16px;overflow:hidden;
                     box-shadow:0 4px 24px rgba(0,0,0,0.08);">
              <tr>
                <td style="padding:40px 36px 32px;">
                  ${body}

                  ${cta ? `
                  <!-- CTA Button -->
                  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0 0;">
                    <tr>
                      <td style="border-radius:10px;background:${ctaColor};">
                        <a href="${cta.url}"
                           style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;
                                  color:${ctaTextColor};text-decoration:none;border-radius:10px;
                                  letter-spacing:0.2px;">
                          ${cta.label}
                        </a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">
                    Or copy this link:
                    <a href="${cta.url}" style="color:#6b7280;word-break:break-all;">${cta.url}</a>
                  </p>
                  ` : ""}
                </td>
              </tr>

              <!-- Divider -->
              <tr><td style="height:1px;background:#f3f4f6;"></td></tr>

              <!-- Footer -->
              <tr>
                <td style="padding:20px 36px;background:#fafafa;border-radius:0 0 16px 16px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                          You're receiving this because you have an account on
                          <a href="${APP_URL}" style="color:#6b7280;">Goality</a>.
                          If you didn't expect this email, you can safely ignore it.
                        </p>
                        <p style="margin:8px 0 0;font-size:11px;color:#d1d5db;">
                          © ${new Date().getFullYear()} Goality · Tournament Management Platform
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

            </table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`;
}

// Helper: section heading
function h1(text: string) {
  return `<h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0a0f1e;letter-spacing:-0.5px;">${text}</h1>`;
}
function p(text: string, style = "") {
  return `<p style="margin:16px 0 0;font-size:15px;color:#374151;line-height:1.7;${style}">${text}</p>`;
}
function muted(text: string) {
  return `<p style="margin:12px 0 0;font-size:13px;color:#6b7280;line-height:1.6;">${text}</p>`;
}
function badge(text: string, color: string, bg: string) {
  return `<span style="display:inline-block;padding:4px 12px;border-radius:999px;
    font-size:12px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;
    color:${color};background:${bg};">${text}</span>`;
}
function infoRow(label: string, value: string) {
  return `<tr>
    <td style="padding:8px 0;font-size:13px;color:#6b7280;width:40%;vertical-align:top;">${label}</td>
    <td style="padding:8px 0;font-size:13px;color:#0a0f1e;font-weight:600;">${value}</td>
  </tr>`;
}
function infoTable(rows: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
    style="margin-top:24px;border-top:2px solid #f3f4f6;border-bottom:2px solid #f3f4f6;padding:4px 0;">
    <tbody>${rows}</tbody>
  </table>`;
}

// ─── 1. Welcome Email ─────────────────────────────────────────────────────────
export async function sendWelcomeEmail({
  to, clubName, contactName, loginUrl, locale: rawLocale,
}: {
  to: string;
  clubName: string;
  contactName?: string | null;
  loginUrl?: string;
  locale?: string | null;
}) {
  const locale = normaliseLocale(rawLocale);
  const name = contactName || "there";
  const url = loginUrl ?? `${APP_URL}/${locale}/login`;
  const W = EMAIL_STRINGS.welcome;

  await send({
    to,
    subject: t(W, "subject", locale, { clubName }),
    text: `${t(W, "hi", locale, { name })}\n\n${stripTags(t(W, "body1", locale, { clubName }))}\n\n${url}\n\n${t(W, "signature", locale)}`,
    html: base({
      preheader: t(W, "preheader", locale),
      body: `
        ${h1("Goality")}
        ${p(t(W, "hi", locale, { name }))}
        ${p(t(W, "body1", locale, { clubName }))}
      `,
      cta: { label: t(W, "cta", locale), url },
    }),
  });
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

// ─── 2. Password Reset ────────────────────────────────────────────────────────
export async function sendPasswordReset({
  to, toName, resetLink, locale: rawLocale,
}: {
  to: string;
  toName: string;
  resetLink: string;
  locale?: string | null;
}) {
  const locale = normaliseLocale(rawLocale);
  const P = EMAIL_STRINGS.passwordReset;
  await send({
    to: `${toName} <${to}>`,
    subject: t(P, "subject", locale),
    text: `${stripTags(t(P, "body1", locale, { name: toName }))}\n\n${resetLink}\n\n${stripTags(t(P, "expires", locale))}`,
    html: base({
      preheader: t(P, "preheader", locale),
      body: `
        <div style="text-align:center;margin-bottom:8px;">
          <div style="display:inline-block;width:56px;height:56px;background:#fef3c7;border-radius:16px;
                      text-align:center;line-height:56px;font-size:26px;">🔑</div>
        </div>
        ${h1(t(P, "title", locale))}
        ${p(t(P, "body1", locale, { name: toName }))}
        ${muted(t(P, "expires", locale))}
      `,
      cta: { label: t(P, "cta", locale), url: resetLink, color: "#0a0f1e" },
    }),
  });
}

// ─── 2b. Email Verification Code (registration) ──────────────────────────────
// Sent before a clubUser is created so we know the email is real and the
// person registering has access to it (organizers send tournament info
// there). The code is also visible in the email subject for quick scan.
export async function sendEmailVerificationCode({
  to,
  code,
  locale: rawLocale,
}: {
  to: string;
  code: string;
  locale?: string | null;
}) {
  const locale = normaliseLocale(rawLocale);
  const V = EMAIL_STRINGS.verifyCode;
  await send({
    to,
    subject: t(V, "subject", locale, { code }),
    text: t(V, "fallbackText", locale, { code }),
    html: base({
      preheader: t(V, "preheader", locale, { code }),
      body: `
        <div style="text-align:center;margin-bottom:8px;">
          <div style="display:inline-block;width:56px;height:56px;background:#dcfce7;border-radius:16px;
                      text-align:center;line-height:56px;font-size:26px;">✉️</div>
        </div>
        ${h1(t(V, "title", locale))}
        ${p(t(V, "body1", locale))}
        <div style="margin:24px 0;text-align:center;">
          <div style="display:inline-block;font-family:'Courier New',monospace;font-size:36px;letter-spacing:12px;
                      font-weight:700;color:#0a0f1e;background:#f0f2f5;border-radius:12px;padding:18px 28px;">
            ${code}
          </div>
        </div>
        ${muted(t(V, "expires", locale))}
      `,
    }),
  });
}

// ─── 2c. New coach joined the club (admin-side notification) ─────────────────
// Sent to every club admin (clubUsers with team_id IS NULL) when a new
// coach signs up for one of the club's teams via the public registration
// flow. The coach gets full access immediately — this email is purely a
// moderation hint so the admin can verify the person is who they claim
// and either approve or kick via /club/dashboard.
export async function sendCoachJoinedNotification({
  to,
  clubName,
  coachName,
  coachEmail,
  teamLabel,
  dashboardLink,
  locale: rawLocale,
}: {
  to: string;
  clubName: string;
  coachName: string | null;
  coachEmail: string;
  teamLabel: string;
  dashboardLink: string;
  locale?: string | null;
}) {
  const locale = normaliseLocale(rawLocale);
  const C = EMAIL_STRINGS.coachJoined;
  const who = coachName ? `${coachName} (${coachEmail})` : coachEmail;
  const coach = coachName ?? coachEmail;
  await send({
    to,
    subject: t(C, "subject", locale, { clubName, who }),
    text: `${stripTags(t(C, "body", locale, { coach, clubName, teamLabel }))}\n\n${stripTags(t(C, "note", locale))}\n\n${dashboardLink}`,
    html: base({
      preheader: t(C, "preheader", locale, { who, clubName }),
      body: `
        <div style="text-align:center;margin-bottom:8px;">
          <div style="display:inline-block;width:56px;height:56px;background:#dbeafe;border-radius:16px;
                      text-align:center;line-height:56px;font-size:26px;">👤</div>
        </div>
        ${h1(t(C, "title", locale))}
        ${p(t(C, "body", locale, { coach, clubName, teamLabel }))}
        ${p(`${t(C, "emailLabel", locale)}: <a href="mailto:${coachEmail}" style="color:#0a0f1e;">${coachEmail}</a>`)}
        ${muted(t(C, "note", locale))}
      `,
      cta: { label: t(C, "cta", locale), url: dashboardLink, color: "#0a0f1e" },
    }),
  });
}

// ─── 3. Club Invite (Manager / Coach) ────────────────────────────────────────
export async function sendClubInvite({
  to, clubName, inviteLink, inviterName, locale: rawLocale,
}: {
  to: string;
  clubName: string;
  inviteLink: string;
  inviterName?: string | null;
  locale?: string | null;
}) {
  const locale = normaliseLocale(rawLocale);
  const I = EMAIL_STRINGS.clubInvite;
  const inviter = inviterName ? `<strong>${inviterName}</strong>` : (locale === "ru" ? "администратор клуба" : locale === "et" ? "klubi haldur" : locale === "es" ? "el administrador del club" : "the club administrator");

  await send({
    to,
    subject: t(I, "subject", locale, { clubName }),
    text: `${stripTags(t(I, "body", locale, { inviter: inviterName ?? "—", clubName }))}\n\n${inviteLink}\n\n${t(I, "expires", locale)}`,
    html: base({
      preheader: t(I, "preheader", locale, { clubName }),
      body: `
        <div style="text-align:center;margin-bottom:8px;">
          <div style="display:inline-block;width:56px;height:56px;background:#e8f5e9;border-radius:16px;
                      text-align:center;line-height:56px;font-size:26px;">🤝</div>
        </div>
        ${h1(t(I, "title", locale, { clubName }))}
        ${p(t(I, "body", locale, { inviter, clubName }))}
        ${muted(t(I, "expires", locale))}
      `,
      cta: { label: t(I, "cta", locale), url: inviteLink },
    }),
  });
}

// ─── Org admin invite (Pro+Elite multi-admin) ─────────────────────────────────
export async function sendOrgAdminInvite({
  to, orgName, inviteLink, inviterName, locale: rawLocale,
}: {
  to: string;
  orgName: string;
  inviteLink: string;
  inviterName?: string | null;
  locale?: string | null;
}) {
  const locale = normaliseLocale(rawLocale);
  const O = EMAIL_STRINGS.orgAdminInvite;
  const inviter = inviterName ? `<strong>${inviterName}</strong>` : (locale === "ru" ? "администратор" : locale === "et" ? "haldur" : locale === "es" ? "un administrador" : "An administrator");
  await send({
    to,
    subject: t(O, "subject", locale, { orgName }),
    text: `${stripTags(t(O, "body", locale, { inviter: inviterName ?? "—", orgName }))}\n\n${inviteLink}\n\n${t(O, "expires", locale)}`,
    html: base({
      preheader: t(O, "preheader", locale, { orgName }),
      body: `
        <div style="text-align:center;margin-bottom:8px;">
          <div style="display:inline-block;width:56px;height:56px;background:#eef2ff;border-radius:16px;
                      text-align:center;line-height:56px;font-size:26px;">🛡️</div>
        </div>
        ${h1(t(O, "title", locale))}
        ${p(t(O, "body", locale, { inviter, orgName }))}
        ${muted(t(O, "expires", locale))}
      `,
      cta: { label: t(O, "cta", locale), url: inviteLink },
    }),
  });
}

// ─── 4. Tournament Registration Received ─────────────────────────────────────
export async function sendRegistrationReceived({
  to, clubName, teamName, tournamentName, tournamentOrganizer, locale: rawLocale,
}: {
  to: string;
  clubName: string;
  teamName: string;
  tournamentName: string;
  tournamentOrganizer?: string | null;
  locale?: string | null;
}) {
  // tournamentOrganizer reserved for future surface in the meta block —
  // currently the body doesn't reference it, so just void to keep eslint
  // happy without a noop assignment.
  void tournamentOrganizer;
  const locale = normaliseLocale(rawLocale);
  const R = EMAIL_STRINGS.regReceived;
  await send({
    to,
    subject: t(R, "subject", locale, { tournamentName }),
    text: `${stripTags(t(R, "body", locale, { clubName, teamName, tournamentName }))}\n\n${stripTags(t(R, "body2", locale))}`,
    html: base({
      preheader: t(R, "preheader", locale, { tournamentName }),
      body: `
        <div style="text-align:center;margin-bottom:8px;">
          <div style="display:inline-block;width:56px;height:56px;background:#e0f2fe;border-radius:16px;
                      text-align:center;line-height:56px;font-size:26px;">📋</div>
        </div>
        ${h1(t(R, "title", locale))}
        ${p(t(R, "body", locale, { clubName, teamName, tournamentName }))}
        ${muted(t(R, "body2", locale))}
      `,
      cta: { label: t(R, "cta", locale), url: `${APP_URL}/${locale}/team/overview` },
    }),
  });
}

// ─── 5. Registration Confirmed ────────────────────────────────────────────────
export async function sendRegistrationConfirmed({
  to, clubName, teamName, tournamentName, tournamentSlug, notes, locale: rawLocale,
}: {
  to: string;
  clubName: string;
  teamName: string;
  tournamentName: string;
  tournamentSlug?: string | null;
  notes?: string | null;
  locale?: string | null;
}) {
  void tournamentSlug;
  const locale = normaliseLocale(rawLocale);
  const C = EMAIL_STRINGS.regConfirmed;
  const portalUrl = `${APP_URL}/${locale}/team/overview`;

  await send({
    to,
    subject: t(C, "subject", locale, { teamName, tournamentName }),
    text: `${stripTags(t(C, "body2", locale, { teamName, tournamentName }))}\n\n${notes ? `${t(C, "noteLabel", locale)}: ${notes}\n\n` : ""}${portalUrl}`,
    html: base({
      preheader: t(C, "preheader", locale, { teamName, tournamentName }),
      body: `
        <!-- Success banner -->
        <div style="background:linear-gradient(135deg,#064e3b,#065f46);border-radius:12px;
                    padding:20px 24px;margin-bottom:4px;text-align:center;">
          <div style="font-size:32px;margin-bottom:8px;">🎉</div>
          <p style="margin:0;font-size:18px;font-weight:800;color:#ffffff;">${t(C, "bannerTitle", locale)}</p>
          <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.7);">${t(C, "bannerSub", locale, { teamName, tournamentName })}</p>
        </div>

        ${p(t(C, "body1", locale, { clubName }))}
        ${p(t(C, "body2", locale, { teamName, tournamentName }))}

        ${infoTable(
          infoRow(t(C, "rowClub", locale), clubName) +
          infoRow(t(C, "rowTeam", locale), teamName) +
          infoRow(t(C, "rowTournament", locale), tournamentName) +
          infoRow(t(C, "rowStatus", locale), badge(t(C, "statusBadge", locale), "#065f46", "#d1fae5"))
        )}

        ${notes ? `
        <!-- Organizer note -->
        <div style="margin-top:24px;padding:16px 20px;background:#f0fdf4;border-left:4px solid #10b981;border-radius:0 8px 8px 0;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#065f46;text-transform:uppercase;letter-spacing:0.5px;">
            ${t(C, "noteLabel", locale)}
          </p>
          <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${notes}</p>
        </div>
        ` : ""}

        ${p(t(C, "footer", locale))}
      `,
      cta: { label: t(C, "cta", locale), url: portalUrl, color: "#10b981" },
    }),
  });
}

// ─── 6. Registration Rejected ─────────────────────────────────────────────────
export async function sendRegistrationRejected({
  to, clubName, teamName, tournamentName, notes, locale: rawLocale,
}: {
  to: string;
  clubName: string;
  teamName: string;
  tournamentName: string;
  notes?: string | null;
  locale?: string | null;
}) {
  const locale = normaliseLocale(rawLocale);
  const J = EMAIL_STRINGS.regRejected;
  await send({
    to,
    subject: t(J, "subject", locale, { tournamentName }),
    text: `${stripTags(t(J, "body", locale, { clubName, teamName, tournamentName }))}\n\n${notes ? `${t(J, "noteLabel", locale)}: ${notes}\n\n` : ""}${APP_URL}/${locale}/catalog`,
    html: base({
      preheader: t(J, "preheader", locale, { teamName, tournamentName }),
      body: `
        ${h1(t(J, "title", locale))}
        ${p(t(J, "body", locale, { clubName, teamName, tournamentName }))}

        ${notes ? `
        <!-- Organizer note -->
        <div style="margin-top:24px;padding:16px 20px;background:#fff7ed;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;">
            ${t(J, "noteLabel", locale)}
          </p>
          <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${notes}</p>
        </div>
        ` : ""}

        ${p(t(J, "body2", locale))}
      `,
      cta: { label: t(J, "cta", locale), url: `${APP_URL}/${locale}/catalog`, color: "#6366f1" },
    }),
  });
}

// ─── 7. Message from Organizer ────────────────────────────────────────────────
export async function sendOrganizerMessage({
  to, toName, clubName, teamName, subject, body: msgBody, tournamentName,
}: {
  to: string;
  toName: string;
  clubName: string;
  teamName: string;
  subject: string;
  body: string;
  tournamentName?: string | null;
}) {
  await send({
    to: `${toName} <${to}>`,
    subject: `Message from organizer: ${subject}`,
    text: `Hi ${toName},\n\nYou have a new message from the organizer.\n\n${subject}\n\n${msgBody}\n\nOpen inbox: ${APP_URL}/en/team/inbox\n\nGoality Team`,
    html: base({
      preheader: `New message from the organizer: ${subject}`,
      body: `
        <div style="text-align:center;margin-bottom:8px;">
          <div style="display:inline-block;width:56px;height:56px;background:#ede9fe;border-radius:16px;
                      text-align:center;line-height:56px;font-size:26px;">💬</div>
        </div>
        ${h1("New Message")}
        ${p(`Hi <strong>${toName}</strong>,`)}
        ${p("You have a new message from the tournament organizer.")}

        ${infoTable(
          infoRow("Team", teamName) +
          (tournamentName ? infoRow("Tournament", tournamentName) : "")
        )}

        <!-- Message block -->
        <div style="margin-top:24px;padding:20px 24px;background:#f8f9fa;border-radius:12px;
                    border:1px solid #e5e7eb;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#6b7280;
                     text-transform:uppercase;letter-spacing:0.5px;">Subject</p>
          <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#0a0f1e;">${subject}</p>
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#6b7280;
                     text-transform:uppercase;letter-spacing:0.5px;">Message</p>
          <div style="font-size:15px;color:#374151;line-height:1.7;white-space:pre-wrap;">${msgBody}</div>
        </div>

        ${muted("Reply by opening your team inbox on Goality.")}
      `,
      cta: { label: "Open Inbox →", url: `${APP_URL}/en/team/inbox`, color: "#6366f1" },
    }),
  });
}

// ─── Legacy aliases (backward compat) ────────────────────────────────────────
export async function sendMessageNotification({
  to, toName, subject, body, teamName,
}: {
  to: string; toName: string; subject: string; body: string; teamName: string;
}) {
  return sendOrganizerMessage({ to, toName, clubName: "", teamName, subject, body });
}

export async function sendQuestionConfirmation({
  to, toName, subject, teamName,
}: {
  to: string; toName: string; subject: string; teamName: string;
}) {
  await send({
    to: `${toName} <${to}>`,
    subject: `Question received: ${subject}`,
    text: `Hi ${toName},\n\nWe received your question from ${teamName}: "${subject}".\nWe'll get back to you shortly.\n\nGoality Team`,
    html: base({
      preheader: `Your question has been received — we'll respond shortly.`,
      body: `
        ${h1("Question Received")}
        ${p(`Hi <strong>${toName}</strong>,`)}
        ${p(`We received your question from <strong>${teamName}</strong>:`)}
        <div style="margin-top:16px;padding:16px 20px;background:#f8f9fa;border-radius:10px;border:1px solid #e5e7eb;">
          <p style="margin:0;font-size:15px;font-style:italic;color:#374151;">"${subject}"</p>
        </div>
        ${p("The organizer will get back to you as soon as possible.")}
      `,
      cta: { label: "View Team Inbox →", url: `${APP_URL}/en/team/inbox`, color: "#0a0f1e" },
    }),
  });
}

export async function sendDeletionRequest({
  clubName, contactName, contactEmail, teamNames,
}: {
  clubName: string; contactName: string; contactEmail: string; teamNames: string[];
}) {
  await send({
    to: PRIVACY_TO,
    subject: `Account deletion request — ${clubName}`,
    html: base({
      preheader: `Deletion request from ${clubName}`,
      body: `
        ${h1("Account Deletion Request")}
        ${infoTable(
          infoRow("Club", clubName) +
          infoRow("Contact", `${contactName} (${contactEmail})`) +
          infoRow("Teams", teamNames.join(", ") || "None")
        )}
        ${p("Please process this deletion request manually in the admin panel.")}
      `,
    }),
  });
}

export async function sendOrgDeletionRequest({
  orgName, orgSlug, contactName, contactEmail, tournamentCount, activeTournaments,
}: {
  orgName: string;
  orgSlug: string;
  contactName: string;
  contactEmail: string;
  tournamentCount: number;
  activeTournaments: string[];
}) {
  await send({
    to: PRIVACY_TO,
    replyTo: contactEmail,
    subject: `Organisation deletion request — ${orgName}`,
    html: base({
      preheader: `Deletion request from ${orgName} (${orgSlug})`,
      body: `
        ${h1("Organisation Deletion Request")}
        ${infoTable(
          infoRow("Organisation", `${orgName} (/${orgSlug})`) +
          infoRow("Requested by", `${contactName} (${contactEmail})`) +
          infoRow("Tournaments total", String(tournamentCount)) +
          infoRow("Active tournaments", activeTournaments.join(", ") || "None")
        )}
        ${p("Verify the requester's identity before proceeding. Accounting records (invoices, Stripe history) must be retained for 7 years per Estonian Accounting Act § 12 — delete only personal data and operational records.")}
      `,
    }),
  });
}

export async function sendNewQuestionNotification({
  teamName, subject, body, questionId,
}: {
  teamName: string; subject: string; body: string; questionId: number;
}) {
  await send({
    to: PRIVACY_TO,
    subject: `New question from ${teamName}: ${subject}`,
    html: base({
      preheader: `New question #${questionId} from ${teamName}`,
      body: `
        ${h1("New Question from Team")}
        ${infoTable(
          infoRow("Team", teamName) +
          infoRow("Question #", String(questionId)) +
          infoRow("Subject", subject)
        )}
        <div style="margin-top:20px;padding:16px 20px;background:#f8f9fa;border-radius:10px;border:1px solid #e5e7eb;
                    font-size:14px;color:#374151;line-height:1.7;white-space:pre-wrap;">${body}</div>
        ${muted("Reply in the admin panel.")}
      `,
    }),
  });
}

// ─── Draw Show: share-link receipt ────────────────────────────────────────────
//
// Sent immediately after the standalone /draw wizard creates a draw.
// One-click "open my show" CTA + a copyable share link, plus the
// scheduled-premiere note when the user picked a future start time.
export async function sendDrawShareLink({
  to,
  drawId,
  tournamentName,
  divisionName,
  scheduledAt,
  scheduledAtTz,
  organization,
}: {
  to: string;
  drawId: string;
  tournamentName?: string | null;
  divisionName?: string | null;
  scheduledAt?: string | null;
  scheduledAtTz?: string | null;
  organization?: string | null;
}) {
  const presentUrl = `${APP_URL}/en/draw/present?s=${drawId}`;
  const newDrawUrl = `${APP_URL}/en/draw`;
  const headline = tournamentName?.trim() || "Your Draw Show";
  const sub = divisionName?.trim();
  const scheduledLabel = scheduledAt
    ? new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
        timeZone: scheduledAtTz ?? "UTC",
      }).format(new Date(scheduledAt))
    : null;

  await send({
    to,
    subject: scheduledAt
      ? `🎬 ${headline}${sub ? " · " + sub : ""} — premiere link inside`
      : `🎬 ${headline}${sub ? " · " + sub : ""} — your draw is ready`,
    text:
      `Your Draw Show link: ${presentUrl}\n\n` +
      (scheduledAt
        ? `Premiere starts: ${scheduledLabel}\n\n`
        : "") +
      `Open the link to run the show on a big screen, share it with teams, ` +
      `or post it on socials. Same link, same show — every time.\n\n` +
      `Need another draw? ${newDrawUrl}\n\n` +
      `— Goality TMC`,
    html: base({
      preheader: scheduledAt
        ? `Your Draw Show is scheduled. Share the link.`
        : `Your Draw Show link is ready to share.`,
      body: `
        ${h1(`🎬 ${headline} is ready`)}
        ${sub ? p(`<strong>Division:</strong> ${sub}`) : ""}
        ${p(
          scheduledAt
            ? `Visitors who open the link before the premiere see a beautiful countdown, then the show starts automatically.`
            : `Open the link below to run the show on the big screen, share it with teams, or post it on socials.`,
        )}

        ${infoTable(
          (scheduledAt
            ? infoRow("Premiere", scheduledLabel ?? "—")
            : infoRow("Status", "Live · ready to play")) +
          (organization ? infoRow("Organization", organization) : "") +
          infoRow("Share link", `<a href="${presentUrl}" style="color:#0ea5e9;text-decoration:none;">${presentUrl}</a>`),
        )}

        ${p(
          `Same link, same show — every time. Bookmark it or send to your team chat.`,
          "color:#6b7280;font-size:13px;",
        )}
      `,
      cta: { label: "Open my Draw Show →", url: presentUrl, color: "#2BFEBA" },
    }),
  });
}


// ─── Referee match assignment ─────────────────────────────────────────────────
export async function sendRefereeMatchAssignment({
  to,
  refereeName,
  tournamentName,
  matchTime,
  homeTeam,
  awayTeam,
  venue,
  panelUrl,
  role,
}: {
  to: string;
  refereeName: string;
  tournamentName: string;
  matchTime: string | null;
  homeTeam: string | null;
  awayTeam: string | null;
  venue?: string | null;
  panelUrl?: string | null;
  role?: string | null;
}) {
  const home = homeTeam ?? "TBD";
  const away = awayTeam ?? "TBD";
  const fixture = `${home} vs ${away}`;
  const roleLine = role ? ` (${role})` : "";
  const subject = `Match assignment${roleLine} — ${fixture}${matchTime ? ` (${matchTime})` : ""}`;

  await send({
    to: `${refereeName} <${to}>`,
    subject,
    text:
      `Hi ${refereeName},\n\n` +
      `You have been assigned${roleLine} for the following match:\n\n` +
      `Tournament: ${tournamentName}\n` +
      `Match: ${fixture}\n` +
      (matchTime ? `Time: ${matchTime}\n` : "") +
      (venue ? `Venue: ${venue}\n` : "") +
      (panelUrl ? `\nOpen your referee panel: ${panelUrl}\n` : "") +
      `\nGoality Team`,
    html: base({
      preheader: `Match assignment: ${fixture}${matchTime ? ` at ${matchTime}` : ""}`,
      body: `
        ${h1("New match assignment 🟩")}
        ${p(`Hi <strong>${refereeName}</strong>, you've been assigned${roleLine} to officiate the following match.`)}
        ${infoTable(
          infoRow("Tournament", tournamentName) +
          infoRow("Match", fixture) +
          (matchTime ? infoRow("Time", matchTime) : "") +
          (venue ? infoRow("Venue", venue) : "") +
          (role ? infoRow("Role", role) : "")
        )}
        ${panelUrl ? p("Use the button below to open your mobile referee panel — log results, mark availability, and view all your assigned fixtures.") : ""}
      `,
      cta: panelUrl ? { label: "Open Referee Panel →", url: panelUrl } : undefined,
    }),
  });
}
