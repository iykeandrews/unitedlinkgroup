import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { UserRole } from '@unitedlinkgroup/types';

@Injectable()
export class DepartmentsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  private async getBusinessId(user: any, businessIdHeader?: string): Promise<string> {
    if (user.role === UserRole.SUPER_ADMIN) {
        if (businessIdHeader) return businessIdHeader;
        // If no header, maybe return null? But most operations require businessId.
        // For findAll, maybe allow null?
        // For now, enforce context for write ops, maybe lax for read?
        // But the previous implementation required businessId for everything.
        // Let's enforce it.
        throw new BadRequestException('Business context required for Super Admin');
    }

    const userId = user.userId || user.sub || user.id;

    const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: userId } });
    if (ownedBusiness) {
        if (businessIdHeader && businessIdHeader !== ownedBusiness.id) {
             throw new BadRequestException('Access denied: You cannot access another business data');
        }
        return ownedBusiness.id;
    }
    
    const employee = await this.prisma.employee.findFirst({ where: { userId: userId } });
    if (!employee) {
        throw new BadRequestException('User is not associated with a business');
    }
    
    if (businessIdHeader && businessIdHeader !== employee.businessId) {
         throw new BadRequestException('Access denied: You cannot access another business data');
    }

    return employee.businessId;
  }

  async create(createDepartmentDto: CreateDepartmentDto, user: any, businessIdHeader?: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const userId = user.userId || user.sub || user.id;

    const department = await this.prisma.department.create({
      data: {
        ...createDepartmentDto,
        businessId,
      },
    });

    await this.auditService.logAction({
      businessId,
      userId,
      action: 'CREATE',
      resource: 'DEPARTMENT',
      resourceId: department.id,
      details: createDepartmentDto,
    });

    return department;
  }

  async findAll(user: any, businessIdHeader?: string, status?: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const where: any = { businessId };
    if (status) where.status = String(status).toUpperCase();
    const departments = await this.prisma.department.findMany({
      where,
      include: {
        manager: true,
        employees: {
          select: {
            id: true,
            status: true,
          }
        },
        _count: {
          select: { employees: true },
        },
      },
    });

    // Transform to include active vs inactive count
    return departments.map(dept => {
      const activeCount = dept.employees.filter(e => e.status === 'ACTIVE').length;
      return {
        ...dept,
        employeeCount: dept._count.employees,
        activeEmployeeCount: activeCount,
        inactiveEmployeeCount: dept._count.employees - activeCount,
      };
    });
  }

  async findOne(id: string, user: any, businessIdHeader?: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const department = await this.prisma.department.findFirst({
      where: { id, businessId },
      include: {
        manager: true,
        employees: true,
      },
    });
    if (!department) throw new NotFoundException('Department not found');
    return department;
  }

  async getDepartmentMembers(id: string, user: any, businessIdHeader?: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const department = await this.prisma.department.findFirst({
      where: { id, businessId },
      include: {
        employees: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            status: true,
            departmentId: true,
            w2Profile: { select: { id: true } },
            contractorProfile: { select: { id: true } },
          }
        }
      }
    });

    if (!department) {
        throw new NotFoundException('Department not found');
    }

    return department.employees;
  }

  async addMember(id: string, employeeId: string, user: any, businessIdHeader?: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const userId = user.userId || user.sub || user.id;

    // Verify department belongs to business
    const department = await this.prisma.department.findFirst({ where: { id, businessId } });
    if (!department) throw new NotFoundException('Department not found');

    // Verify employee belongs to business
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, businessId }
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const updatedEmployee = await this.prisma.employee.update({
      where: { id: employeeId },
      data: { departmentId: id },
    });

    await this.auditService.logAction({
      businessId,
      userId,
      action: 'UPDATE',
      resource: 'DEPARTMENT',
      resourceId: id,
      details: { action: 'ADD_MEMBER', employeeId },
    });

    return updatedEmployee;
  }

  async removeMember(id: string, employeeId: string, user: any, businessIdHeader?: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const userId = user.userId || user.sub || user.id;

    // Verify department belongs to business
    const department = await this.prisma.department.findFirst({ where: { id, businessId } });
    if (!department) throw new NotFoundException('Department not found');

    // Verify employee belongs to business and department
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, businessId, departmentId: id }
    });
    
    if (!employee) {
      throw new BadRequestException('Employee not found in this department');
    }

    const updatedEmployee = await this.prisma.employee.update({
      where: { id: employeeId },
      data: { departmentId: null },
    });

    await this.auditService.logAction({
      businessId,
      userId,
      action: 'UPDATE',
      resource: 'DEPARTMENT',
      resourceId: id,
      details: { action: 'REMOVE_MEMBER', employeeId },
    });

    return updatedEmployee;
  }

  async assignManager(id: string, employeeId: string, user: any, businessIdHeader?: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const userId = user.userId || user.sub || user.id;

    // Verify department
    const departmentCheck = await this.prisma.department.findFirst({ where: { id, businessId } });
    if (!departmentCheck) throw new NotFoundException('Department not found');

    // Verify employee belongs to business
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, businessId }
    });
    
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const department = await this.prisma.department.update({
      where: { id },
      data: { managerId: employeeId },
    });

    await this.auditService.logAction({
      businessId,
      userId,
      action: 'UPDATE',
      resource: 'DEPARTMENT',
      resourceId: id,
      details: { action: 'ASSIGN_MANAGER', managerId: employeeId },
    });

    return department;
  }

  async removeManager(id: string, user: any, businessIdHeader?: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const userId = user.userId || user.sub || user.id;

    const departmentCheck = await this.prisma.department.findFirst({ where: { id, businessId } });
    if (!departmentCheck) throw new NotFoundException('Department not found');

    const department = await this.prisma.department.update({
      where: { id },
      data: { managerId: null },
    });

    await this.auditService.logAction({
      businessId,
      userId,
      action: 'UPDATE',
      resource: 'DEPARTMENT',
      resourceId: id,
      details: { action: 'REMOVE_MANAGER' },
    });

    return department;
  }

  async update(id: string, updateDepartmentDto: UpdateDepartmentDto, user: any, businessIdHeader?: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const userId = user.userId || user.sub || user.id;

    const departmentCheck = await this.prisma.department.findFirst({ where: { id, businessId } });
    if (!departmentCheck) throw new NotFoundException('Department not found');

    const department = await this.prisma.department.update({
      where: { id },
      data: updateDepartmentDto,
    });

    await this.auditService.logAction({
      businessId,
      userId,
      action: 'UPDATE',
      resource: 'DEPARTMENT',
      resourceId: id,
      details: updateDepartmentDto,
    });

    return department;
  }

  async remove(id: string, user: any, businessIdHeader?: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const userId = user.userId || user.sub || user.id;

    const departmentCheck = await this.prisma.department.findFirst({ where: { id, businessId } });
    if (!departmentCheck) throw new NotFoundException('Department not found');

    const department = await this.prisma.department.delete({
      where: { id },
    });

    await this.auditService.logAction({
      businessId,
      userId,
      action: 'DELETE',
      resource: 'DEPARTMENT',
      resourceId: id,
    });

    return department;
  }
}
