import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma.module';
import { supabaseAdmin } from './supabase';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(data: { email: string; password: string; name: string; companyName: string }) {
    const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });

    if (error) throw new BadRequestException(error.message);

    const slug = data.companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const tenant = await this.prisma.tenant.create({
      data: { name: data.companyName, slug },
    });

    const user = await this.prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: data.email,
        name: data.name,
        role: 'OWNER',
      },
    });

    await supabaseAdmin.auth.admin.updateUserById(authData.user.id, {
      user_metadata: { tenantId: tenant.id, userId: user.id, role: user.role },
    });

    const { data: session, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (signInError) throw new BadRequestException(signInError.message);

    return {
      tenant,
      user,
      accessToken: session.session.access_token,
      refreshToken: session.session.refresh_token,
      expiresAt: session.session.expires_at,
    };
  }

  async login(data: { email: string; password: string }) {
    const { data: session, error } = await supabaseAdmin.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) throw new UnauthorizedException(error.message);

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
    if (error) throw new BadRequestException(error.message);

    const user = await this.prisma.user.create({
      data: {
        tenantId: invite.tenantId,
        email: invite.email,
        name: data.name,
        role: invite.role,
      },
    });

    await supabaseAdmin.auth.admin.updateUserById(authData.user.id, {
      user_metadata: { tenantId: invite.tenantId, userId: user.id, role: user.role },
    });

    await this.prisma.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });

    const { data: session, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: invite.email,
      password: data.password,
    });
    if (signInError) throw new BadRequestException(signInError.message);

    return {
      tenant: invite.tenant,
      user,
      accessToken: session.session.access_token,
      refreshToken: session.session.refresh_token,
      expiresAt: session.session.expires_at,
    };
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
