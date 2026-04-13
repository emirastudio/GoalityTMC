import nodemailer from "nodemailer";

// ─── Transport ────────────────────────────────────────────────────────────────
const port = Number(process.env.SMTP_PORT ?? 587);
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure: port === 465,
  requireTLS: port === 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: { rejectUnauthorized: false },
});

const FROM    = process.env.SMTP_FROM ?? "Goality <goal@goality.app>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://goality.app";

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
  to, clubName, contactName, loginUrl,
}: {
  to: string;
  clubName: string;
  contactName?: string | null;
  loginUrl?: string;
}) {
  const name = contactName || "there";
  const url = loginUrl ?? `${APP_URL}/en/login`;

  await transporter.sendMail({
    from: FROM,
    to,
    subject: `Welcome to Goality — ${clubName} is ready 🎉`,
    text: `Hi ${name},\n\nWelcome to Goality! Your club "${clubName}" has been successfully registered.\n\nLog in at: ${url}\n\nGoality Team`,
    html: base({
      preheader: `Welcome to Goality, ${name}! Your club is ready.`,
      body: `
        ${h1("Welcome to Goality! 👋")}
        ${p(`Hi <strong>${name}</strong>, you're all set.`)}
        ${p(`Your club <strong>${clubName}</strong> has been successfully created on Goality. You can now complete your profile, find tournaments, and manage your teams — all in one place.`)}

        ${infoTable(
          infoRow("Club name", clubName) +
          infoRow("Account email", to) +
          infoRow("Platform", "Goality TMC")
        )}

        ${p("Here's what to do next:")}
        <ul style="margin:12px 0 0;padding-left:20px;font-size:15px;color:#374151;line-height:2;">
          <li>Complete your club profile (logo, website, contacts)</li>
          <li>Browse the tournament catalog</li>
          <li>Register your teams for events</li>
        </ul>
      `,
      cta: { label: "Open Club Dashboard →", url },
    }),
  });
}

// ─── 2. Password Reset ────────────────────────────────────────────────────────
export async function sendPasswordReset({
  to, toName, resetLink,
}: {
  to: string;
  toName: string;
  resetLink: string;
}) {
  await transporter.sendMail({
    from: FROM,
    to: `${toName} <${to}>`,
    subject: "Reset your Goality password",
    text: `Hi ${toName},\n\nClick the link to reset your password (valid for 1 hour):\n${resetLink}\n\nIf you didn't request this, ignore this email.\n\nGoality Team`,
    html: base({
      preheader: "Reset your Goality password — link valid for 1 hour.",
      body: `
        <div style="text-align:center;margin-bottom:8px;">
          <div style="display:inline-block;width:56px;height:56px;background:#fef3c7;border-radius:16px;
                      text-align:center;line-height:56px;font-size:26px;">🔑</div>
        </div>
        ${h1("Password Reset Request")}
        ${p(`Hi <strong>${toName}</strong>,`)}
        ${p("We received a request to reset the password for your Goality account. Click the button below to set a new password.")}
        ${muted("This link expires in <strong>1 hour</strong>. If you didn't request a reset, you can safely ignore this email — your password won't change.")}
      `,
      cta: { label: "Reset My Password", url: resetLink, color: "#0a0f1e" },
    }),
  });
}

// ─── 3. Club Invite (Manager / Coach) ────────────────────────────────────────
export async function sendClubInvite({
  to, clubName, inviteLink, inviterName,
}: {
  to: string;
  clubName: string;
  inviteLink: string;
  inviterName?: string | null;
}) {
  const inviter = inviterName ? `<strong>${inviterName}</strong>` : "the club administrator";

  await transporter.sendMail({
    from: FROM,
    to,
    subject: `You've been invited to join ${clubName} on Goality`,
    text: `You've been invited to join ${clubName} as a manager on Goality.\n\nAccept invitation: ${inviteLink}\n\nLink valid for 7 days.\n\nGoality Team`,
    html: base({
      preheader: `${inviter} invited you to join ${clubName} on Goality.`,
      body: `
        <div style="text-align:center;margin-bottom:8px;">
          <div style="display:inline-block;width:56px;height:56px;background:#e8f5e9;border-radius:16px;
                      text-align:center;line-height:56px;font-size:26px;">🤝</div>
        </div>
        ${h1("You're Invited!")}
        ${p(`${inviter} has invited you to join <strong>${clubName}</strong> as a manager on Goality.`)}
        ${p("Create your free account and you'll be able to manage teams, communicate with tournament organizers, and much more.")}
        ${infoTable(
          infoRow("Club", clubName) +
          infoRow("Role", "Team Manager / Coach") +
          infoRow("Link expires", "7 days from now")
        )}
      `,
      cta: { label: "Accept Invitation →", url: inviteLink },
    }),
  });
}

// ─── 4. Tournament Registration Received ─────────────────────────────────────
export async function sendRegistrationReceived({
  to, clubName, teamName, tournamentName, tournamentOrganizer,
}: {
  to: string;
  clubName: string;
  teamName: string;
  tournamentName: string;
  tournamentOrganizer?: string | null;
}) {
  await transporter.sendMail({
    from: FROM,
    to,
    subject: `Application received — ${tournamentName}`,
    text: `Hi ${clubName},\n\nYour registration for "${teamName}" in "${tournamentName}" has been received.\n\nThe organizer will review it shortly.\n\nGoality Team`,
    html: base({
      preheader: `Your application for ${tournamentName} has been received.`,
      body: `
        <div style="text-align:center;margin-bottom:8px;">
          <div style="display:inline-block;width:56px;height:56px;background:#e0f2fe;border-radius:16px;
                      text-align:center;line-height:56px;font-size:26px;">📋</div>
        </div>
        ${h1("Application Received")}
        ${p(`Hi <strong>${clubName}</strong>,`)}
        ${p(`Your registration for <strong>${teamName}</strong> in <strong>${tournamentName}</strong> has been successfully submitted and is now under review.`)}

        ${infoTable(
          infoRow("Club", clubName) +
          infoRow("Team", teamName) +
          infoRow("Tournament", tournamentName) +
          (tournamentOrganizer ? infoRow("Organizer", tournamentOrganizer) : "") +
          infoRow("Status", badge("Under Review", "#92400e", "#fef3c7"))
        )}

        ${p("The organizer will review your application and confirm or update your status. You'll receive an email notification as soon as there's an update.")}
        ${muted("You can check the status anytime in your club dashboard.")}
      `,
      cta: { label: "View Application Status →", url: `${APP_URL}/en/club/dashboard` },
    }),
  });
}

// ─── 5. Registration Confirmed ────────────────────────────────────────────────
export async function sendRegistrationConfirmed({
  to, clubName, teamName, tournamentName, tournamentSlug, notes,
}: {
  to: string;
  clubName: string;
  teamName: string;
  tournamentName: string;
  tournamentSlug?: string | null;
  notes?: string | null;
}) {
  const portalUrl = `${APP_URL}/en/team/overview`;

  await transporter.sendMail({
    from: FROM,
    to,
    subject: `✅ Confirmed — ${teamName} is in ${tournamentName}!`,
    text: `Hi ${clubName},\n\nGreat news! ${teamName} has been confirmed for ${tournamentName}.\n\n${notes ? `Note from organizer: ${notes}\n\n` : ""}Open your team portal: ${portalUrl}\n\nGoality Team`,
    html: base({
      preheader: `Great news! ${teamName} has been confirmed for ${tournamentName}.`,
      body: `
        <!-- Success banner -->
        <div style="background:linear-gradient(135deg,#064e3b,#065f46);border-radius:12px;
                    padding:20px 24px;margin-bottom:4px;text-align:center;">
          <div style="font-size:32px;margin-bottom:8px;">🎉</div>
          <p style="margin:0;font-size:18px;font-weight:800;color:#ffffff;">You're confirmed!</p>
          <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.7);">${teamName} has a spot in ${tournamentName}</p>
        </div>

        ${p(`Hi <strong>${clubName}</strong>,`)}
        ${p(`Great news — <strong>${teamName}</strong> has been officially confirmed for <strong>${tournamentName}</strong>! Your team is in.`)}

        ${infoTable(
          infoRow("Club", clubName) +
          infoRow("Team", teamName) +
          infoRow("Tournament", tournamentName) +
          infoRow("Status", badge("Confirmed", "#065f46", "#d1fae5"))
        )}

        ${notes ? `
        <!-- Organizer note -->
        <div style="margin-top:24px;padding:16px 20px;background:#f0fdf4;border-left:4px solid #10b981;border-radius:0 8px 8px 0;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#065f46;text-transform:uppercase;letter-spacing:0.5px;">
            Note from organizer
          </p>
          <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${notes}</p>
        </div>
        ` : ""}

        ${p("Open your team portal to access all tournament details, schedule, and communicate with the organizer.")}
      `,
      cta: { label: "Open Team Portal →", url: portalUrl, color: "#10b981" },
    }),
  });
}

// ─── 6. Registration Rejected ─────────────────────────────────────────────────
export async function sendRegistrationRejected({
  to, clubName, teamName, tournamentName, notes,
}: {
  to: string;
  clubName: string;
  teamName: string;
  tournamentName: string;
  notes?: string | null;
}) {
  await transporter.sendMail({
    from: FROM,
    to,
    subject: `Update on your application — ${tournamentName}`,
    text: `Hi ${clubName},\n\nUnfortunately, ${teamName}'s application for ${tournamentName} was not accepted at this time.\n\n${notes ? `Message from organizer: ${notes}\n\n` : ""}You can browse other tournaments at: ${APP_URL}/en/catalog\n\nGoality Team`,
    html: base({
      preheader: `An update on ${teamName}'s application for ${tournamentName}.`,
      body: `
        ${h1("Application Update")}
        ${p(`Hi <strong>${clubName}</strong>,`)}
        ${p(`We're sorry to let you know that <strong>${teamName}</strong>'s application for <strong>${tournamentName}</strong> was not accepted at this time. The organizer may have reached capacity or had other requirements.`)}

        ${infoTable(
          infoRow("Club", clubName) +
          infoRow("Team", teamName) +
          infoRow("Tournament", tournamentName) +
          infoRow("Status", badge("Not Accepted", "#991b1b", "#fee2e2"))
        )}

        ${notes ? `
        <!-- Organizer note -->
        <div style="margin-top:24px;padding:16px 20px;background:#fff7ed;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;">
            Message from organizer
          </p>
          <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${notes}</p>
        </div>
        ` : ""}

        ${p("Don't be discouraged — there are many great tournaments on Goality. Browse our catalog to find the right fit for your team.")}
      `,
      cta: { label: "Browse Other Tournaments →", url: `${APP_URL}/en/catalog`, color: "#6366f1" },
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
  await transporter.sendMail({
    from: FROM,
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
  await transporter.sendMail({
    from: FROM,
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
  await transporter.sendMail({
    from: FROM,
    to: FROM,
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

export async function sendNewQuestionNotification({
  teamName, subject, body, questionId,
}: {
  teamName: string; subject: string; body: string; questionId: number;
}) {
  await transporter.sendMail({
    from: FROM,
    to: FROM,
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
