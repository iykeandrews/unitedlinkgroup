import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { UserRole } from '@unitedlinkgroup/types';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  create(@Request() req: any, @Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto, req.user.businessId, req.user.userId);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.rolesService.findAll(req.user.businessId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.rolesService.findOne(id, req.user.businessId);
  }

  @Get(':id/members')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  getMembers(@Request() req: any, @Param('id') id: string) {
    return this.rolesService.getRoleMembers(id, req.user.businessId);
  }

  @Post(':id/members')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  addMember(@Request() req: any, @Param('id') id: string, @Body('employeeId') employeeId: string) {
    return this.rolesService.addMember(id, employeeId, req.user.userId, req.user.businessId);
  }

  @Delete(':id/members/:employeeId')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  removeMember(@Request() req: any, @Param('id') id: string, @Param('employeeId') employeeId: string) {
    return this.rolesService.removeMember(id, employeeId, req.user.userId, req.user.businessId);
  }

  @Patch(':id')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  update(@Request() req: any, @Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.update(id, updateRoleDto, req.user.userId, req.user.businessId);
  }

  @Delete(':id')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  remove(@Request() req: any, @Param('id') id: string) {
    return this.rolesService.remove(id, req.user.userId, req.user.businessId);
  }
}
