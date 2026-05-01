import { ctaButton, emailLayout, escapeHtml } from './_layout';

/**
 * Member welcome (D2). Sent after a user accepts an invite link and their
 * BuildOS account is created — confirms the account exists, names the org
 * + role they're joining as, and links them to the dashboard.
 *
 * Distinct from `inviteEmail` (which fires when the invite is *issued* and
 * carries the accept-link). This one fires *after* acceptance succeeds.
 */
export type MemberWelcomeOpts = {
  to: string;
  name: string;
  orgName: string;
  role: string;
  dashboardUrl: string;
};

export function memberWelcomeEmail(opts: MemberWelcomeOpts) {
  const safeName = escapeHtml(opts.name);
  const safeOrg = escapeHtml(opts.orgName);
  const safeRole = escapeHtml(humanizeRole(opts.role));
  const body = `
    <h2 style="color:#0f172a;margin:0 0 16px;font-size:22px">Welcome aboard, ${safeName}</h2>
    <p style="color:#334155;line-height:1.6;margin:0 0 16px">
      Your BuildOS account is ready. You're now part of <strong>${safeOrg}</strong> as
      <strong>${safeRole}</strong>.
    </p>
    <p style="color:#334155;line-height:1.6;margin:0 0 20px">
      You can sign in to track project progress, log site updates, review
      drawings, and submit costs — directly or via WhatsApp on the field.
    </p>
    ${ctaButton(opts.dashboardUrl, 'Open dashboard')}
  `;
  return {
    subject: `You're in — ${opts.orgName} on BuildOS`,
    html: emailLayout({
      preheader: `You've joined ${opts.orgName} as ${humanizeRole(opts.role)}.`,
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
