import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  private async validateBusinessAccess(targetBusinessId: string, user: any) {
    const business = await this.prisma.business.findUnique({ where: { id: targetBusinessId } });
    if (!business) {
      throw new BadRequestException('Business not found');
    }
    if (user.role === 'SUPER_ADMIN') return;
    
    const userId = user.userId || user.sub || user.id;

    // Check if user owns the business
    const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: userId } });
    if (ownedBusiness && ownedBusiness.id === targetBusinessId) return;

    // Check if user is an employee of the business
    const employee = await this.prisma.employee.findFirst({ 
        where: { userId: userId, businessId: targetBusinessId } 
    });
    if (employee) return;

    throw new BadRequestException('Access denied: You do not have access to this business data');
  }

  async create(user: any, createClientDto: CreateClientDto, businessId?: string) {
    const finalBusinessId = businessId || createClientDto.businessId;
    if (!finalBusinessId) {
      throw new BadRequestException('Business ID is required');
    }

    await this.validateBusinessAccess(finalBusinessId, user);

    return this.prisma.client.create({
      data: {
        ...createClientDto,
        businessId: finalBusinessId,
      } as any,
    });
  }

  async findAll(user: any, businessId?: string) {
    if (!businessId) throw new BadRequestException('Business ID is required');
    
    await this.validateBusinessAccess(businessId, user);

    return this.prisma.client.findMany({
      where: { businessId },
      include: {
        _count: {
          select: { locations: true }
        }
      }
    });
  }

  async findOne(id: string, user: any) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        locations: {
          include: {
            servicePins: true
          }
        }
      }
    });
    if (!client) throw new NotFoundException('Client not found');
    
    await this.validateBusinessAccess(client.businessId, user);
    
    return client;
  }

  async update(id: string, updateClientDto: UpdateClientDto, user: any) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('Client not found');

    await this.validateBusinessAccess(client.businessId, user);

    return this.prisma.client.update({
      where: { id },
      data: updateClientDto,
    });
  }

  async remove(id: string, user: any) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('Client not found');

    await this.validateBusinessAccess(client.businessId, user);

    return this.prisma.client.delete({
      where: { id },
    });
  }
}
