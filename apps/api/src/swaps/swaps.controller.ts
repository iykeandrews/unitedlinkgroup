import { Body, Controller, Get, Headers, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@unitedlinkgroup/types';
import { SwapsService } from './swaps.service';
import { CreateShiftSwapDto } from './dto/create-shift-swap.dto';

@Controller('swaps')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SwapsController {
  constructor(private readonly swapsService: SwapsService) {}

  @Get()
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  list(
    @Request() req: any,
    @Headers('x-business-id') headerBusinessId: string | undefined,
    @Query('businessId') queryBusinessId?: string,
    @Query('status') status?: string
  ) {
    return this.swapsService.list(req.user, headerBusinessId, queryBusinessId, status);
  }

  @Get('my')
  @Roles(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  listMy(@Request() req: any, @Headers('x-business-id') headerBusinessId: string | undefined) {
    return this.swapsService.listMy(req.user, headerBusinessId);
  }

  @Post()
  @Roles(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  create(@Request() req: any, @Headers('x-business-id') headerBusinessId: string | undefined, @Body() dto: CreateShiftSwapDto) {
    return this.swapsService.create(req.user, headerBusinessId, dto);
  }

  @Put(':id/cancel')
  @Roles(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  cancel(@Request() req: any, @Headers('x-business-id') headerBusinessId: string | undefined, @Param('id') id: string) {
    return this.swapsService.cancel(req.user, headerBusinessId, id);
  }

  @Put(':id/approve')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  approve(@Request() req: any, @Headers('x-business-id') headerBusinessId: string | undefined, @Param('id') id: string) {
    return this.swapsService.approve(req.user, headerBusinessId, id);
  }

  @Put(':id/reject')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  reject(
    @Request() req: any,
    @Headers('x-business-id') headerBusinessId: string | undefined,
    @Param('id') id: string,
    @Body() body: { rejectionReason?: string }
  ) {
    return this.swapsService.reject(req.user, headerBusinessId, id, body?.rejectionReason);
  }
}

