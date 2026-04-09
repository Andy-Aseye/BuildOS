import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DrawingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.module';
import { StorageService } from '../storage/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateDrawingReviewDto, UpdateDrawingReviewDto } from './drawings.dto';

const drawingInclude = {
  submittedBy: { select: { id: true, name: true, email: true } },
  reviewer: { select: { id: true, name: true, email: true } },
  revisions: {
    orderBy: { createdAt: 'desc' as const },
    include: {
      uploadedBy: { select: { id: true, name: true, email: true } },
    },
  },
} as const;

@Injectable()
export class DrawingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
  ) {}

  private async requireProject(projectId: string, tenantId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Project not found');
  }

  async findAllForProject(projectId: string, tenantId: string) {
    await this.requireProject(projectId, tenantId);
    return this.prisma.drawingReview.findMany({
      where: { projectId, tenantId },
      orderBy: { updatedAt: 'desc' },
      include: drawingInclude,
    });
  }

  async findOneForProject(
    id: string,
    projectId: string,
    tenantId: string,
  ) {
    const row = await this.prisma.drawingReview.findFirst({
      where: { id, projectId, tenantId },
      include: drawingInclude,
    });
    if (!row) throw new NotFoundException('Drawing not found');
    return row;
  }

  async create(
    projectId: string,
    tenantId: string,
    userId: string,
    data: CreateDrawingReviewDto,
  ) {
    await this.requireProject(projectId, tenantId);
    return this.prisma.drawingReview.create({
      data: {
        projectId,
        tenantId,
        title: data.title,
        description: data.description,
        status: DrawingStatus.DRAFT,
        submittedById: userId,
      },
      include: drawingInclude,
    });
  }

  async update(
    id: string,
    projectId: string,
    tenantId: string,
    data: UpdateDrawingReviewDto,
  ) {
    const existing = await this.findOneForProject(id, projectId, tenantId);

    const patch: Prisma.DrawingReviewUpdateInput = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.description !== undefined) patch.description = data.description;
    if (data.status !== undefined) patch.status = data.status;
    if (data.reviewerId !== undefined) {
      if (data.reviewerId) {
        const u = await this.prisma.user.findFirst({
          where: { id: data.reviewerId, tenantId, deletedAt: null },
        });
        if (!u) throw new BadRequestException('Reviewer not in this workspace');
        patch.reviewer = { connect: { id: data.reviewerId } };
      } else {
        patch.reviewer = { disconnect: true };
      }
    }

    const updated = await this.prisma.drawingReview.update({
      where: { id },
      data: patch,
      include: {
        ...drawingInclude,
        project: { select: { code: true } },
      },
    });

    if (data.status !== undefined && data.status !== existing.status && updated.submittedById) {
      void this.notifications.create({
        tenantId,
        userId: updated.submittedById,
        type: 'drawing_status',
        title: `Drawing "${updated.title}" → ${data.status}`,
        body: `Status updated to ${data.status}`,
        link: `/projects/${projectId}/drawings`,
      }).catch(() => {});
    }

    return updated;
  }

  async addRevision(
    drawingId: string,
    projectId: string,
    tenantId: string,
    userId: string,
    file: Express.Multer.File,
    comments?: string,
  ) {
    const drawing = await this.findOneForProject(drawingId, projectId, tenantId);
    if (!file?.buffer?.length) {
      throw new BadRequestException('File is required');
    }

    const nextNum = drawing.revisions.length + 1;
    const revisionNumber = `R${nextNum}`;

    const storageUrl = await this.storage.uploadPublicObject({
      tenantId,
      projectId,
      folder: 'drawings',
      filename: file.originalname || 'drawing.bin',
      buffer: file.buffer,
      contentType: file.mimetype || 'application/octet-stream',
    });

    return this.prisma.drawingRevision.create({
      data: {
        drawingReviewId: drawing.id,
        revisionNumber,
        storageUrl,
        fileSize: file.size,
        mimeType: file.mimetype || 'application/octet-stream',
        uploadedById: userId,
        comments: comments?.trim() || null,
      },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } },
        drawingReview: { select: { id: true, title: true, status: true } },
      },
    });
  }
}
