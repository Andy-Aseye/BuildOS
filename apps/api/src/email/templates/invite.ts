import { ctaButton, emailLayout, escapeHtml } from './_layout';

/**
 * Initial invite email (refactored from the inline string in EmailService).
 * Sent when the owner generates an invite link — the recipient does NOT yet
 * have a BuildOS account.
 */
export type InviteOpts = {
  to: string;
  inviterName: string;
  orgName: string;
  role: string;
  inviteUrl: string;
};

export function inviteEmail(opts: InviteOpts) {
  const safeInviter = escapeHtml(opts.inviterName);
  const safeOrg = escapeHtml(opts.orgName);
  const safeRole = escapeHtml(humanizeRole(opts.role));
  const body = `
    <h2 style="color:#0f172a;margin:0 0 16px;font-size:22px">You're invited to join ${safeOrg}</h2>
    <p style="color:#334155;line-height:1.6;margin:0 0 20px">
      ${safeInviter} has invited you to join <strong>${safeOrg}</strong> on BuildOS as <strong>${safeRole}</strong>.
    </p>
    ${ctaButton(opts.inviteUrl, 'Accept invitation')}
    <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:20px 0 0">
      This link expires in 7 days. If you weren't expecting this invitation, you can safely ignore this email.
    </p>
  `;
  return {
    subject: `You've been invited to ${opts.orgName} on BuildOS`,
    html: emailLayout({
      preheader: `${opts.inviterName} invited you to ${opts.orgName} as ${humanizeRole(opts.role)}.`,
      body,
    }),
  };
}

function humanizeRole(role: string): string {
  return role
    .toLowerCase()
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}
