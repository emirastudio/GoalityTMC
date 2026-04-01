import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.SMTP_FROM ?? "Kings Cup <support@kingscup.ee>";

export async function sendMessageNotification({
  to, toName, subject, body, teamName,
}: { to: string; toName: string; subject: string; body: string; teamName: string }) {
  await transporter.sendMail({
    from: FROM,
    to: `${toName} <${to}>`,
    subject: `[Kings Cup] ${subject}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#0f2044;padding:20px 24px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0;font-size:18px">Kings Cup</h2>
          <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Message for ${teamName}</p>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;background:#fff">
          <h3 style="margin:0 0 16px;color:#0f2044">${subject}</h3>
          <div style="color:#374151;line-height:1.6;white-space:pre-wrap">${body}</div>
          <div style="margin-top:24px;padding-top:16px;border-top:1px solid #f3f4f6">
            <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://goality.kingscup.ee"}/en/team/inbox"
               style="background:#0f2044;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px">
              Open Inbox
            </a>
          </div>
        </div>
        <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:16px">
          Kings Cup · Organised by Football Planet · Powered by Goality TMC
        </p>
      </div>
    `,
  });
}

export async function sendQuestionConfirmation({
  to, toName, subject, teamName,
}: { to: string; toName: string; subject: string; teamName: string }) {
  await transporter.sendMail({
    from: FROM,
    to: `${toName} <${to}>`,
    subject: `[Kings Cup] Your question received: ${subject}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#0f2044;padding:20px 24px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0;font-size:18px">Kings Cup</h2>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;background:#fff">
          <p style="color:#374151">Hi ${toName},</p>
          <p style="color:#374151">We received your question from <strong>${teamName}</strong>: <em>${subject}</em></p>
          <p style="color:#374151">We will get back to you as soon as possible.</p>
        </div>
        <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:16px">
          Kings Cup · Organised by Football Planet · Powered by Goality TMC
        </p>
      </div>
    `,
  });
}

export async function sendDeletionRequest({
  clubName, contactName, contactEmail, teamNames,
}: { clubName: string; contactName: string; contactEmail: string; teamNames: string[] }) {
  await transporter.sendMail({
    from: FROM,
    to: FROM,
    subject: `[Kings Cup] Account deletion request — ${clubName}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#dc2626">Account Deletion Request</h2>
        <p><strong>Club:</strong> ${clubName}</p>
        <p><strong>Contact:</strong> ${contactName} (${contactEmail})</p>
        <p><strong>Teams:</strong> ${teamNames.join(", ")}</p>
        <p style="color:#6b7280;font-size:13px">Please process this deletion request manually in the admin panel.</p>
      </div>
    `,
  });
}

export async function sendPasswordReset({
  to, toName, resetLink,
}: { to: string; toName: string; resetLink: string }) {
  await transporter.sendMail({
    from: FROM,
    to: `${toName} <${to}>`,
    subject: `[Kings Cup] Password reset request`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#0f2044;padding:20px 24px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0;font-size:18px">Kings Cup</h2>
          <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Password Reset</p>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;background:#fff">
          <p style="color:#374151">Hi ${toName},</p>
          <p style="color:#374151">We received a request to reset the password for your Kings Cup account.</p>
          <p style="color:#374151">Click the button below to set a new password. This link is valid for <strong>1 hour</strong>.</p>
          <div style="margin-top:24px;margin-bottom:24px">
            <a href="${resetLink}"
               style="background:#0f2044;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600">
              Reset Password
            </a>
          </div>
          <p style="color:#6b7280;font-size:13px">If you did not request a password reset, you can safely ignore this email. Your password will not change.</p>
          <p style="color:#6b7280;font-size:13px">Link: <a href="${resetLink}" style="color:#0f2044">${resetLink}</a></p>
        </div>
        <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:16px">
          Kings Cup · Organised by Football Planet · Powered by Goality TMC
        </p>
      </div>
    `,
  });
}

export async function sendNewQuestionNotification({
  teamName, subject, body, questionId,
}: { teamName: string; subject: string; body: string; questionId: number }) {
  await transporter.sendMail({
    from: FROM,
    to: FROM,
    subject: `[Kings Cup] New question from ${teamName}: ${subject}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#0f2044">New Question from Team</h2>
        <p><strong>Team:</strong> ${teamName}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <div style="margin-top:12px;padding:16px;background:#f9fafb;border-radius:8px;white-space:pre-wrap;color:#374151">${body}</div>
        <p style="color:#6b7280;font-size:13px;margin-top:16px">Question ID: #${questionId} — Reply in the admin panel.</p>
      </div>
    `,
  });
}
