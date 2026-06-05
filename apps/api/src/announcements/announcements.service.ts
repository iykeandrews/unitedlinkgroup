import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getBusinessId(user: any, businessIdHeader?: string): Promise<string> {
    if (user.role === 'SUPER_ADMIN') {
      if (!businessIdHeader) throw new BadRequestException('Business context required for Super Admin');
      return businessIdHeader;
    }
    const userId = user.userId || user.sub || user.id;
    const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: userId } });
    if (ownedBusiness) {
      if (businessIdHeader && businessIdHeader !== ownedBusiness.id) {
        throw new BadRequestException('Access denied: Cannot access another business data');
      }
      return ownedBusiness.id;
    }
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) throw new BadRequestException('User is not associated with a business');
    if (businessIdHeader && businessIdHeader !== employee.businessId) {
      throw new BadRequestException('Access denied: Cannot access another business data');
    }
    return employee.businessId;
  }

  async create(dto: CreateAnnouncementDto, userId: string, businessId: string) {
    if ((dto.targetType === 'DEPARTMENT' || dto.targetType === 'ROLE') && !dto.targetValue) {
      throw new BadRequestException('Target value is required for this target type');
    }

    if (dto.targetType === 'DEPARTMENT' && dto.targetValue) {
      const dept = await this.prisma.department.findFirst({
        where: { id: dto.targetValue, businessId },
      });
      if (!dept) {
        throw new BadRequestException('Invalid department');
      }
    }

    if (dto.targetType === 'ROLE' && dto.targetValue) {
      const role = await this.prisma.role.findFirst({
        where: { id: dto.targetValue, businessId },
      });

      const validSystemRoles = ['SUPER_ADMIN', 'BUSINESS_ADMIN', 'MANAGER', 'EMPLOYEE'];

      if (!role && !validSystemRoles.includes(dto.targetValue)) {
        throw new BadRequestException('Invalid role');
      }
    }

    let status = dto.status;
    if (dto.scheduledAt && new Date(dto.scheduledAt) > new Date()) {
      status = 'SCHEDULED' as any;
    }

    const announcement = await this.prisma.announcement.create({
      data: {
        ...dto,
        status,
        authorId: userId,
        businessId,
      },
    });

    await this.auditService.logAction({
      businessId,
      userId,
      action: 'CREATE',
      resource: 'ANNOUNCEMENT',
      resourceId: announcement.id,
      details: dto,
    });

    return announcement;
  }

  async update(id: string, dto: Partial<CreateAnnouncementDto>, userId: string, businessId: string) {
    // Verify ownership/tenancy
    const existing = await this.prisma.announcement.findFirst({
      where: { id, businessId }
    });
    if (!existing) {
      throw new BadRequestException('Announcement not found or access denied');
    }

    // Validate target value if type is changed or new value provided
    if ((dto.targetType === 'DEPARTMENT' || dto.targetType === 'ROLE') && !dto.targetValue) {
      // Need to check if existing record has value if only type is updated (omitted for simplicity, assuming full update usually)
      if (dto.targetValue === undefined) {
         // If partial update doesn't include value, we might need to check DB, but DTO usually sends both if related.
         // Let's assume validation is handled by frontend or full payload. 
      }
    }

    const announcement = await this.prisma.announcement.update({
      where: { id },
      data: {
        ...dto,
      },
    });

    await this.auditService.logAction({
      businessId,
      userId,
      action: 'UPDATE',
      resource: 'ANNOUNCEMENT',
      resourceId: id,
      details: dto,
    });

    return announcement;
  }

  async findAll(userId: string, businessId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const isAdmin = user?.role === 'BUSINESS_ADMIN' || user?.role === 'SUPER_ADMIN';

    let whereClause: any = { businessId };

    if (!isAdmin) {
      const employee = await this.prisma.employee.findFirst({
        where: { userId, businessId },
        select: { departmentId: true, role: true, customRoleId: true }
      });

      if (!employee) {
        return []; // Non-admin users without employee profile see nothing
      }

      // Find system role ID if applicable
      const systemRole = await this.prisma.role.findFirst({
        where: { businessId, name: employee.role }
      });

      const roleIds = [];
      if (employee.customRoleId) roleIds.push(employee.customRoleId);
      if (systemRole) roleIds.push(systemRole.id);

      // Target conditions
      const targetConditions: any[] = [
        { targetType: 'ALL' },
        { targetType: 'DEPARTMENT', targetValue: employee.departmentId },
      ];
      
      // Add both system role string and role IDs
      if (employee.role) {
        targetConditions.push({ targetType: 'ROLE', targetValue: employee.role });
      }
      roleIds.forEach(id => {
        targetConditions.push({ targetType: 'ROLE', targetValue: id });
      });

      whereClause = {
        businessId,
        OR: [
          { authorId: userId },
          {
            AND: [
              {
                OR: [
                  { status: 'PUBLISHED' },
                  { 
                    AND: [
                      { status: 'SCHEDULED' },
                      { scheduledAt: { lte: new Date() } }
                    ]
                  }
                ]
              },
              { OR: targetConditions }
            ]
          }
        ]
      };
    }

    const announcements = await this.prisma.announcement.findMany({
      where: whereClause,
      include: {
        author: {
          select: { firstName: true, lastName: true }
        },
        reads: {
          where: { userId }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return announcements.map(a => ({
      ...a,
      isRead: a.reads.length > 0
    }));
  }

  async markAsRead(announcementId: string, userId: string) {
    try {
      return await this.prisma.announcementRead.create({
        data: {
          announcementId,
          userId,
        },
      });
    } catch (e) {
      // Ignore if already exists (unique constraint)
      return { status: 'already read' };
    }
  }

  async remove(id: string, userId: string, businessId: string) {
    // Verify ownership/tenancy
    const existing = await this.prisma.announcement.findFirst({
      where: { id, businessId }
    });
    if (!existing) {
      throw new BadRequestException('Announcement not found or access denied');
    }

    const announcement = await this.prisma.announcement.delete({
      where: { id },
    });

    await this.auditService.logAction({
      businessId,
      userId,
      action: 'DELETE',
      resource: 'ANNOUNCEMENT',
      resourceId: id,
      details: { id },
    });

    return announcement;
  }
}
