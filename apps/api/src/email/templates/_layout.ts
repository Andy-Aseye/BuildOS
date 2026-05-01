/**
 * Shared HTML shell for every BuildOS email.
 *
 * Centralises:
 *   - Outer container styling (max-width, font stack)
 *   - Brand header
 *   - Footer with company info / unsubscribe placeholder
 *
 * Each template just supplies the inner body and a CTA — keeping the actual
 * template files focused on the message, not the chrome.
 */
type LayoutOpts = {
  preheader?: string;
  body: string;
};

export function emailLayout({ preheader, body }: LayoutOpts): string {
  // Preheader text shows in the inbox preview pane on most clients. Hidden via
  // CSS so it doesn't appear in the rendered body.
  const preheaderHtml = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;color:transparent;font-size:1px;line-height:1px;mso-hide:all">${preheader}</div>`
    : '';
  return `
    <div style="background:#f8fafc;padding:24px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
      ${preheaderHtml}
      <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px 24px;box-shadow:0 1px 3px rgba(15,23,42,0.06)">
        <div style="font-weight:700;font-size:18px;color:#0f172a;margin-bottom:24px;letter-spacing:-0.01em">BuildOS</div>
        ${body}
        <hr style="border:0;border-top:1px solid #e2e8f0;margin:32px 0 16px">
        <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0">
          BuildOS — construction project intelligence.<br>
          You received this email because of activity on your BuildOS account.
        </p>
      </div>
    </div>
  `;
}

/** Render a primary CTA button. Inline styles are necessary for email clients. */
export function ctaButton(href: string, label: string): string {
  return `
    <a href="${escapeHtml(href)}"
       style="display:inline-block;padding:12px 24px;background:#0f172a;color:#ffffff !important;text-decoration:none;border-radius:8px;font-weight:600;margin:8px 0">
      ${escapeHtml(label)}
    </a>
  `;
}

/**
 * Minimal HTML escape for user-supplied content (names, project codes, etc.)
 * Resend renders the body as-is, so any raw string from the database that ends
 * up in a `${}` interpolation needs to flow through this first.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
