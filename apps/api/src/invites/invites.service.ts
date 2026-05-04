import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma.module';
import { EmailService } from '../email/email.service';
import { env } from '../config/env';

@Injectable()
export class InvitesService {
  private readonly logger = new Logger(InvitesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async create(
    tenantId: string,
    invitedById: string,
    callerRole: string,
    data: { email: string; name?: string; phone?: string; role: string },
  ) {
    if (callerRole !== 'OWNER' && callerRole !== 'PROJECT_MANAGER') {
      throw new ForbiddenException('Only owners and project managers can invite members');
    }

    const existing = await this.prisma.user.findFirst({
      where: { email: data.email, tenantId, deletedAt: null },
    });
    if (existing) throw new ConflictException('A user with this email already exists in your organization');

    const pendingInvite = await this.prisma.invite.findFirst({
      where: { email: data.email, tenantId, acceptedAt: null, expiresAt: { gt: new Date() } },
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const include = {
      tenant: { select: { name: true } },
      invitedBy: { select: { name: true } },
    } as const;

    const invite = pendingInvite
      ? await this.prisma.invite.update({
          where: { id: pendingInvite.id },
          data: {
            token: randomUUID(),
            expiresAt,
            name: data.name,
            phone: data.phone || null,
            role: data.role as UserRole,
            invitedById,
          },
          include,
        })
      : await this.prisma.invite.create({
          data: {
            tenantId,
            email: data.email,
            name: data.name,
            phone: data.phone || null,
            role: data.role as UserRole,
            invitedById,
            expiresAt,
          },
          include,
        });

    if (this.email.enabled) {
      const inviteUrl = `${env.FRONTEND_URL}/invite/${invite.token}`;
      void this.email.sendInvite({
        to: data.email,
        inviterName: invite.invitedBy?.name ?? 'A team member',
        orgName: invite.tenant.name,
        role: data.role,
        inviteUrl,
      }).catch((e) => this.logger.warn(`Invite email failed: ${e}`));
    }

    return invite;
  }

  async list(tenantId: string) {
    return this.prisma.invite.findMany({
      where: { tenantId, acceptedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        invitedBy: { select: { name: true } },
      },
    });
  }

  async validateToken(token: string) {
    const invite = await this.prisma.invite.findUnique({
      where: { token },
      include: { tenant: { select: { id: true, name: true } } },
    });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.acceptedAt) throw new ConflictException('Invite has already been accepted');
    if (invite.expiresAt < new Date()) throw new ConflictException('Invite has expired');
    return {
      email: invite.email,
      name: invite.name,
      role: invite.role,
      tenantName: invite.tenant.name,
    };
  }

  async revoke(tenantId: string, inviteId: string, callerRole: string) {
    if (callerRole !== 'OWNER' && callerRole !== 'PROJECT_MANAGER') {
      throw new ForbiddenException('Only owners and project managers can revoke invites');
    }

    const invite = await this.prisma.invite.findFirst({
      where: { id: inviteId, tenantId, acceptedAt: null },
    });
    if (!invite) throw new NotFoundException('Invite not found');

    return this.prisma.invite.delete({ where: { id: inviteId } });
  }
}
