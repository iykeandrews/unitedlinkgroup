import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { PatrolLogsService } from './patrol-logs.service';
import { CreatePatrolLogDto } from './dto/create-patrol-log.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@unitedlinkgroup/types';

@Controller('patrol-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatrolLogsController {
  constructor(private readonly patrolLogsService: PatrolLogsService) {}

  @Post()
  @Roles(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  create(@Request() req: any, @Body() createPatrolLogDto: CreatePatrolLogDto) {
    return this.patrolLogsService.create(req.user.id, createPatrolLogDto, req.user);
  }

  @Get('pin/:servicePinId')
  @Roles(UserRole.MANAGER, UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  findAllByPin(@Param('servicePinId') servicePinId: string, @Request() req: any) {
    return this.patrolLogsService.findAllByPin(servicePinId, req.user);
  }

  @Get('location/:locationId')
  @Roles(UserRole.MANAGER, UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  findAllByLocation(@Param('locationId') locationId: string, @Request() req: any) {
    return this.patrolLogsService.findAllByLocation(locationId, req.user);
  }

  @Get()
  @Roles(UserRole.MANAGER, UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  findAll(@Request() req: any) {
    return this.patrolLogsService.findAll(req.user);
  }
}
