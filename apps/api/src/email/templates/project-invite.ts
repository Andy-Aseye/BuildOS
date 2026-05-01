import { ctaButton, emailLayout, escapeHtml } from './_layout';

/**
 * Project invite (D3). Sent when an Owner/PM directly adds a member to a
 * project via the dashboard (not via the email-invite flow). The recipient
 * is a brand-new user record without a Supabase auth login yet — this email
 * carries a setup link so they can finish account creation.
 *
 * Skip this email when the user already has a Supabase auth account; in
 * that case the WhatsApp greeting alone is sufficient.
 */
export type ProjectInviteOpts = {
  to: string;
  name?: string | null;
  projectCode: string;
  projectName: string;
  role: string;
  setupUrl: string;
  orgName: string;
};

export function projectInviteEmail(opts: ProjectInviteOpts) {
  const greeting = opts.name ? `Hi ${escapeHtml(opts.name)},` : 'Hi,';
  const safeProjectCode = escapeHtml(opts.projectCode);
  const safeProjectName = escapeHtml(opts.projectName);
  const safeRole = escapeHtml(humanizeRole(opts.role));
  const safeOrg = escapeHtml(opts.orgName);
  const body = `
    <h2 style="color:#0f172a;margin:0 0 16px;font-size:22px">You've been added to a BuildOS project</h2>
    <p style="color:#334155;line-height:1.6;margin:0 0 16px">${greeting}</p>
    <p style="color:#334155;line-height:1.6;margin:0 0 20px">
      ${safeOrg} has added you to project
      <strong style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${safeProjectCode}</strong>
      — <strong>${safeProjectName}</strong> — as <strong>${safeRole}</strong>.
    </p>
    <p style="color:#334155;line-height:1.6;margin:0 0 20px">
      Set up your account to start logging site updates, costs, and incidents
      from the dashboard or directly via WhatsApp.
    </p>
    ${ctaButton(opts.setupUrl, 'Set up your account')}
    <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:20px 0 0">
      You can also send WhatsApp updates by including <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px">#${safeProjectCode}</code> in your message if you're on multiple projects.
    </p>
  `;
  return {
    subject: `You've been added to ${opts.projectCode} — ${opts.projectName}`,
    html: emailLayout({
      preheader: `${opts.orgName} added you to ${opts.projectCode}.`,
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
