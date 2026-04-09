import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.module';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.tenant.findUniqueOrThrow({ where: { id } });
  }

  async update(id: string, data: { name?: string; logoUrl?: string; primaryColor?: string }) {
    return this.prisma.tenant.update({ where: { id }, data });
  }
}
