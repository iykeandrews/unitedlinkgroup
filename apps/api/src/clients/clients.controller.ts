import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Headers } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@unitedlinkgroup/types';

@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  create(@Request() req: any, @Body() createClientDto: CreateClientDto, @Headers('x-business-id') businessId?: string) {
    return this.clientsService.create(req.user, createClientDto, businessId);
  }

  @Get()
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  findAll(@Request() req: any, @Headers('x-business-id') businessId?: string) {
    return this.clientsService.findAll(req.user, businessId);
  }

  @Get(':id')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.clientsService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() updateClientDto: UpdateClientDto, @Request() req: any) {
    return this.clientsService.update(id, updateClientDto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.clientsService.remove(id, req.user);
  }
}
