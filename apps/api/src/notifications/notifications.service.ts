import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.module';

export type CreateNotificationInput = {
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateNotificationInput) {
    return this.prisma.notification.create({ data: input });
  }

  async createMany(inputs: CreateNotificationInput[]) {
    if (!inputs.length) return;
    return this.prisma.notification.createMany({ data: inputs });
  }

  async findAll(userId: string, opts: { unreadOnly?: boolean; limit?: number; cursor?: string }) {
    const limit = opts.limit ?? 30;
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(opts.unreadOnly ? { read: false } : {}),
        ...(opts.cursor ? { createdAt: { lt: new Date(opts.cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, read: false } });
  }

  async markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }
}
