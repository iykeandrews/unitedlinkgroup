import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, Headers, UsePipes, ValidationPipe, Query } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@unitedlinkgroup/types';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Controller('locations')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(@Request() req: any, @Body() body: CreateLocationDto, @Headers('x-business-id') businessId?: string) {
    return this.locationsService.create(req.user, body, businessId);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER)
  findAll(
    @Request() req: any, 
    @Headers('x-business-id') businessId?: string, 
    @Query('clientId') clientId?: string,
    @Query('status') status?: string
  ) {
    return this.locationsService.findAll(req.user, businessId, clientId, status);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER)
  findOne(@Request() req: any, @Param('id') id: string, @Headers('x-business-id') businessId?: string) {
    return this.locationsService.findOne(req.user, id, businessId);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(@Request() req: any, @Param('id') id: string, @Body() body: UpdateLocationDto, @Headers('x-business-id') businessId?: string) {
    return this.locationsService.update(req.user, id, body, businessId);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN)
  remove(@Request() req: any, @Param('id') id: string, @Headers('x-business-id') businessId?: string) {
    return this.locationsService.remove(req.user, id, businessId);
  }
}
