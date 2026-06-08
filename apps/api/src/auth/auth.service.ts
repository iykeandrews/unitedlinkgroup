import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register.dto';
import { PrismaService } from '../prisma.service';
import { UserRole } from '@unitedlinkgroup/types';

const VENDOR_ROLE = 'VENDOR';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !pass) return null;

    const employeeByOfficialEmail = await this.prisma.employee.findFirst({
      where: {
        officialEmail: { equals: normalizedEmail, mode: 'insensitive' },
        status: 'ACTIVE',
        userId: { not: null },
      },
      include: { user: true },
    });

    const user = employeeByOfficialEmail?.user || (await this.usersService.findOne(normalizedEmail));
    if (!user) return null;
    if (user.role === VENDOR_ROLE) return null;

    const storedPassword = String(user.password || '');
    const storedLooksHashed = storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2y$');
    const passwordMatches = storedLooksHashed ? await bcrypt.compare(pass, storedPassword) : pass === storedPassword;
    if (!passwordMatches) return null;
    if (!storedLooksHashed) {
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(pass, salt);
      await this.prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } });
    }

    const employee = employeeByOfficialEmail || (await this.prisma.employee.findFirst({ where: { userId: user.id } }));
    if (employee && (employee.role === 'EMPLOYEE' || employee.role === 'MANAGER')) {
      if (!employee.officialEmail || normalizedEmail !== employee.officialEmail.toLowerCase()) {
        return null;
      }
    }

    const { password, ...result } = user;
    if (employee && (employee.role === 'EMPLOYEE' || employee.role === 'MANAGER')) {
      return {
        ...result,
        role: employee.role,
        businessId: employee.businessId,
        employeeId: employee.id,
      };
    }
    return result;
  }

  async validateVendorUser(email: string, pass: string, portalSlug?: string): Promise<any> {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const user = await this.usersService.findOne(normalizedEmail);
    if (!user || user.role !== VENDOR_ROLE) return null;
    if (!(await bcrypt.compare(pass, user.password))) return null;

    const normalizedSlug = String(portalSlug || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const vendor = await (this.prisma as any).vendor.findFirst({
      where: {
        userId: user.id,
        status: 'ACTIVE',
        ...(normalizedSlug ? { portalSlug: normalizedSlug } : {}),
      },
    });
    if (!vendor) return null;

    return {
      ...user,
      role: VENDOR_ROLE,
      businessId: vendor.businessId,
      vendorId: vendor.id,
      portalSlug: vendor.portalSlug,
    };
  }

  async login(user: any) {
    let businessId: string | undefined;
    let business: any | undefined;
    let vendor: any | undefined;
    
    // Check if employee
    const employee = await this.prisma.employee.findFirst({ where: { userId: user.id } });
    if (employee) {
      businessId = employee.businessId;
    } else {
      vendor = await (this.prisma as any).vendor.findFirst({ where: { userId: user.id } });
      if (vendor) {
        businessId = vendor.businessId;
      } else {
      // Check if owner
        const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: user.id } });
        if (ownedBusiness) {
          businessId = ownedBusiness.id;
        }
      }
    }

    if (businessId) {
      business = await this.prisma.business.findUnique({
        where: { id: businessId },
        select: {
          id: true,
          name: true,
          logoUrl: true,
          ein: true,
          mobile: true,
          address: true,
          city: true,
          state: true,
          zip: true,
          country: true,
          currencyCode: true,
          ownerId: true,
          modules: true,
          createdAt: true,
          updatedAt: true
        }
      });
    }

    const effectiveRole = user.businessId && (user.role === UserRole.EMPLOYEE || user.role === UserRole.MANAGER) ? user.role : user.role;
    const payload: any = { 
        email: user.email, 
        sub: user.id,
        role: effectiveRole,
        businessId: user.businessId || businessId,
        ...(vendor?.id || user.vendorId ? { vendorId: vendor?.id || user.vendorId } : {}),
        ...(vendor?.portalSlug || user.portalSlug ? { portalSlug: vendor?.portalSlug || user.portalSlug } : {}),
    };
    return {
      access_token: this.jwtService.sign(payload),
      businessId,
      business,
      employeeType: employee?.type || null,
      vendor: vendor
        ? {
            id: vendor.id,
            companyName: vendor.companyName,
            portalSlug: vendor.portalSlug,
            status: vendor.status,
          }
        : undefined,
    };
  }
  
  async getEnhancedProfile(user: any, businessId?: string) {
      if (user?.role === VENDOR_ROLE) {
        const vendor = await (this.prisma as any).vendor.findFirst({
          where: { userId: user.userId },
          select: { id: true, businessId: true, portalSlug: true, companyName: true, status: true },
        });
        return {
          ...user,
          vendorId: vendor?.id,
          businessId: vendor?.businessId || user.businessId,
          portalSlug: vendor?.portalSlug || user.portalSlug,
          companyName: vendor?.companyName,
          status: vendor?.status || user.status,
        };
      }
      const employee = await this.prisma.employee.findFirst({
        where: { userId: user.userId, ...(businessId ? { businessId } : {}) },
      });
      const fallback = employee ? null : await this.prisma.employee.findFirst({ where: { userId: user.userId } });
      return {
          ...user,
          employeeId: employee?.id || fallback?.id,
          businessId: employee?.businessId || fallback?.businessId || user.businessId,
          employeeType: employee?.type || fallback?.type || null,
      };
  }

  async getVendorProfile(user: any) {
    if (user?.role !== VENDOR_ROLE) throw new UnauthorizedException('Vendor access required');
    const vendor = await (this.prisma as any).vendor.findFirst({
      where: { userId: user.userId, status: 'ACTIVE' },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            industry: true,
            businessType: true,
            address: true,
            city: true,
            state: true,
            country: true,
            currencyCode: true,
          },
        },
      },
    });
    if (!vendor) throw new UnauthorizedException('Vendor account is inactive');
    return {
      userId: user.userId,
      role: VENDOR_ROLE,
      vendorId: vendor.id,
      businessId: vendor.businessId,
      portalSlug: vendor.portalSlug,
      companyName: vendor.companyName,
      email: vendor.email,
      status: vendor.status,
      business: vendor.business,
    };
  }

  async register(registerDto: RegisterDto) {
      const { email, password, firstName, lastName, businessName } = registerDto;

      // 1. Check if user exists
      const existingUser = await this.usersService.findOne(email);
      if (existingUser) {
          throw new UnauthorizedException('User already exists');
      }

      // 2. Hash password
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(password, salt);

      // 3. Transaction: Create User -> Business -> Employee
      return this.prisma.$transaction(async (tx: any) => {
          // Create User
          const user = await tx.user.create({
              data: {
                  email,
                  password: hashedPassword,
                  firstName,
                  lastName,
                  role: UserRole.BUSINESS_ADMIN,
              }
          });

          // Create Business
          const business = await tx.business.create({
              data: {
                  name: businessName,
                  ein: 'PENDING',
                  address: '', 
                  ownerId: user.id,
              }
          });

          // Create Employee Record
          await tx.employee.create({
              data: {
                  firstName,
                  lastName,
                  email,
                  businessId: business.id,
                  userId: user.id,
                  role: UserRole.BUSINESS_ADMIN,
                  type: 'FULL_TIME',
                  payType: 'SALARY',
                  status: 'ACTIVE'
              }
          });

          return user;
      });
  }

  async bootstrap(registerDto: RegisterDto) {
    const count = await this.prisma.user.count();
    if (count > 0) {
      throw new BadRequestException('Bootstrap is disabled once users exist');
    }
    const user = await this.register(registerDto);
    return this.login(user);
  }

  async getUserCount() {
    return this.prisma.user.count();
  }
}
