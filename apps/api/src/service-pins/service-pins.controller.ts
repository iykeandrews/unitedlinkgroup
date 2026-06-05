import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Headers } from '@nestjs/common';
import { ServicePinsService } from './service-pins.service';
import { CreateServicePinDto } from './dto/create-service-pin.dto';
import { UpdateServicePinDto } from './dto/update-service-pin.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@unitedlinkgroup/types';

@Controller('service-pins')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServicePinsController {
  constructor(private readonly servicePinsService: ServicePinsService) {}

  @Post()
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  create(@Request() req: any, @Body() createServicePinDto: CreateServicePinDto, @Headers('x-business-id') businessId?: string) {
    return this.servicePinsService.create(req.user, createServicePinDto, businessId);
  }

  @Get('location/:locationId')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.EMPLOYEE, UserRole.MANAGER)
  findAllByLocation(@Request() req: any, @Param('locationId') locationId: string, @Headers('x-business-id') businessId?: string) {
    return this.servicePinsService.findAllByLocation(req.user, locationId, businessId);
  }

  @Get(':id')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.EMPLOYEE, UserRole.MANAGER)
  findOne(@Request() req: any, @Param('id') id: string, @Headers('x-business-id') businessId?: string) {
    return this.servicePinsService.findOne(req.user, id, businessId);
  }

  @Patch(':id')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  update(@Request() req: any, @Param('id') id: string, @Body() updateServicePinDto: UpdateServicePinDto, @Headers('x-business-id') businessId?: string) {
    return this.servicePinsService.update(req.user, id, updateServicePinDto, businessId);
  }

  @Delete(':id')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  remove(@Request() req: any, @Param('id') id: string, @Headers('x-business-id') businessId?: string) {
    return this.servicePinsService.remove(req.user, id, businessId);
  }
}
