import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma.module';
import { UpdateUserDto } from './users.dto';

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  whatsappPhone: true,
  isActive: true,
  lastActiveAt: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForTenant(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      select: USER_SELECT,
    });
  }

  async update(tenantId: string, userId: string, callerRole: string, data: UpdateUserDto) {
    if (callerRole !== 'OWNER') {
      throw new ForbiddenException('Only owners can edit team members');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
    });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.role !== undefined ? { role: data.role as UserRole } : {}),
        ...(data.whatsappPhone !== undefined ? { whatsappPhone: data.whatsappPhone || null } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
      select: USER_SELECT,
    });
  }

  async softDelete(tenantId: string, userId: string, callerRole: string) {
    if (callerRole !== 'OWNER') {
      throw new ForbiddenException('Only owners can remove team members');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'OWNER') throw new ForbiddenException('Cannot remove the owner');

    return this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
