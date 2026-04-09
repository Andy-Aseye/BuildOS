import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CostCategory, CostStatus, Currency, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.module';

type CostRow = { description: string; category: string; currency: string; amount: number; entryDate?: string };
type AttendanceRow = { logDate: string; workerCount: number };
type MaterialRow = { description: string; quantity: number; unit: string; estimatedUnitCost?: number };

@Injectable()
export class ImportService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireProject(projectId: string, tenantId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Project not found');
  }

  async importCosts(projectId: string, tenantId: string, userId: string, rows: CostRow[]) {
    await this.requireProject(projectId, tenantId);
    if (!rows?.length) throw new BadRequestException('No data rows provided');

    const validCategories = Object.values(CostCategory);
    const validCurrencies = Object.values(Currency);

    const data = rows.map((r, i) => {
      if (!r.description?.trim()) throw new BadRequestException(`Row ${i + 1}: description required`);
      if (!validCategories.includes(r.category as CostCategory))
        throw new BadRequestException(`Row ${i + 1}: invalid category "${r.category}"`);
      if (!validCurrencies.includes(r.currency as Currency))
        throw new BadRequestException(`Row ${i + 1}: invalid currency "${r.currency}"`);
      if (typeof r.amount !== 'number' || r.amount <= 0)
        throw new BadRequestException(`Row ${i + 1}: amount must be a positive number`);

      return {
        projectId,
        tenantId,
        source: 'MANUAL' as const,
        status: 'PENDING_CONFIRMATION' as CostStatus,
        description: r.description.trim(),
        category: r.category as CostCategory,
        currency: r.currency as Currency,
        amount: new Prisma.Decimal(r.amount),
        loggedById: userId,
        entryDate: r.entryDate ? new Date(r.entryDate) : new Date(),
      };
    });

    const result = await this.prisma.costEntry.createMany({ data });
    return { imported: result.count };
  }

  async importAttendance(projectId: string, tenantId: string, userId: string, rows: AttendanceRow[]) {
    await this.requireProject(projectId, tenantId);
    if (!rows?.length) throw new BadRequestException('No data rows provided');

    const data = rows.map((r, i) => {
      if (!r.logDate) throw new BadRequestException(`Row ${i + 1}: logDate required`);
      if (typeof r.workerCount !== 'number' || r.workerCount < 0)
        throw new BadRequestException(`Row ${i + 1}: workerCount must be non-negative`);

      return {
        projectId,
        tenantId,
        reportedById: userId,
        logDate: new Date(r.logDate),
        workerCount: r.workerCount,
      };
    });

    const result = await this.prisma.attendanceLog.createMany({ data });
    return { imported: result.count };
  }

  async importMaterials(
    projectId: string,
    tenantId: string,
    userId: string,
    rows: MaterialRow[],
    currency: Currency = Currency.GHS,
  ) {
    await this.requireProject(projectId, tenantId);
    if (!rows?.length) throw new BadRequestException('No data rows provided');

    let total = 0;
    const items = rows.map((r, i) => {
      if (!r.description?.trim()) throw new BadRequestException(`Row ${i + 1}: description required`);
      if (typeof r.quantity !== 'number' || r.quantity <= 0)
        throw new BadRequestException(`Row ${i + 1}: quantity must be positive`);
      if (!r.unit?.trim()) throw new BadRequestException(`Row ${i + 1}: unit required`);

      const unitCost = r.estimatedUnitCost ?? 0;
      total += r.quantity * unitCost;

      return {
        description: r.description.trim(),
        quantity: new Prisma.Decimal(r.quantity),
        unit: r.unit.trim(),
        estimatedUnitCost: unitCost ? new Prisma.Decimal(unitCost) : null,
      };
    });

    const request = await this.prisma.materialsRequest.create({
      data: {
        projectId,
        tenantId,
        requestedById: userId,
        currency,
        estimatedTotal: new Prisma.Decimal(total.toFixed(2)),
        status: 'DRAFT',
        notes: `Bulk import of ${rows.length} items`,
        items: { create: items },
      },
      include: {
        items: true,
        requestedBy: { select: { id: true, name: true, email: true } },
      },
    });

    return { imported: rows.length, request };
  }
}
