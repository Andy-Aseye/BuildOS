import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.module';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(tenantId: string, query: string) {
    const q = query.trim();
    if (!q) return { projects: [], rfis: [], users: [] };

    const [projects, rfis, users] = await Promise.all([
      this.prisma.project.findMany({
        where: {
          tenantId,
          deletedAt: null,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { code: { contains: q, mode: 'insensitive' } },
            { clientName: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 10,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, name: true, code: true, clientName: true, status: true },
      }),
      this.prisma.rFI.findMany({
        where: {
          tenantId,
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { referenceNo: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 10,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, referenceNo: true, title: true, status: true, projectId: true },
      }),
      this.prisma.user.findMany({
        where: {
          tenantId,
          deletedAt: null,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 10,
        select: { id: true, name: true, email: true, role: true },
      }),
    ]);

    return { projects, rfis, users };
  }
}
