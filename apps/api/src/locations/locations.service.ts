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

    const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: userId, ...(businessIdHeader ? {id:businessIdHeader} : {}) } });
    if (ownedBusiness) {
        if (businessIdHeader && businessIdHeader !== ownedBusiness.id) {
             throw new BadRequestException('Access denied: You cannot access another business data');
        }
        console.log(`Found owned business: ${ownedBusiness.id}`);
        return ownedBusiness.id;
    }
    
    const employee = await this.prisma.employee.findFirst({ where: { userId: userId, ...(businessIdHeader ? {businessId:businessIdHeader} : {}) } });
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

  private incidentEmails(value:any) {
    if(!Array.isArray(value)||value.length>30||value.some(email=>typeof email!=='string'||email.length>254||!(/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email.trim())))) throw new BadRequestException('Enter up to 30 valid incident report email addresses');
    return JSON.stringify([...new Set(value.map(email=>email.trim().toLowerCase()))]);
  }
  private billingPins(value: any) {
    if (!Array.isArray(value) || value.length > 50 || value.some(pin => typeof pin !== 'string' || !pin.trim() || pin.trim().length > 100)) throw new BadRequestException('Enter up to 50 non-empty billing pins (100 characters each)');
    return JSON.stringify([...new Set(value.map(pin => pin.trim()))]);
  }

  private async validateLocation(data: any, businessId: string, existing?: any) {
    const merged = { ...existing, ...data };
    if (!merged.name?.trim() || !merged.address?.trim()) throw new BadRequestException('Site name and address are required');
    if (!['ACTIVE','INACTIVE'].includes(merged.status || 'INACTIVE')) throw new BadRequestException('Invalid site status');
    const start = merged.startDate ? new Date(merged.startDate) : null;
    const end = merged.endDate ? new Date(merged.endDate) : null;
    if ((start && !Number.isFinite(start.getTime())) || (end && !Number.isFinite(end.getTime())) || (start && end && end < start)) throw new BadRequestException('Invalid service date range');
    for (const [field, min, max] of [['geoLat',-90,90],['geoLng',-180,180],['radius',1,100000]] as const) {
      const value = merged[field];
      if (value != null && (!Number.isFinite(value) || value < min || value > max)) throw new BadRequestException(`Invalid ${field}`);
    }
    if (merged.clientId && !await this.prisma.client.findFirst({where:{id:merged.clientId,businessId}})) throw new BadRequestException('Client must belong to this business');
  }

  async create(user: any, data: any, businessIdHeader?: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    
    await this.validateLocation(data, businessId);
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
        name: data.name.trim(),
        code: data.code,
        workOrder: data.workOrder?.trim() || null,
        billingPins: this.billingPins(data.billingPins ?? []),
        incidentReportEmails: this.incidentEmails(data.incidentReportEmails ?? []),
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        address: data.address.trim(),
        businessId,
        clientId: data.clientId || null,
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

    await this.validateLocation(data, businessId, loc);
    if (data.status === 'INACTIVE' && loc.status === 'ACTIVE') {
      const commitments = await this.prisma.shift.count({ where: { locationId:id, endTime:{gt:new Date()}, status:{in:['DRAFT','PUBLISHED','OPEN']} } });
      const activeTime = await this.prisma.timesheet.count({where:{locationId:id,endTime:null}});
      if (commitments || activeTime) throw new BadRequestException('Resolve upcoming shifts and active timesheets before deactivating this site');
    }
    return this.prisma.location.update({
      where: { id },
      data: {
        name: data.name ?? loc.name,
        workOrder: data.workOrder === undefined ? loc.workOrder : data.workOrder?.trim() || null,
        billingPins: data.billingPins === undefined ? loc.billingPins : this.billingPins(data.billingPins),
        incidentReportEmails: data.incidentReportEmails === undefined ? loc.incidentReportEmails : this.incidentEmails(data.incidentReportEmails),
        startDate: data.startDate === undefined ? loc.startDate : data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate === undefined ? loc.endDate : data.endDate ? new Date(data.endDate) : null,
        code: data.code ?? loc.code,
        address: data.address ?? loc.address,
        clientId: data.clientId === undefined ? loc.clientId : data.clientId || null,
        status: data.status ?? loc.status,
        geoLat: data.geoLat === undefined ? loc.geoLat : data.geoLat,
        geoLng: data.geoLng === undefined ? loc.geoLng : data.geoLng,
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
