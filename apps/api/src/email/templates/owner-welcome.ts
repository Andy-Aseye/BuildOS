import { ctaButton, emailLayout, escapeHtml } from './_layout';

/**
 * Owner registration welcome (D1). Sent immediately after a new tenant +
 * owner user are created — confirms the account is live, surfaces the
 * company code (so the owner can share it with PMs/foremen), and points
 * them at the dashboard to start adding projects and members.
 */
export type OwnerWelcomeOpts = {
  to: string;
  name: string;
  orgName: string;
  companyCode: string;
  dashboardUrl: string;
};

export function ownerWelcomeEmail(opts: OwnerWelcomeOpts) {
  const safeName = escapeHtml(opts.name);
  const safeOrg = escapeHtml(opts.orgName);
  const safeCode = escapeHtml(opts.companyCode);
  const body = `
    <h2 style="color:#0f172a;margin:0 0 16px;font-size:22px">Welcome to BuildOS, ${safeName}</h2>
    <p style="color:#334155;line-height:1.6;margin:0 0 20px">
      Your organisation <strong>${safeOrg}</strong> is set up and ready to go.
    </p>
    <div style="background:#f1f5f9;border-radius:8px;padding:16px 20px;margin:20px 0">
      <div style="color:#64748b;font-size:13px;margin-bottom:4px">Your BuildOS company code</div>
      <div style="color:#0f172a;font-size:24px;font-weight:700;letter-spacing:0.04em;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${safeCode}</div>
      <div style="color:#64748b;font-size:12px;margin-top:8px;line-height:1.5">
        Project codes are derived from this — every project gets a code like <code style="background:#fff;padding:2px 6px;border-radius:4px;border:1px solid #e2e8f0">${safeCode}A1</code>, <code style="background:#fff;padding:2px 6px;border-radius:4px;border:1px solid #e2e8f0">${safeCode}A2</code>, etc.
      </div>
    </div>
    <p style="color:#334155;line-height:1.6;margin:0 0 8px">Next steps:</p>
    <ul style="color:#334155;line-height:1.7;margin:0 0 20px;padding-left:20px">
      <li>Create your first project</li>
      <li>Invite your project manager and foremen</li>
      <li>Set up WhatsApp logging for the field team</li>
    </ul>
    ${ctaButton(opts.dashboardUrl, 'Open dashboard')}
  `;
  return {
    subject: `Welcome to BuildOS — ${opts.orgName} is live`,
    html: emailLayout({
      preheader: `Your BuildOS company code is ${opts.companyCode}.`,
      body,
    }),
  };
}
