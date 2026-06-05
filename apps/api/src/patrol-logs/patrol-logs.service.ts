import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreatePatrolLogDto } from './dto/create-patrol-log.dto';

@Injectable()
export class PatrolLogsService {
  constructor(private prisma: PrismaService) {}

  private async validateBusinessAccess(targetBusinessId: string, user: any) {
    if (user.role === 'SUPER_ADMIN') return;
    
    // Check if user owns the business
    const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: user.userId || user.sub || user.id } });
    if (ownedBusiness && ownedBusiness.id === targetBusinessId) return;

    // Check if user is an employee of the business
    const employee = await this.prisma.employee.findFirst({ 
        where: { userId: user.userId || user.sub || user.id, businessId: targetBusinessId } 
    });
    if (employee) return;

    throw new BadRequestException('Access denied: You do not have access to this business data');
  }

  async create(userId: string, createPatrolLogDto: CreatePatrolLogDto, user?: any) {
    if (user) {
        // Validate access to the service pin's business
        const servicePin = await this.prisma.servicePin.findUnique({
            where: { id: createPatrolLogDto.servicePinId },
            include: { location: true }
        });
        if (!servicePin) throw new BadRequestException('Service Pin not found');
        await this.validateBusinessAccess(servicePin.location.businessId, user);
    }

    return this.prisma.patrolLog.create({
      data: {
        ...createPatrolLogDto,
        userId,
      },
      include: {
        user: true,
        servicePin: true,
      },
    });
  }

  async findAllByPin(servicePinId: string, user?: any) {
    if (user) {
        const servicePin = await this.prisma.servicePin.findUnique({
            where: { id: servicePinId },
            include: { location: true }
        });
        if (servicePin) await this.validateBusinessAccess(servicePin.location.businessId, user);
    }

    return this.prisma.patrolLog.findMany({
      where: { servicePinId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findAllByLocation(locationId: string, user?: any) {
    if (user) {
        const location = await this.prisma.location.findUnique({ where: { id: locationId } });
        if (location) await this.validateBusinessAccess(location.businessId, user);
    }

    return this.prisma.patrolLog.findMany({
      where: {
        servicePin: {
          locationId: locationId
        }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        servicePin: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async findAll(user?: any) {
    const where: any = {};
    if (user && user.role !== 'SUPER_ADMIN') {
        // Find business for the user
        const employee = await this.prisma.employee.findFirst({ where: { userId: user.userId || user.sub || user.id } });
        const businessId = employee?.businessId;
        
        // Also check ownership
        const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: user.userId || user.sub || user.id } });
        const ownedBusinessId = ownedBusiness?.id;

        const targetBusinessId = businessId || ownedBusinessId;
        
        if (targetBusinessId) {
            where.servicePin = {
                location: {
                    businessId: targetBusinessId
                }
            };
        } else {
            // No business found, return empty or throw? Return empty for safety.
            return [];
        }
    }

    return this.prisma.patrolLog.findMany({
      where,
      take: 100,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        servicePin: {
          include: {
            location: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }
}
