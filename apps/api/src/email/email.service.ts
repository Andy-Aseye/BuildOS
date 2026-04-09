import { Injectable, Logger } from '@nestjs/common';
import { env } from '../config/env';

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

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

  async sendInvite(opts: { to: string; inviterName: string; orgName: string; role: string; inviteUrl: string }) {
    return this.send({
      to: opts.to,
      subject: `You've been invited to ${opts.orgName} on BuildOS`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#0f172a">You're invited to join ${opts.orgName}</h2>
          <p>${opts.inviterName} has invited you as <strong>${opts.role}</strong>.</p>
          <a href="${opts.inviteUrl}" style="display:inline-block;padding:12px 24px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin:16px 0">
            Accept Invitation
          </a>
          <p style="color:#64748b;font-size:14px">This link expires in 7 days.</p>
        </div>
      `,
    });
  }

  async sendReportDelivery(opts: { to: string; projectName: string; periodStart: string; periodEnd: string; reportUrl: string }) {
    return this.send({
      to: opts.to,
      subject: `Progress Report: ${opts.projectName} (${opts.periodStart} – ${opts.periodEnd})`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#0f172a">Progress Report</h2>
          <p>A progress report for <strong>${opts.projectName}</strong> covering ${opts.periodStart} to ${opts.periodEnd} is ready.</p>
          <a href="${opts.reportUrl}" style="display:inline-block;padding:12px 24px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin:16px 0">
            View Report
          </a>
        </div>
      `,
    });
  }
}
