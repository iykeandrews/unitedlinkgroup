import { Controller, Get, Post, Body, Param, UseGuards, Request, UsePipes, ValidationPipe, Headers } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@unitedlinkgroup/types';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Request() req: any, @Body() createPaymentDto: CreatePaymentDto, @Headers('x-business-id') headerBusinessId?: string) {
    return this.paymentsService.create(createPaymentDto, req.user, headerBusinessId);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER)
  findAll(@Request() req: any, @Headers('x-business-id') headerBusinessId?: string) {
    return this.paymentsService.findAll(req.user, headerBusinessId);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER)
  findOne(@Param('id') id: string, @Request() req: any, @Headers('x-business-id') headerBusinessId?: string) {
    return this.paymentsService.findOne(id, req.user, headerBusinessId);
  }
}
