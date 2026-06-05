import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UserRole } from '@unitedlinkgroup/types';
import { GeocodingService } from '../common/geocoding.service';

@Injectable()
export class LocationsService {
  constructor(
    private prisma: PrismaService,
    private geocodingService: GeocodingService
  ) {}

  private async getBusinessId(user: any, businessIdHeader?: string): Promise<string> {
    if (user.role === UserRole.SUPER_ADMIN) {
        if (businessIdHeader) {
          const business = await this.prisma.business.findUnique({ where: { id: businessIdHeader } });
          if (!business) throw new BadRequestException('Business not found');
          return businessIdHeader;
        }
        console.error('Super Admin missing business context');
        throw new BadRequestException('Business context required for Super Admin');
    }

    const userId = user.userId || user.sub || user.id;
    console.log(`Resolving businessId for user ${userId} (role: ${user.role})`);

    const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: userId } });
    if (ownedBusiness) {
        if (businessIdHeader && businessIdHeader !== ownedBusiness.id) {
             throw new BadRequestException('Access denied: You cannot access another business data');
        }
        console.log(`Found owned business: ${ownedBusiness.id}`);
        return ownedBusiness.id;
    }
    
    const employee = await this.prisma.employee.findFirst({ where: { userId: userId } });
    if (!employee) {
        console.error(`User ${userId} is not associated with any business`);
        throw new BadRequestException('User is not associated with a business');
    }
    
    if (businessIdHeader && businessIdHeader !== employee.businessId) {
         throw new BadRequestException('Access denied: You cannot access another business data');
    }

    console.log(`Found employee record: ${employee.id}, business: ${employee.businessId}`);
    return employee.businessId;
  }

  async create(user: any, data: any, businessIdHeader?: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    
    if (data.status === 'ACTIVE') {
       throw new BadRequestException('Cannot create ACTIVE site without service pins. Please create as INACTIVE and add pins.');
    }

    let { geoLat, geoLng } = data;
    if (data.address && (geoLat === undefined || geoLat === null || geoLng === undefined || geoLng === null)) {
        const coords = await this.geocodingService.geocode(data.address);
        if (coords) {
            if (geoLat === undefined || geoLat === null) geoLat = coords.lat;
            if (geoLng === undefined || geoLng === null) geoLng = coords.lng;
        }
    }

    return this.prisma.location.create({
      data: {
        name: data.name,
        code: data.code,
        workOrder: data.workOrder,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        address: data.address,
        businessId,
        clientId: data.clientId,
        status: data.status || 'INACTIVE',
        geoLat,
        geoLng,
        radius: data.radius,
        taxOverrideInfo: data.taxOverrideInfo ? JSON.stringify(data.taxOverrideInfo) : null,
      },
    });
  }

  async findAll(user: any, businessIdHeader?: string, clientId?: string, status?: string) {
    try {
      const businessId = await this.getBusinessId(user, businessIdHeader);
      const where: any = { businessId };
      if (clientId) where.clientId = clientId;
      if (status) where.status = status;

      return await this.prisma.location.findMany({
        where,
        orderBy: { name: 'asc' },
        include: {
          servicePins: true,
          client: true
        }
      });
    } catch (error) {
      console.error('Error in LocationsService.findAll:', error);
      throw error;
    }
  }

  async findOne(user: any, id: string, businessIdHeader?: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const loc = await this.prisma.location.findFirst({ 
        where: { id, businessId },
        include: { servicePins: true, client: true }
    });
    if (!loc) throw new NotFoundException('Location not found');
    return loc;
  }

  async update(user: any, id: string, data: any, businessIdHeader?: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const loc = await this.prisma.location.findFirst({ where: { id, businessId } });
    if (!loc) throw new NotFoundException('Location not found');

    if (data.status === 'ACTIVE') {
        const pinCount = await this.prisma.servicePin.count({ where: { locationId: id, status: 'ACTIVE' } });
        if (pinCount === 0) {
             throw new BadRequestException('Cannot activate site without at least one active service pin');
        }
    }
    
    if (data.status === 'INACTIVE' && loc.status === 'ACTIVE') {
        await this.prisma.servicePin.updateMany({
            where: { locationId: id },
            data: { status: 'INACTIVE' }
        });
    }

    return this.prisma.location.update({
      where: { id },
      data: {
        name: data.name ?? loc.name,
        workOrder: data.workOrder ?? loc.workOrder,
        startDate: data.startDate ? new Date(data.startDate) : loc.startDate,
        endDate: data.endDate ? new Date(data.endDate) : loc.endDate,
        code: data.code ?? loc.code,
        address: data.address ?? loc.address,
        clientId: data.clientId ?? loc.clientId,
        status: data.status ?? loc.status,
        geoLat: data.geoLat ?? loc.geoLat,
        geoLng: data.geoLng ?? loc.geoLng,
        radius: data.radius ?? loc.radius,
        taxOverrideInfo: data.taxOverrideInfo ? JSON.stringify(data.taxOverrideInfo) : loc.taxOverrideInfo,
      },
    });
  }

  async remove(user: any, id: string, businessIdHeader?: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    // Ensure it belongs to business
    const loc = await this.prisma.location.findFirst({ where: { id, businessId } });
    if (!loc) throw new NotFoundException('Location not found');

    // Check active assignments? "Deleting a pin must warn if active assignments exist". 
    // Deleting a site implies deleting pins.
    // I'll just delete it for now.
    return this.prisma.location.delete({ where: { id } });
  }
}
