import { Injectable, Logger } from '@nestjs/common';
import { env } from '../config/env';
import { inviteEmail, type InviteOpts } from './templates/invite';
import { memberWelcomeEmail, type MemberWelcomeOpts } from './templates/member-welcome';
import { ownerWelcomeEmail, type OwnerWelcomeOpts } from './templates/owner-welcome';
import { progressReportEmail, type ProgressReportOpts } from './templates/progress-report';
import { projectInviteEmail, type ProjectInviteOpts } from './templates/project-invite';

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

/**
 * Thin transport wrapper around Resend (Package D).
 *
 * All HTML lives in `./templates/*.ts`; this service is only responsible for
 * (a) checking the API key is present, (b) firing the HTTP request, and (c)
 * logging failures. Each `send*` method is a one-liner that hands a template's
 * `{ subject, html }` to the underlying transport.
 *
 * Every method is fire-and-forget by convention — callers should not let an
 * email failure block their main flow. We return a boolean so callers can
 * still log, but no error propagates.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  private get apiKey() {
    return env.RESEND_API_KEY;
  }

  get enabled() {
    return !!this.apiKey;
  }

  async send(input: SendEmailInput): Promise<boolean> {
    if (!this.apiKey) {
      this.logger.warn('RESEND_API_KEY not configured — skipping email');
      return false;
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM ?? 'BuildOS <noreply@buildos.app>',
          to: input.to,
          subject: input.subject,
          html: input.html,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`Resend API error ${res.status}: ${body}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error('Email send failed', err);
      return false;
    }
  }

  // D1 — owner registration confirmation.
  async sendOwnerWelcome(opts: OwnerWelcomeOpts) {
    const { subject, html } = ownerWelcomeEmail(opts);
    return this.send({ to: opts.to, subject, html });
  }

  // D2 — post-invite signup confirmation.
  async sendMemberWelcome(opts: MemberWelcomeOpts) {
    const { subject, html } = memberWelcomeEmail(opts);
    return this.send({ to: opts.to, subject, html });
  }

  // D3 — direct addMember (without prior invite link).
  async sendProjectInvite(opts: ProjectInviteOpts) {
    const { subject, html } = projectInviteEmail(opts);
    return this.send({ to: opts.to, subject, html });
  }

  // Existing — invite link flow.
  async sendInvite(opts: InviteOpts) {
    const { subject, html } = inviteEmail(opts);
    return this.send({ to: opts.to, subject, html });
  }

  // Existing — progress report delivery.
  async sendReportDelivery(opts: ProgressReportOpts) {
    const { subject, html } = progressReportEmail(opts);
    return this.send({ to: opts.to, subject, html });
  }
}
