import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@unitedlinkgroup/types';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';

@Controller('assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get()
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  findAll(
    @Request() req: any,
    @Headers('x-business-id') businessId?: string,
    @Query() query?: any,
  ) {
    return this.assignmentsService.findAll(req.user, businessId, query);
  }

  @Get(':id')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.assignmentsService.findOne(req.user, id);
  }

  @Post()
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  create(@Request() req: any, @Body() dto: CreateAssignmentDto, @Headers('x-business-id') businessId?: string) {
    return this.assignmentsService.create(req.user, dto, businessId);
  }

  @Patch(':id')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateAssignmentDto) {
    return this.assignmentsService.update(req.user, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  remove(@Request() req: any, @Param('id') id: string) {
    return this.assignmentsService.remove(req.user, id);
  }
}

