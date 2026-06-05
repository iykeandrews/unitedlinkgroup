import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, UsePipes, ValidationPipe, Headers } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@unitedlinkgroup/types';
import { CreateAssetDto } from './dto/create-asset.dto';
import { AssignAssetDto } from './dto/assign-asset.dto';

@Controller('assets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(@Request() req: any, @Body() createDto: CreateAssetDto, @Headers('x-business-id') headerBusinessId?: string) {
    return this.assetsService.create(createDto, req.user, headerBusinessId);
  }

  @Post(':id/assign')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  assign(@Request() req: any, @Param('id') id: string, @Body() assignDto: AssignAssetDto) {
    return this.assetsService.assign(id, assignDto, req.user);
  }

  @Post(':id/return')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER)
  returnAsset(@Request() req: any, @Param('id') id: string, @Body() data: { returnDate: string; condition: string; notes?: string }) {
    return this.assetsService.returnAsset(id, data, req.user);
  }

  @Get(':id/history')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER)
  getHistory(@Request() req: any, @Param('id') id: string) {
    return this.assetsService.getAssignmentHistory(id, req.user);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  findAll(@Request() req: any, @Headers('x-business-id') headerBusinessId?: string) {
    return this.assetsService.findAll(req.user, headerBusinessId);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.assetsService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(@Request() req: any, @Param('id') id: string, @Body() updateDto: Partial<CreateAssetDto>) {
    return this.assetsService.update(id, updateDto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER)
  remove(@Request() req: any, @Param('id') id: string) {
    return this.assetsService.remove(id, req.user);
  }
}
