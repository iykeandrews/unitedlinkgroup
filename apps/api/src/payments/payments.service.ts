import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UserRole } from '@unitedlinkgroup/types';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  private getUserId(user: any) {
    return user?.userId || user?.sub || user?.id;
  }

  private async validateBusinessAccess(targetBusinessId: string, user: any) {
    if (user?.role === UserRole.SUPER_ADMIN) return;

    const userId = this.getUserId(user);
    const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: userId } });
    if (ownedBusiness && ownedBusiness.id === targetBusinessId) return;

    const employee = await this.prisma.employee.findFirst({ where: { userId, businessId: targetBusinessId } });
    if (employee) return;

    throw new BadRequestException('Access denied: You do not have access to this business data');
  }

  private async resolveBusinessId(user: any, businessIdHeader?: string) {
    if (user?.role === UserRole.SUPER_ADMIN) {
      if (!businessIdHeader) throw new BadRequestException('Business context required for Super Admin');
      return businessIdHeader;
    }

    if (user?.businessId) return user.businessId as string;

    const userId = this.getUserId(user);
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (employee) return employee.businessId;

    const business = await this.prisma.business.findFirst({ where: { ownerId: userId } });
    if (business) return business.id;

    throw new BadRequestException('User is not associated with a business');
  }

  async create(createPaymentDto: CreatePaymentDto, user: any, businessIdHeader?: string) {
    const businessId = await this.resolveBusinessId(user, businessIdHeader);
    await this.validateBusinessAccess(businessId, user);

    return this.prisma.payment.create({
      data: {
        ...createPaymentDto,
        businessId,
      },
    });
  }

  async findAll(user: any, businessIdHeader?: string) {
    const businessId = await this.resolveBusinessId(user, businessIdHeader);
    await this.validateBusinessAccess(businessId, user);
    return this.prisma.payment.findMany({
      where: {
        businessId,
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  async findOne(id: string, user: any, businessIdHeader?: string) {
    const businessId = await this.resolveBusinessId(user, businessIdHeader);
    await this.validateBusinessAccess(businessId, user);
    const payment = await this.prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    // Check access
    if (payment.businessId !== businessId) {
         // Optionally throw Forbidden
         throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }
}
