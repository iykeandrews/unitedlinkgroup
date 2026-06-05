import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';

@Injectable()
export class EmailTemplatesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(dto: CreateEmailTemplateDto, userId: string, businessId: string) {
    const template = await this.prisma.emailTemplate.create({
      data: {
        ...dto,
        createdBy: userId,
        businessId,
      },
    });

    await this.auditService.logAction({
      businessId,
      userId,
      action: 'CREATE',
      resource: 'EMAIL_TEMPLATE',
      resourceId: template.id,
      details: dto,
    });

    return template;
  }

  async findAll(businessId: string) {
    return this.prisma.emailTemplate.findMany({
      where: { businessId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, businessId: string) {
    const template = await this.prisma.emailTemplate.findUnique({
      where: { id },
    });

    if (!template || template.businessId !== businessId) {
      return null;
    }

    return template;
  }

  async update(id: string, dto: CreateEmailTemplateDto, userId: string, businessId: string) {
    const existing = await this.findOne(id, businessId);
    if (!existing) throw new BadRequestException('Template not found or access denied');

    const template = await this.prisma.emailTemplate.update({
      where: { id },
      data: dto,
    });

    await this.auditService.logAction({
      businessId,
      userId,
      action: 'UPDATE',
      resource: 'EMAIL_TEMPLATE',
      resourceId: id,
      details: dto,
    });

    return template;
  }

  async remove(id: string, userId: string, businessId: string) {
    const existing = await this.findOne(id, businessId);
    if (!existing) throw new BadRequestException('Template not found or access denied');

    const template = await this.prisma.emailTemplate.delete({
      where: { id },
    });

    await this.auditService.logAction({
      businessId,
      userId,
      action: 'DELETE',
      resource: 'EMAIL_TEMPLATE',
      resourceId: id,
    });

    return template;
  }
}
