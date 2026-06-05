import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async logAction(data: {
    businessId: string;
    userId: string;
    action: string;
    resource: string;
    resourceId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          businessId: data.businessId,
          userId: data.userId,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId,
          details: data.details ? JSON.stringify(data.details) : undefined,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Don't throw error to avoid blocking the main action
    }
  }

  async getLogs(params: {
    businessId?: string;
    resource?: string;
    resourceId?: string;
    action?: string;
    limit?: number;
  }) {
    const where: any = {};
    if (params.businessId) where.businessId = params.businessId;
    if (params.resource) where.resource = params.resource;
    if (params.resourceId) where.resourceId = params.resourceId;
    if (params.action) where.action = params.action;

    const logs = await this.prisma.auditLog.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: params.limit && params.limit > 0 ? params.limit : 50,
    });

    return logs.map(l => ({
      id: l.id,
      action: l.action,
      resource: l.resource,
      resourceId: l.resourceId,
      at: l.createdAt,
      by: l.user ? (`${l.user.firstName || ''} ${l.user.lastName || ''}`.trim() || l.user.email) : 'System',
      details: (() => {
        try {
          return l.details ? JSON.parse(l.details as any) : null;
        } catch {
          return null;
        }
      })(),
    }));
  }
}
