import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Currency,
  MaterialsRequestStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma.module';
import {
  CreateMaterialsRequestDto,
  RecordDeliveryDto,
  UpdateMaterialsRequestDto,
} from './materials.dto';

const materialsInclude = {
  requestedBy: { select: { id: true, name: true, email: true } },
  approvedBy: { select: { id: true, name: true, email: true } },
  items: { orderBy: { id: 'asc' as const } },
} as const;

function sumEstimatedTotal(
  items: { quantity: number; estimatedUnitCost?: number }[],
): Prisma.Decimal {
  let total = 0;
  for (const i of items) {
    const unit = i.estimatedUnitCost ?? 0;
    total += i.quantity * unit;
  }
  return new Prisma.Decimal(total.toFixed(2));
}

@Injectable()
export class MaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireProject(projectId: string, tenantId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Project not found');
  }

  async findAllForProject(projectId: string, tenantId: string) {
    await this.requireProject(projectId, tenantId);
    return this.prisma.materialsRequest.findMany({
      where: { projectId, tenantId },
      orderBy: { createdAt: 'desc' },
      include: materialsInclude,
    });
  }

  async findOneForProject(
    id: string,
    projectId: string,
    tenantId: string,
  ) {
    const row = await this.prisma.materialsRequest.findFirst({
      where: { id, projectId, tenantId },
      include: materialsInclude,
    });
    if (!row) throw new NotFoundException('Materials request not found');
    return row;
  }

  async create(
    projectId: string,
    tenantId: string,
    userId: string,
    data: CreateMaterialsRequestDto,
  ) {
    await this.requireProject(projectId, tenantId);
    if (!data.items?.length) {
      throw new BadRequestException('At least one line item is required');
    }
    const estimatedTotal = sumEstimatedTotal(data.items);
    return this.prisma.materialsRequest.create({
      data: {
        projectId,
        tenantId,
        requestedById: userId,
        currency: data.currency,
        notes: data.notes,
        requiresOwnerApproval: data.requiresOwnerApproval ?? false,
        estimatedTotal,
        status: MaterialsRequestStatus.DRAFT,
        items: {
          create: data.items.map((i) => ({
            description: i.description,
            quantity: new Prisma.Decimal(i.quantity),
            unit: i.unit,
            estimatedUnitCost:
              i.estimatedUnitCost !== undefined
                ? new Prisma.Decimal(i.estimatedUnitCost)
                : null,
          })),
        },
      },
      include: materialsInclude,
    });
  }

  async update(
    id: string,
    projectId: string,
    tenantId: string,
    userId: string,
    data: UpdateMaterialsRequestDto,
  ) {
    const existing = await this.findOneForProject(id, projectId, tenantId);

    return this.prisma.$transaction(async (tx) => {
      let estimatedTotal = existing.estimatedTotal;

      if (data.items !== undefined) {
        if (!data.items.length) {
          throw new BadRequestException('At least one line item is required');
        }
        estimatedTotal = sumEstimatedTotal(data.items);
        await tx.materialsRequestItem.deleteMany({
          where: { materialsRequestId: id },
        });
        await tx.materialsRequestItem.createMany({
          data: data.items.map((i) => ({
            materialsRequestId: id,
            description: i.description,
            quantity: new Prisma.Decimal(i.quantity),
            unit: i.unit,
            estimatedUnitCost:
              i.estimatedUnitCost !== undefined
                ? new Prisma.Decimal(i.estimatedUnitCost)
                : null,
          })),
        });
      }

      const patch: Prisma.MaterialsRequestUpdateInput = {};
      if (data.notes !== undefined) patch.notes = data.notes;
      if (data.requiresOwnerApproval !== undefined) {
        patch.requiresOwnerApproval = data.requiresOwnerApproval;
      }
      if (data.items !== undefined) {
        patch.estimatedTotal = estimatedTotal;
      }
      if (data.status !== undefined) {
        patch.status = data.status;
        if (data.status === MaterialsRequestStatus.APPROVED) {
          patch.approvedBy = { connect: { id: userId } };
          patch.approvedAt = new Date();
          patch.rejectionReason = null;
        } else if (data.status === MaterialsRequestStatus.REJECTED) {
          patch.approvedBy = { disconnect: true };
          patch.approvedAt = null;
          if (data.rejectionReason) {
            patch.rejectionReason = data.rejectionReason;
          }
        } else if (data.rejectionReason !== undefined) {
          patch.rejectionReason = data.rejectionReason;
        }
      } else if (data.rejectionReason !== undefined) {
        patch.rejectionReason = data.rejectionReason;
      }

      if (data.costEntryId !== undefined) {
        patch.costEntryId = data.costEntryId || null;
      }

      return tx.materialsRequest.update({
        where: { id },
        data: patch,
        include: materialsInclude,
      });
    });
  }

  async remove(id: string, projectId: string, tenantId: string) {
    await this.findOneForProject(id, projectId, tenantId);
    await this.prisma.materialsRequestItem.deleteMany({ where: { materialsRequestId: id } });
    await this.prisma.materialsRequest.delete({ where: { id } });
    return { deleted: true };
  }

  async recordDelivery(
    requestId: string,
    itemId: string,
    projectId: string,
    tenantId: string,
    data: RecordDeliveryDto,
  ) {
    await this.findOneForProject(requestId, projectId, tenantId);
    const item = await this.prisma.materialsRequestItem.findFirst({
      where: { id: itemId, materialsRequestId: requestId },
    });
    if (!item) throw new NotFoundException('Line item not found');

    return this.prisma.materialsRequestItem.update({
      where: { id: itemId },
      data: {
        deliveredQuantity: new Prisma.Decimal(data.deliveredQuantity),
        deliveredAt: new Date(),
      },
    });
  }
}
