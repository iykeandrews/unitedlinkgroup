import { Injectable, BadRequestException, NotFoundException, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EncryptionService } from '../common/security/encryption.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PushService } from '../push/push.service';
import { UserRole } from '@unitedlinkgroup/types';
import * as bcrypt from 'bcryptjs';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
    private notificationsService: NotificationsService,
    private push: PushService
  ) {}

  private async getBusinessId(user: any, businessIdHeader?: string): Promise<string> {
    // 1. Resolve User's Business ID (if not Super Admin)
    let userBusinessId: string | null = null;
    
    if (user.role !== UserRole.SUPER_ADMIN) {
        const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: user.userId } });
        if (ownedBusiness) {
            userBusinessId = ownedBusiness.id;
        } else {
            const employee = await this.prisma.employee.findFirst({ where: { userId: user.userId } });
            if (employee) {
                userBusinessId = employee.businessId;
            }
        }
        
        if (!userBusinessId) {
            throw new BadRequestException('User is not associated with a business');
        }
    }

    // 2. Validate Header vs Actual
    if (businessIdHeader) {
        if (user.role === UserRole.SUPER_ADMIN) {
            return businessIdHeader;
        }
        if (userBusinessId && businessIdHeader !== userBusinessId) {
             throw new BadRequestException('Access denied: Cannot access another business data');
        }
        return userBusinessId!;
    }

    // 3. Fallback
    if (user.role === UserRole.SUPER_ADMIN) {
        throw new BadRequestException('Business context required for Super Admin');
    }
    
    return userBusinessId!;
  }

  async findAll(user: any, status?: string, businessIdHeader?: string) {
    try {
      const businessId = await this.getBusinessId(user, businessIdHeader);
      const where: any = { businessId };
      if (status) {
        where.status = status;
      }
      const employees = await this.prisma.employee.findMany({
        where,
        include: { w2Profile: true, contractorProfile: true, customRole: true },
        orderBy: { lastName: 'asc' },
      });
      
      // Decrypt sensitive data
      return employees.map(e => ({
          ...e,
          ssn: e.ssn ? this.encryptionService.decrypt(e.ssn) : e.ssn
      }));
    } catch (error) {
      console.error('Error in EmployeesService.findAll:', error);
      throw error;
    }
  }

  async listChatDirectory(user: any, businessIdHeader?: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const me = await this.prisma.employee.findFirst({
      where: { businessId, userId: user.userId },
      select: { id: true },
    });

    const employees = await this.prisma.employee.findMany({
      where: {
        businessId,
        status: 'ACTIVE',
        userId: { not: null },
        ...(me?.id ? { id: { not: me.id } } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        preferredName: true,
        email: true,
        badgeNumber: true,
        status: true,
        profileImageUrl: true,
        role: true,
        customRole: { select: { name: true } },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    return employees.map((employee) => {
      const preferredName = String(employee.preferredName || '').trim();
      const firstName = String(employee.firstName || '').trim();
      const lastName = String(employee.lastName || '').trim();
      return {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        preferredName: employee.preferredName,
        displayName: preferredName || [firstName, lastName].filter(Boolean).join(' ').trim() || employee.email,
        email: employee.email,
        badgeNumber: employee.badgeNumber,
        status: employee.status,
        profileImageUrl: employee.profileImageUrl,
        role: employee.role,
        customRole: employee.customRole,
      };
    });
  }

  async findOne(user: any, id: string, businessIdHeader?: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const employee = await this.prisma.employee.findFirst({
      where: { id, businessId },
      include: { w2Profile: true, contractorProfile: true, customRole: true },
    });
    
    if (!employee) throw new NotFoundException('Employee not found');
    
    // Decrypt sensitive data
    if (employee.ssn) {
        employee.ssn = this.encryptionService.decrypt(employee.ssn);
    }
    
    return employee;
  }

  async getMe(user: any, businessIdHeader?: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const employee = await this.prisma.employee.findFirst({
      where: { businessId, userId: user.userId },
      include: { w2Profile: true, contractorProfile: true, customRole: true },
    });

    if (!employee) throw new NotFoundException('Employee not found');

    if (employee.ssn) {
      employee.ssn = this.encryptionService.decrypt(employee.ssn);
    }

    return employee;
  }

  async updateMyProfileImage(user: any, profileImageUrl: string, businessIdHeader?: string) {
    const employee = await this.getMe(user, businessIdHeader);
    const url = String(profileImageUrl || '').trim();
    if (!url) throw new BadRequestException('Profile image URL is required');
    if (!url.startsWith('/uploads/')) throw new BadRequestException('Invalid profile image URL');
    return this.prisma.employee.update({
      where: { id: employee.id },
      data: { profileImageUrl: url },
    });
  }

  async updateMyPassword(
    user: any,
    input: { currentPassword: string; newPassword: string },
    businessIdHeader?: string
  ) {
    const employee = await this.getMe(user, businessIdHeader);
    const currentPassword = String(input?.currentPassword || '');
    const newPassword = String(input?.newPassword || '');

    if (!currentPassword || !newPassword) throw new BadRequestException('Current password and new password are required');
    if (newPassword.length < 8) throw new BadRequestException('New password must be at least 8 characters');

    const userId = user?.userId;
    if (!userId) throw new BadRequestException('User is not authenticated');

    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, password: true } });
    if (!u) throw new BadRequestException('User account not found');

    const ok = await bcrypt.compare(currentPassword, u.password);
    if (!ok) throw new BadRequestException('Current password is incorrect');

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: u.id },
      data: { password: hashedPassword },
    });

    if (!employee.userId) {
      await this.prisma.employee.update({ where: { id: employee.id }, data: { userId: u.id } });
    }

    return { ok: true };
  }

  async updateMyBio(user: any, data: any, businessIdHeader?: string) {
    const employee = await this.getMe(user, businessIdHeader);

    const next: any = {};
    const allow = [
      'preferredName',
      'pronouns',
      'phone',
      'address',
      'city',
      'state',
      'zip',
      'country',
      'emergencyContactName',
      'emergencyContactPhone',
      'dateOfBirth',
    ];

    for (const key of allow) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        next[key] = data[key];
      }
    }

    if (next.preferredName !== undefined) next.preferredName = String(next.preferredName || '').trim() || null;
    if (next.pronouns !== undefined) next.pronouns = String(next.pronouns || '').trim() || null;
    if (next.phone !== undefined) next.phone = String(next.phone || '').trim() || null;
    if (next.address !== undefined) next.address = String(next.address || '').trim() || null;
    if (next.city !== undefined) next.city = String(next.city || '').trim() || null;
    if (next.state !== undefined) next.state = String(next.state || '').trim() || null;
    if (next.zip !== undefined) next.zip = String(next.zip || '').trim() || null;
    if (next.country !== undefined) next.country = String(next.country || '').trim() || null;
    if (next.emergencyContactName !== undefined) next.emergencyContactName = String(next.emergencyContactName || '').trim() || null;
    if (next.emergencyContactPhone !== undefined) next.emergencyContactPhone = String(next.emergencyContactPhone || '').trim() || null;
    if (next.dateOfBirth !== undefined) {
      if (!next.dateOfBirth) next.dateOfBirth = null;
      else {
        const d = new Date(next.dateOfBirth);
        if (!Number.isFinite(d.getTime())) throw new BadRequestException('Invalid date of birth');
        next.dateOfBirth = d;
      }
    }

    return this.prisma.employee.update({
      where: { id: employee.id },
      data: next,
    });
  }

  async getExpiringQualifications(user: any, businessIdHeader?: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    const whereClause: any = {
      employee: {
        businessId,
      },
      OR: [
        { status: 'EXPIRED' },
        {
          expiryDate: {
            lte: ninetyDaysFromNow,
          },
          status: 'ACTIVE',
        },
      ],
    };

    // If user is an employee, only show their qualifications
    if (user.role === UserRole.EMPLOYEE) {
      const employee = await this.prisma.employee.findFirst({
        where: { userId: user.userId, businessId },
      });
      if (employee) {
        whereClause.employeeId = employee.id;
      }
    }

    const qualifications = await this.prisma.qualification.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        expiryDate: 'asc',
      },
    });

    return qualifications;
  }

  async getAllQualifications(user: any, businessIdHeader?: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);

    const qualifications = await this.prisma.qualification.findMany({
      where: {
        employee: {
          businessId,
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: {
        expiryDate: 'asc',
      },
    });

    return qualifications;
  }

  async getMyQualifications(user: any, businessIdHeader?: string) {
    const employee = await this.getMe(user, businessIdHeader);
    return this.prisma.qualification.findMany({
      where: { employeeId: employee.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addMyQualification(user: any, data: any, businessIdHeader?: string) {
    const employee = await this.getMe(user, businessIdHeader);
    let status = data.status || 'ACTIVE';
    if (data.expiryDate && new Date(data.expiryDate) < new Date()) {
      status = 'EXPIRED';
    }
    return this.prisma.qualification.create({
      data: {
        ...data,
        status,
        employeeId: employee.id,
      },
    });
  }

  async updateMyQualification(user: any, qualificationId: string, data: any, businessIdHeader?: string) {
    const employee = await this.getMe(user, businessIdHeader);
    const qual = await this.prisma.qualification.findFirst({ where: { id: qualificationId, employeeId: employee.id } });
    if (!qual) throw new NotFoundException('Qualification not found');

    if (data.expiryDate) {
      if (new Date(data.expiryDate) < new Date()) {
        data.status = 'EXPIRED';
      }
    }
    return this.prisma.qualification.update({
      where: { id: qualificationId },
      data,
    });
  }

  async deleteMyQualification(user: any, qualificationId: string, businessIdHeader?: string) {
    const employee = await this.getMe(user, businessIdHeader);
    const qual = await this.prisma.qualification.findFirst({ where: { id: qualificationId, employeeId: employee.id } });
    if (!qual) throw new NotFoundException('Qualification not found');
    return this.prisma.qualification.delete({ where: { id: qualificationId } });
  }

  async listMyAvailability(user: any, businessIdHeader?: string) {
    const employee = await this.getMe(user, businessIdHeader);
    return (this.prisma as any).availability.findMany({
      where: { employeeId: employee.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createMyAvailability(user: any, body: any, businessIdHeader?: string) {
    const employee = await this.getMe(user, businessIdHeader);
    const {
      isAvailable,
      startDate,
      endDate,
      allDay = true,
      repeat = 'DOES_NOT_REPEAT',
      repeatDays,
      endOption,
      endOn,
      comment,
    } = body;

    return (this.prisma as any).availability.create({
      data: {
        employeeId: employee.id,
        isAvailable: !!isAvailable,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        allDay,
        repeat,
        repeatDays: Array.isArray(repeatDays) ? repeatDays.join(',') : repeatDays,
        endOption,
        endOn: endOn ? new Date(endOn) : null,
        comment,
      },
    });
  }

  async updateMyAvailability(user: any, availabilityId: string, body: any, businessIdHeader?: string) {
    const employee = await this.getMe(user, businessIdHeader);
    const record = await (this.prisma as any).availability.findUnique({ where: { id: availabilityId } });
    if (!record || record.employeeId !== employee.id) {
      throw new NotFoundException('Availability not found');
    }
    const data: any = { ...body };
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);
    if (data.endOn) data.endOn = new Date(data.endOn);
    if (Array.isArray(data.repeatDays)) data.repeatDays = data.repeatDays.join(',');
    return (this.prisma as any).availability.update({
      where: { id: availabilityId },
      data,
    });
  }

  async deleteMyAvailability(user: any, availabilityId: string, businessIdHeader?: string) {
    const employee = await this.getMe(user, businessIdHeader);
    const record = await (this.prisma as any).availability.findUnique({ where: { id: availabilityId } });
    if (!record || record.employeeId !== employee.id) {
      throw new NotFoundException('Availability not found');
    }
    return (this.prisma as any).availability.delete({ where: { id: availabilityId } });
  }

  async getAllAvailabilities(user: any, businessIdHeader?: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);

    return (this.prisma as any).availability.findMany({
      where: {
        employee: {
          businessId,
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async create(user: any, data: any, businessIdHeader?: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    
    // Check if email already exists in this business
    const existing = await this.prisma.employee.findFirst({
        where: { 
            businessId,
            email: data.email 
        }
    });

    if (existing) throw new BadRequestException('Employee with this email already exists in this business');

    // Encrypt sensitive data
    const { w2Profile, contractorProfile, ...restData } = data;
    const empData = { ...restData };
    if (empData.ssn) {
        empData.ssn = this.encryptionService.encrypt(empData.ssn);
    }

    return this.prisma.employee.create({
      data: {
        ...empData,
        ...(String(empData.role || '').toUpperCase() === 'EMPLOYEE' ? { type: 'ONBOARDING' } : {}),
        businessId,
        w2Profile: w2Profile ? { create: w2Profile } : undefined,
        contractorProfile: contractorProfile ? { create: contractorProfile } : undefined
      },
      include: { w2Profile: true, contractorProfile: true },
    });
  }

  async addQualification(user: any, employeeId: string, data: any, businessIdHeader?: string) {
    await this.findOne(user, employeeId, businessIdHeader);
    
    // Auto status update based on expiry
    let status = data.status || 'ACTIVE';
    if (data.expiryDate && new Date(data.expiryDate) < new Date()) {
      status = 'EXPIRED';
    }

    return this.prisma.qualification.create({
      data: {
        ...data,
        status,
        employeeId
      }
    });
  }

  async updateQualification(user: any, qualificationId: string, data: any, businessIdHeader?: string) {
    const qual = await this.prisma.qualification.findUnique({ where: { id: qualificationId } });
    if (!qual) throw new NotFoundException('Qualification not found');
    
    await this.findOne(user, qual.employeeId, businessIdHeader);

    // Auto status update based on expiry
    if (data.expiryDate) {
      if (new Date(data.expiryDate) < new Date()) {
        data.status = 'EXPIRED';
      }
    }

    return this.prisma.qualification.update({
      where: { id: qualificationId },
      data
    });
  }

  @Cron(CronExpression.EVERY_HOUR)
  async checkExpiringQualifications() {
    this.logger.log('Running checkExpiringQualifications cron job...');
    const now = new Date();

    // 1. Auto-update EXPIRED status
    // Find all active qualifications that have expired
    const expired = await this.prisma.qualification.findMany({
      where: {
        status: { not: 'EXPIRED' },
        expiryDate: { lt: now }
      }
    });

    if (expired.length > 0) {
      this.logger.log(`Found ${expired.length} expired qualifications. Updating status...`);
      await this.prisma.qualification.updateMany({
        where: {
          id: { in: expired.map(q => q.id) }
        },
        data: { status: 'EXPIRED' }
      });
    }

    const expiringCandidates = await this.prisma.qualification.findMany({
      where: {
        status: 'ACTIVE',
        expiryDate: { not: null, gt: now },
        type: { in: ['CERTIFICATION', 'LICENSE'] },
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, userId: true } },
      },
    });

    for (const qual of expiringCandidates) {
      const employee = (qual as any).employee;
      const userId = employee?.userId;
      if (!userId) continue;
      if (!qual.expiryDate) continue;

      const diffMs = new Date(qual.expiryDate).getTime() - now.getTime();
      const daysUntil = diffMs / (1000 * 60 * 60 * 24);

      let cadence: '48H' | '24H' | null = null;
      let title = '';
      let message = '';

      if (daysUntil >= 60 && daysUntil <= 90) {
        cadence = '48H';
        title = 'Certification/license renewal reminder';
        message = `Your ${String(qual.type).toLowerCase()} "${qual.name}" expires on ${new Date(qual.expiryDate).toLocaleDateString()}. Please renew it soon.`;
      } else if (String(qual.type).toUpperCase() === 'LICENSE' && daysUntil > 0 && daysUntil < 30) {
        cadence = '24H';
        title = 'License expiring soon';
        message = `Your license "${qual.name}" expires on ${new Date(qual.expiryDate).toLocaleDateString()}. Renew now to avoid interruption.`;
      }

      if (!cadence) continue;

      const intervalHours = cadence === '48H' ? 48 : 24;
      const cutoff = new Date(now.getTime() - intervalHours * 60 * 60 * 1000);
      const needle = `"qualificationId":"${qual.id}"`;
      const cadenceNeedle = `"cadence":"${cadence}"`;
      const existing = await this.prisma.notification.findFirst({
        where: {
          userId,
          type: 'WARNING',
          createdAt: { gte: cutoff },
          AND: [{ metadata: { contains: needle } }, { metadata: { contains: cadenceNeedle } }],
        },
        select: { id: true },
      });
      if (existing) continue;

      const metadata = { kind: 'QUALIFICATION_REMINDER', qualificationId: qual.id, cadence };
      await this.notificationsService.createNotification(userId, 'WARNING', title, message, metadata);
      await this.notificationsService.sendPush(userId, { type: 'WARNING', title, message, metadata });
      await this.push.send(userId, { type: 'WARNING', title, message, metadata, actionUrl: '/dashboard/profile?tab=qualifications' });
    }
  }

  async deleteQualification(user: any, qualificationId: string, businessIdHeader?: string) {
    const qual = await this.prisma.qualification.findUnique({ where: { id: qualificationId } });
    if (!qual) throw new NotFoundException('Qualification not found');

    await this.findOne(user, qual.employeeId, businessIdHeader);

    return this.prisma.qualification.delete({
      where: { id: qualificationId }
    });
  }

  async getQualifications(user: any, employeeId: string, businessIdHeader?: string) {
    await this.findOne(user, employeeId, businessIdHeader);

    return this.prisma.qualification.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async update(user: any, id: string, data: any, businessIdHeader?: string) {
    let businessId: string;
    let employee: any;

    if (user.role === UserRole.SUPER_ADMIN && !businessIdHeader) {
      employee = await this.prisma.employee.findUnique({ where: { id } });
      if (!employee) throw new NotFoundException('Employee not found');
      businessId = employee.businessId;
    } else {
      businessId = await this.getBusinessId(user, businessIdHeader);
      employee = await this.prisma.employee.findFirst({
        where: { id, businessId },
      });
      if (!employee) throw new NotFoundException('Employee not found');
    }

    if (data?.type !== undefined) {
      const requestedType = String(data.type || '').toUpperCase();
      const currentType = String(employee?.type || '').toUpperCase();
      if (currentType === 'ONBOARDING') {
        if (user.role !== UserRole.SUPER_ADMIN) {
          throw new ForbiddenException('Only superadmin can move an employee out of onboarding');
        }
        if (requestedType !== 'FULL_TIME' && requestedType !== 'PART_TIME') {
          throw new BadRequestException('Onboarding employees can only be set to FULL_TIME or PART_TIME');
        }
      }
      data.type = requestedType;
    }

    // Handle password update
    if (data.password) {
      if (!employee.officialEmail) {
        throw new BadRequestException('Official email must be set before assigning a password');
      }
      const hashedPassword = await bcrypt.hash(data.password, 10);
      
      if (employee.userId) {
        // Update existing user
        await this.prisma.user.update({
          where: { id: employee.userId },
          data: { password: hashedPassword, email: employee.officialEmail }
        });
      } else {
        // Check if user exists with official email
        const existingUser = await this.prisma.user.findUnique({ where: { email: employee.officialEmail } });
        
        if (existingUser) {
          // Update password and link
          await this.prisma.user.update({
            where: { id: existingUser.id },
            data: { password: hashedPassword }
          });
          await this.prisma.employee.update({
            where: { id: employee.id },
            data: { userId: existingUser.id }
          });
        } else {
          // Create new user
          const newUser = await this.prisma.user.create({
            data: {
              email: employee.officialEmail,
              password: hashedPassword,
              firstName: employee.firstName,
              lastName: employee.lastName,
              role: 'EMPLOYEE'
            }
          });
          await this.prisma.employee.update({
            where: { id: employee.id },
            data: { userId: newUser.id }
          });
        }
      }
      
      // Remove password from data as it's not in Employee model
      delete data.password;
    }

    // Encrypt sensitive data in update
    const { w2Profile, contractorProfile, ...restData } = data;
    
    // Clean up employee data - remove system fields and relations
    const systemFields = ['id', 'businessId', 'createdAt', 'updatedAt', 'user', 'business', 'userId'];
    const relationFields = [
      'payStubs',
      'shifts',
      'timesheets',
      'leaveRequests',
      'leaveBalances',
      'loans',
      'availabilities',
      'availability',
      'shiftApplications',
      'customRole',
      'department',
      'managedDepartments',
      'qualifications',
      'assignedAssets',
      'assignmentHistory',
      'defaultLocation',
      'supervisor',
      'supervisees',
      'chatParticipants',
      'chatMessages',
      'chatReactions',
    ];
    
    const updateData: any = { ...restData };
    
    // Remove system fields and relations from updateData
    [...systemFields, ...relationFields].forEach(field => delete updateData[field]);

    if (updateData.ssn) {
        updateData.ssn = this.encryptionService.encrypt(updateData.ssn);
    }

    const finalData: any = { ...updateData };

    if (w2Profile) {
      // Clean up w2Profile
      const { id, employeeId, createdAt, updatedAt, employee, ...w2Data } = w2Profile;
      
      // Ensure required fields for create (if upsert creates)
      // We rely on frontend validation, but providing defaults helps avoid 500s
      const w2Create = {
        paySchedule: 'BI_WEEKLY',
        payType: 'HOURLY',
        rate: 0,
        overtimeEligible: true,
        ...w2Data
      };

      finalData.w2Profile = {
        upsert: {
          create: w2Create,
          update: w2Data
        }
      };
    }

    if (contractorProfile) {
      // Clean up contractorProfile
      const { id, employeeId, createdAt, updatedAt, employee, ...contractorData } = contractorProfile;
      
      const contractorCreate = {
          rate: 0,
          ...contractorData
      };

      finalData.contractorProfile = {
        upsert: {
          create: contractorCreate,
          update: contractorData
        }
      };
    }

    try {
      return await this.prisma.employee.update({
        where: { id },
        data: finalData,
        include: { w2Profile: true, contractorProfile: true },
      });
    } catch (error: any) {
      console.error(`Error updating employee ${id}:`, error);
      if (error.code === 'P2002') {
         throw new BadRequestException('Unique constraint violation');
      }
      throw new BadRequestException(`Failed to update employee: ${error.message}`);
    }
  }

  async listAvailability(user: any, employeeId: string, businessIdHeader?: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, businessId },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    return (this.prisma as any).availability.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createAvailability(user: any, employeeId: string, body: any, businessIdHeader?: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, businessId },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    const {
      isAvailable,
      startDate,
      endDate,
      allDay = true,
      repeat = 'DOES_NOT_REPEAT',
      repeatDays,
      endOption,
      endOn,
      comment
    } = body;
    return (this.prisma as any).availability.create({
      data: {
        employeeId,
        isAvailable: !!isAvailable,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        allDay,
        repeat,
        repeatDays: Array.isArray(repeatDays) ? repeatDays.join(',') : repeatDays,
        endOption,
        endOn: endOn ? new Date(endOn) : null,
        comment
      }
    });
  }

  async updateAvailability(user: any, employeeId: string, availabilityId: string, body: any, businessIdHeader?: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, businessId },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    const record = await (this.prisma as any).availability.findUnique({ where: { id: availabilityId } });
    if (!record || record.employeeId !== employeeId) {
      throw new NotFoundException('Availability not found');
    }
    const data: any = { ...body };
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);
    if (data.endOn) data.endOn = new Date(data.endOn);
    if (Array.isArray(data.repeatDays)) data.repeatDays = data.repeatDays.join(',');
    return (this.prisma as any).availability.update({
      where: { id: availabilityId },
      data
    });
  }

  async deleteAvailability(user: any, employeeId: string, availabilityId: string, businessIdHeader?: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, businessId },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    const record = await (this.prisma as any).availability.findUnique({ where: { id: availabilityId } });
    if (!record || record.employeeId !== employeeId) {
      throw new NotFoundException('Availability not found');
    }
    return (this.prisma as any).availability.delete({ where: { id: availabilityId } });
  }
}
