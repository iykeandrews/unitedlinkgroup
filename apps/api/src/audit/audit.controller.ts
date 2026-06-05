import { Controller, Get, UseGuards, Request, Query, Headers as RequestHeaders } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@unitedlinkgroup/types';
import { PrismaService } from '../prisma.service';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService, private readonly prisma: PrismaService) {}

  @Get()
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  async getLogs(
    @Request() req: any,
    @Query('businessId') businessId?: string,
    @Query('resource') resource?: string,
    @Query('resourceId') resourceId?: string,
    @Query('action') action?: string,
    @Query('limit') limit?: string,
    @RequestHeaders('x-business-id') headerBusinessId?: string
  ) {
    let scopedBusinessId = req.user.businessId;

    if (req.user.role === UserRole.SUPER_ADMIN) {
        scopedBusinessId = businessId || headerBusinessId || scopedBusinessId;
    }

    // For Business Admin, req.user.businessId MUST be present.
    // If it's missing (e.g. malformed token or user not linked), we should probably block or return empty.
    // However, the Guard ensures valid token. If businessId is null in token, then scopedBusinessId is null.
    // If scopedBusinessId is null/undefined, AuditService fetches ALL logs.
    // WE MUST PREVENT THIS for non-Super Admin.
    
    if (!scopedBusinessId && req.user.role !== UserRole.SUPER_ADMIN) {
        // Fallback: try to find business via ownership (if token is missing it for some reason)
        const owned = await this.prisma.business.findFirst({ where: { ownerId: req.user.userId } });
        if (owned) {
            scopedBusinessId = owned.id;
        } else {
             // Block access
             return []; // Or throw Forbidden
        }
    }

    const logs = await this.auditService.getLogs({
      businessId: scopedBusinessId,
      resource,
      resourceId,
      action,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return logs;
  }
}
