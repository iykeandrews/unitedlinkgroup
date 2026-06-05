import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(createRoleDto: CreateRoleDto, businessId: string, userId: string) {
    // Check if role name exists
    const existing = await this.prisma.role.findUnique({
      where: {
        businessId_name: {
          businessId,
          name: createRoleDto.name,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Role with this name already exists');
    }

    const role = await this.prisma.role.create({
      data: {
        name: createRoleDto.name,
        description: createRoleDto.description,
        permissions: JSON.stringify(createRoleDto.permissions),
        businessId,
      },
    });

    await this.auditService.logAction({
      businessId,
      userId,
      action: 'CREATE',
      resource: 'ROLE',
      resourceId: role.id,
      details: createRoleDto,
    });

    return role;
  }

  async findAll(businessId: string) {
    const roles = await this.prisma.role.findMany({
      where: { businessId },
      include: {
        _count: {
          select: { employees: true }
        }
      },
      orderBy: { name: 'asc' },
    });

    return roles.map(role => ({
      ...role,
      permissions: JSON.parse(role.permissions),
      memberCount: role._count.employees,
    }));
  }

  async getRoleMembers(id: string, businessId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        employees: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            departmentId: true,
          }
        }
      }
    });

    if (!role || role.businessId !== businessId) {
        throw new BadRequestException('Role not found');
    }

    return role.employees;
  }

  async addMember(id: string, employeeId: string, userId: string, businessId: string) {
    // Verify employee belongs to business
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, businessId }
    });

    if (!employee) {
      throw new BadRequestException('Employee not found');
    }

    const updatedEmployee = await this.prisma.employee.update({
      where: { id: employeeId },
      data: { customRoleId: id },
    });

    await this.auditService.logAction({
      businessId,
      userId,
      action: 'UPDATE',
      resource: 'ROLE',
      resourceId: id,
      details: { action: 'ADD_MEMBER', employeeId },
    });

    return updatedEmployee;
  }

  async removeMember(id: string, employeeId: string, userId: string, businessId: string) {
    // Verify employee belongs to business and role
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, businessId, customRoleId: id }
    });
    
    if (!employee) {
      throw new BadRequestException('Employee not found in this role');
    }

    const updatedEmployee = await this.prisma.employee.update({
      where: { id: employeeId },
      data: { customRoleId: null },
    });

    await this.auditService.logAction({
      businessId,
      userId,
      action: 'UPDATE',
      resource: 'ROLE',
      resourceId: id,
      details: { action: 'REMOVE_MEMBER', employeeId },
    });

    return updatedEmployee;
  }

  async findOne(id: string, businessId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role || (role.businessId !== businessId && !role.isSystem)) return null;
    // If system role, it might be accessible by all? 
    // Usually system roles have businessId=null. If so, we can allow access.
    // If businessId is set on role, it must match.
    if (role.businessId && role.businessId !== businessId) return null;

    return {
      ...role,
      permissions: JSON.parse(role.permissions),
    };
  }

  async update(id: string, updateRoleDto: UpdateRoleDto, userId: string, businessId: string) {
    const existing = await this.findOne(id, businessId);
    if (!existing) throw new BadRequestException('Role not found or access denied');
    
    // System roles usually shouldn't be updated by business admins, maybe blocked?
    if (existing.isSystem) throw new BadRequestException('Cannot update system roles');

    const data: any = { ...updateRoleDto };
    if (updateRoleDto.permissions) {
      data.permissions = JSON.stringify(updateRoleDto.permissions);
    }

    const role = await this.prisma.role.update({
      where: { id },
      data,
    });

    await this.auditService.logAction({
      businessId,
      userId,
      action: 'UPDATE',
      resource: 'ROLE',
      resourceId: id,
      details: updateRoleDto,
    });

    return role;
  }

  async remove(id: string, userId: string, businessId: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (role && role.isSystem) {
      throw new BadRequestException('Cannot delete system roles');
    }
    const deletedRole = await this.prisma.role.delete({
      where: { id },
    });

    await this.auditService.logAction({
      businessId,
      userId,
      action: 'DELETE',
      resource: 'ROLE',
      resourceId: id,
    });

    return deletedRole;
  }
}
