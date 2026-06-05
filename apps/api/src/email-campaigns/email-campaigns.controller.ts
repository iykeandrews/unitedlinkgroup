import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Headers as RequestHeaders } from '@nestjs/common';
import { EmailCampaignsService } from './email-campaigns.service';
import { CreateEmailCampaignDto } from './dto/create-email-campaign.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '@unitedlinkgroup/types';

@Controller('email-campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmailCampaignsController {
  constructor(private readonly emailCampaignsService: EmailCampaignsService) {}

  @Post()
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  create(@Request() req: any, @Body() createEmailCampaignDto: CreateEmailCampaignDto, @RequestHeaders('x-business-id') headerBusinessId?: string) {
    const businessId = (req.user.role === UserRole.SUPER_ADMIN && headerBusinessId) ? headerBusinessId : req.user.businessId;
    return this.emailCampaignsService.create(createEmailCampaignDto, req.user.userId, businessId);
  }

  @Get()
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  findAll(@Request() req: any, @RequestHeaders('x-business-id') headerBusinessId?: string) {
    const businessId = (req.user.role === UserRole.SUPER_ADMIN && headerBusinessId) ? headerBusinessId : req.user.businessId;
    return this.emailCampaignsService.findAll(businessId);
  }

  @Get(':id')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  findOne(@Request() req: any, @Param('id') id: string, @RequestHeaders('x-business-id') headerBusinessId?: string) {
    const businessId = (req.user.role === UserRole.SUPER_ADMIN && headerBusinessId) ? headerBusinessId : req.user.businessId;
    return this.emailCampaignsService.findOne(id, businessId);
  }

  @Post(':id/send')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  send(@Request() req: any, @Param('id') id: string, @RequestHeaders('x-business-id') headerBusinessId?: string) {
    const businessId = (req.user.role === UserRole.SUPER_ADMIN && headerBusinessId) ? headerBusinessId : req.user.businessId;
    return this.emailCampaignsService.send(id, req.user.userId, businessId);
  }

  @Delete(':id')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  remove(@Request() req: any, @Param('id') id: string, @RequestHeaders('x-business-id') headerBusinessId?: string) {
    const businessId = (req.user.role === UserRole.SUPER_ADMIN && headerBusinessId) ? headerBusinessId : req.user.businessId;
    return this.emailCampaignsService.remove(id, req.user.userId, businessId);
  }
}
