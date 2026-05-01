import { Injectable, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.module';
import { supabaseAdmin } from './supabase';
import { seqToCode } from '../common/code-sequence';
import { EmailService } from '../email/email.service';
import { env } from '../config/env';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async register(data: { email: string; password: string; name: string; companyName: string }) {
    const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });

    if (error) {
      this.logger.warn(`Registration failed for ${data.email}: ${error.message}`);
      throw new BadRequestException('Registration failed. Please check your details and try again.');
    }

    const supabaseUserId = authData.user.id;

    try {
      const slug = data.companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // Atomic tenant + user create with collision-free company code allocation.
      // The GlobalCounter upsert serializes concurrent registrations on the
      // single counter row, so two organisations can never share a code.
      const { tenant, user } = await this.prisma.$transaction(async (tx) => {
        const counter = await tx.globalCounter.upsert({
          where: { key: 'company' },
          update: { value: { increment: 1 } },
          create: { key: 'company', value: 1 },
          select: { value: true },
        });
        const companyCode = seqToCode(counter.value);

        const tenant = await tx.tenant.create({
          data: { name: data.companyName, slug, companyCode },
        });
        const user = await tx.user.create({
          data: {
            tenantId: tenant.id,
            email: data.email,
            name: data.name,
            role: 'OWNER',
          },
        });
        return { tenant, user };
      });

      await supabaseAdmin.auth.admin.updateUserById(supabaseUserId, {
        user_metadata: { tenantId: tenant.id, userId: user.id, role: user.role },
      });

      const { data: session, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInError) {
        this.logger.warn(`Post-registration sign-in failed for ${data.email}: ${signInError.message}`);
        throw new BadRequestException('Account created but sign-in failed. Please try logging in.');
      }

      // D1 — fire-and-forget welcome email. Failures are logged but never
      // block the API response: the user can sign in regardless.
      void this.email
        .sendOwnerWelcome({
          to: data.email,
          name: data.name,
          orgName: tenant.name,
          companyCode: tenant.companyCode,
          dashboardUrl: env.FRONTEND_URL,
        })
        .catch((err) => this.logger.warn(`Owner welcome email failed for ${data.email}: ${err}`));

      return {
        tenant,
        user,
        accessToken: session.session.access_token,
        refreshToken: session.session.refresh_token,
        expiresAt: session.session.expires_at,
      };
    } catch (err) {
      // Cleanup the orphan Supabase user so the email becomes reusable.
      // If deleteUser itself fails (network blip), log loudly — manual cleanup needed.
      await supabaseAdmin.auth.admin
        .deleteUser(supabaseUserId)
        .catch((cleanupErr) =>
          this.logger.error(
            `Orphan cleanup failed for Supabase user ${supabaseUserId}; manual intervention needed`,
            cleanupErr,
          ),
        );
      throw err;
    }
  }

  async login(data: { email: string; password: string }) {
    const { data: session, error } = await supabaseAdmin.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      this.logger.warn(`Login failed for ${data.email}: ${error.message}`);
      throw new UnauthorizedException('Invalid email or password.');
    }

    return {
      accessToken: session.session.access_token,
      refreshToken: session.session.refresh_token,
      expiresAt: session.session.expires_at,
    };
  }

  async acceptInvite(data: { token: string; password: string; name: string }) {
    const invite = await this.prisma.invite.findUnique({
      where: { token: data.token },
      include: { tenant: true },
    });
    if (!invite) throw new BadRequestException('Invalid invite');
    if (invite.acceptedAt) throw new BadRequestException('Invite already accepted');
    if (invite.expiresAt < new Date()) throw new BadRequestException('Invite has expired');

    const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({
      email: invite.email,
      password: data.password,
      email_confirm: true,
    });
    if (error) {
      this.logger.warn(`Invite acceptance failed for ${invite.email}: ${error.message}`);
      throw new BadRequestException('Could not create your account. The email may already be registered.');
    }

    const supabaseUserId = authData.user.id;

    try {
      // Atomic user.create + invite.update — partial success is impossible.
      const user = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            tenantId: invite.tenantId,
            email: invite.email,
            whatsappPhone: invite.phone || null,
            name: data.name,
            role: invite.role,
          },
        });
        await tx.invite.update({
          where: { id: invite.id },
          data: { acceptedAt: new Date() },
        });
        return user;
      });

      await supabaseAdmin.auth.admin.updateUserById(supabaseUserId, {
        user_metadata: { tenantId: invite.tenantId, userId: user.id, role: user.role },
      });

      const { data: session, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email: invite.email,
        password: data.password,
      });
      if (signInError) {
        this.logger.warn(`Post-invite sign-in failed for ${invite.email}: ${signInError.message}`);
        throw new BadRequestException('Account created but sign-in failed. Please try logging in.');
      }

      // D2 — fire-and-forget welcome email confirming the new member's account
      // is live. Distinct from the inviteEmail() that fired when the invite was
      // first issued; this one closes the loop after acceptance.
      void this.email
        .sendMemberWelcome({
          to: invite.email,
          name: data.name,
          orgName: invite.tenant.name,
          role: invite.role,
          dashboardUrl: env.FRONTEND_URL,
        })
        .catch((err) => this.logger.warn(`Member welcome email failed for ${invite.email}: ${err}`));

      return {
        tenant: invite.tenant,
        user,
        accessToken: session.session.access_token,
        refreshToken: session.session.refresh_token,
        expiresAt: session.session.expires_at,
      };
    } catch (err) {
      await supabaseAdmin.auth.admin
        .deleteUser(supabaseUserId)
        .catch((cleanupErr) =>
          this.logger.error(
            `Orphan cleanup failed for Supabase user ${supabaseUserId}; manual intervention needed`,
            cleanupErr,
          ),
        );
      throw err;
    }
  }

  async refresh(refreshToken: string) {
    const { data, error } = await supabaseAdmin.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) throw new UnauthorizedException('Session expired');

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
    };
  }

  async getUserFromToken(token: string) {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) throw new UnauthorizedException('Invalid token');

    const meta = data.user.user_metadata;
    const user = await this.prisma.user.findUnique({
      where: { id: meta.userId },
    });

    if (!user || !user.isActive) throw new UnauthorizedException('User not found or inactive');

    return { ...user, supabaseId: data.user.id };
  }
}
