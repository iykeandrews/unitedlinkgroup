import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateServicePinDto } from './dto/create-service-pin.dto';
import { UpdateServicePinDto } from './dto/update-service-pin.dto';
import { UserRole } from '@unitedlinkgroup/types';

@Injectable()
export class ServicePinsService {
  constructor(private prisma: PrismaService) {}

  private async getBusinessId(user: any, businessIdHeader?: string): Promise<string> {
    if (user.role === UserRole.SUPER_ADMIN) {
        if (!businessIdHeader) throw new BadRequestException('Business context required for Super Admin');
        return businessIdHeader;
    }
    const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: user.userId } });
    if (ownedBusiness) return ownedBusiness.id;
    const employee = await this.prisma.employee.findFirst({ where: { userId: user.userId } });
    if (!employee) throw new BadRequestException('User is not associated with a business');
    return employee.businessId;
  }

  private async validateLocationAccess(locationId: string, businessId: string) {
      const location = await this.prisma.location.findFirst({
          where: { id: locationId, businessId }
      });
      if (!location) throw new NotFoundException('Location not found or access denied');
      return location;
  }

  async create(user: any, createServicePinDto: CreateServicePinDto, businessIdHeader?: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    
    // Validate that the location belongs to the business
    await this.validateLocationAccess(createServicePinDto.locationId, businessId);

    return this.prisma.servicePin.create({
      data: {
        locationId: createServicePinDto.locationId,
        positionType: createServicePinDto.positionType,
        count: createServicePinDto.count ?? 1,
        shiftType: createServicePinDto.shiftType,
        startTime: createServicePinDto.startTime,
        endTime: createServicePinDto.endTime,
        days: createServicePinDto.days,
        payRate: createServicePinDto.payRate,
        specialInstructions: createServicePinDto.specialInstructions,
        geoLat: createServicePinDto.geoLat,
        geoLng: createServicePinDto.geoLng,
        status: createServicePinDto.status || 'ACTIVE',
      },
    });
  }

  async findAllByLocation(user: any, locationId: string, businessIdHeader?: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    await this.validateLocationAccess(locationId, businessId);

    return this.prisma.servicePin.findMany({
      where: { locationId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(user: any, id: string, businessIdHeader?: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    
    const pin = await this.prisma.servicePin.findUnique({
        where: { id },
        include: { location: true }
    });

    if (!pin) throw new NotFoundException('Service Pin not found');
    if (pin.location.businessId !== businessId) throw new ForbiddenException('Access denied');

    return pin;
  }

  async update(user: any, id: string, updateServicePinDto: UpdateServicePinDto, businessIdHeader?: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const pin = await this.findOne(user, id, businessIdHeader); // Ensures existence and access

    return this.prisma.servicePin.update({
      where: { id },
      data: updateServicePinDto,
    });
  }

  async remove(user: any, id: string, businessIdHeader?: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const pin = await this.findOne(user, id, businessIdHeader); // Ensures existence and access

    // Check if there are active assignments (placeholder logic, assuming we'll check scheduling later)
    // For now, just allow deletion or soft delete. 
    // User Requirement: "warn on pin deletion with active assignments" -> Ideally we should check shifts.
    // Since scheduling isn't fully implemented or linked yet, we'll just delete.
    
    return this.prisma.servicePin.delete({
      where: { id },
    });
  }
}
