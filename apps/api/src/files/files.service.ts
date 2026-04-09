import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.module';
import { FileFolder } from '@prisma/client';
import { CreateFileDto, FileQueryDto } from './files.dto';

@Injectable()
export class FilesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(projectId: string, query: FileQueryDto, tenantId: string) {
    await this.assertProjectInTenant(projectId, tenantId);
    return this.prisma.projectFile.findMany({
      where: {
        projectId,
        tenantId,
        deletedAt: null,
        ...(query.folder !== undefined && { folder: query.folder as FileFolder }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    projectId: string,
    tenantId: string,
    uploadedById: string,
    data: CreateFileDto,
    fileSize: number,
  ) {
    await this.assertProjectInTenant(projectId, tenantId);
    return this.prisma.projectFile.create({
      data: {
        projectId,
        tenantId,
        uploadedById,
        fileSize,
        name: data.name,
        folder: data.folder as FileFolder,
        storageUrl: data.storageUrl,
        mimeType: data.mimeType,
      },
    });
  }

  async softDelete(id: string, tenantId: string) {
    const file = await this.prisma.projectFile.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!file) throw new NotFoundException('File not found');
    return this.prisma.projectFile.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getSignedUrl(id: string, tenantId: string) {
    const file = await this.prisma.projectFile.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!file) throw new NotFoundException('File not found');
    return file.storageUrl;
  }

  private async assertProjectInTenant(projectId: string, tenantId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId, deletedAt: null },
    });
    if (!project) throw new NotFoundException('Project not found');
  }
}
