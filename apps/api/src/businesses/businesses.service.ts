import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { UserRole } from '@unitedlinkgroup/types';

@Injectable()
export class BusinessesService {
  constructor(private prisma: PrismaService) {}

  async setStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'DELETED') {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new BadRequestException('Business not found');
    if (business.status === 'DELETED' && status !== 'DELETED') {
      throw new BadRequestException('Deleted business cannot be reactivated');
    }
    return this.prisma.business.update({
      where: { id },
      data: { status },
      select: { id: true, name: true, status: true, updatedAt: true },
    });
  }

  async create(createBusinessDto: CreateBusinessDto, ownerId: string) {
    const { name, ein, mobile, country, businessType, industry, employeeCount, address, city, state, zip, modules } = createBusinessDto;
    
    const map: Record<string, { currencyCode: string; gov: any }> = {
      'United States': { currencyCode: 'USD', gov: { taxIdLabel: 'EIN', taxSystem: 'Sales Tax', defaultStandardRate: 0, note: 'Varies by state', inclusive: false } },
      'United Kingdom': { currencyCode: 'GBP', gov: { taxIdLabel: 'VAT Number', taxSystem: 'VAT', defaultStandardRate: 20, inclusive: false } },
      'Canada': { currencyCode: 'CAD', gov: { taxIdLabel: 'BN', taxSystem: 'GST/HST', defaultStandardRate: 5, note: 'HST varies by province', inclusive: false } },
      'Ghana': { currencyCode: 'GHS', gov: { taxIdLabel: 'TIN', taxSystem: 'VAT', defaultStandardRate: 15, inclusive: false } },
      'Nigeria': { currencyCode: 'NGN', gov: { taxIdLabel: 'TIN', taxSystem: 'VAT', defaultStandardRate: 7.5, inclusive: false } },
      'Kenya': { currencyCode: 'KES', gov: { taxIdLabel: 'PIN', taxSystem: 'VAT', defaultStandardRate: 16, inclusive: false } },
      'South Africa': { currencyCode: 'ZAR', gov: { taxIdLabel: 'VAT Number', taxSystem: 'VAT', defaultStandardRate: 15, inclusive: false } },
    };
    const info = country && map[country] ? map[country] : null;
    
    return this.prisma.business.create({
      data: {
        name,
        ein,
        mobile,
        country,
        businessType,
        industry,
        employeeCount,
        address,
        city,
        state,
        zip,
        modules,
        currencyCode: info?.currencyCode,
        governmentInfo: info?.gov ? JSON.stringify(info.gov) : undefined,
        owner: {
          connect: { id: ownerId },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.business.findMany({
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.business.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findMine(userId: string) {
    const business = await this.prisma.business.findFirst({ where: { ownerId: userId, status: { not: 'DELETED' } } });
    if (business) return business;

    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (employee) {
        return this.prisma.business.findFirst({ where: { id: employee.businessId, status: { not: 'DELETED' } } });
    }

    return null;
  }

  async update(id: string, updateBusinessDto: UpdateBusinessDto) {
    const existing = await this.prisma.business.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!existing) throw new BadRequestException('Business not found');
    if (existing.status === 'DELETED') throw new BadRequestException('Cannot update a deleted business');

    const { country } = updateBusinessDto;
    const dataToUpdate: any = { ...updateBusinessDto };

    if (country) {
       const map: Record<string, { currencyCode: string; gov: any }> = {
        'United States': { currencyCode: 'USD', gov: { taxIdLabel: 'EIN', taxSystem: 'Sales Tax', defaultStandardRate: 0, note: 'Varies by state', inclusive: false } },
        'United Kingdom': { currencyCode: 'GBP', gov: { taxIdLabel: 'VAT Number', taxSystem: 'VAT', defaultStandardRate: 20, inclusive: false } },
        'Canada': { currencyCode: 'CAD', gov: { taxIdLabel: 'BN', taxSystem: 'GST/HST', defaultStandardRate: 5, note: 'HST varies by province', inclusive: false } },
        'Ghana': { currencyCode: 'GHS', gov: { taxIdLabel: 'TIN', taxSystem: 'VAT', defaultStandardRate: 15, inclusive: false } },
        'Nigeria': { currencyCode: 'NGN', gov: { taxIdLabel: 'TIN', taxSystem: 'VAT', defaultStandardRate: 7.5, inclusive: false } },
        'Kenya': { currencyCode: 'KES', gov: { taxIdLabel: 'PIN', taxSystem: 'VAT', defaultStandardRate: 16, inclusive: false } },
        'South Africa': { currencyCode: 'ZAR', gov: { taxIdLabel: 'VAT Number', taxSystem: 'VAT', defaultStandardRate: 15, inclusive: false } },
      };
      const info = map[country];
      if (info) {
        // Only update if not explicitly provided in the update DTO (though usually they wouldn't be)
        if (!dataToUpdate.currencyCode) {
            dataToUpdate.currencyCode = info.currencyCode;
        }
        dataToUpdate.governmentInfo = JSON.stringify(info.gov);
      }
    }

    return this.prisma.business.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  async updateForUser(user: any, pathId: string | undefined, updateBusinessDto: UpdateBusinessDto, businessIdHeader?: string) {
    let validId: string | undefined;
    if (user.role === UserRole.SUPER_ADMIN) {
      if (!businessIdHeader) {
        throw new BadRequestException('Business context required for Super Admin');
      }
      validId = businessIdHeader;
    } else {
      const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: user.userId, status: { not: 'DELETED' } } });
      if (ownedBusiness) {
        validId = ownedBusiness.id;
      } else {
        const employee = await this.prisma.employee.findFirst({ where: { userId: user.userId } });
        if (!employee) throw new BadRequestException('User is not associated with a business');
        const business = await this.prisma.business.findFirst({ where: { id: employee.businessId, status: { not: 'DELETED' } }, select: { id: true } });
        if (!business) throw new BadRequestException('Business not found');
        validId = business.id;
      }
    }
    if (pathId && validId && pathId !== validId) {
      throw new ForbiddenException('Cannot update another business');
    }
    return this.update(validId!, updateBusinessDto);
  }
}
