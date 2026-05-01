import { ctaButton, emailLayout, escapeHtml } from './_layout';

/** Progress report delivery (refactored from the inline string in EmailService). */
export type ProgressReportOpts = {
  to: string;
  projectName: string;
  periodStart: string;
  periodEnd: string;
  reportUrl: string;
};

export function progressReportEmail(opts: ProgressReportOpts) {
  const safeProject = escapeHtml(opts.projectName);
  const safeStart = escapeHtml(opts.periodStart);
  const safeEnd = escapeHtml(opts.periodEnd);
  const body = `
    <h2 style="color:#0f172a;margin:0 0 16px;font-size:22px">Progress report ready</h2>
    <p style="color:#334155;line-height:1.6;margin:0 0 20px">
      A progress report for <strong>${safeProject}</strong> covering
      <strong>${safeStart}</strong> to <strong>${safeEnd}</strong> is ready to view.
    </p>
    ${ctaButton(opts.reportUrl, 'View report')}
  `;
  return {
    subject: `Progress Report: ${opts.projectName} (${opts.periodStart} – ${opts.periodEnd})`,
    html: emailLayout({
      preheader: `${opts.projectName}: ${opts.periodStart}–${opts.periodEnd}`,
      body,
    }),
  };
}
