import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { EmailTemplatesService } from './email-templates.service';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@unitedlinkgroup/types';
import { RolesGuard } from '../auth/roles.guard';

@Controller('email-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmailTemplatesController {
  constructor(private readonly emailTemplatesService: EmailTemplatesService) {}

  @Post()
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  create(@Request() req: any, @Body() createEmailTemplateDto: CreateEmailTemplateDto) {
    return this.emailTemplatesService.create(createEmailTemplateDto, req.user.userId, req.user.businessId);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.emailTemplatesService.findAll(req.user.businessId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.emailTemplatesService.findOne(id, req.user.businessId);
  }

  @Patch(':id')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  update(@Request() req: any, @Param('id') id: string, @Body() updateEmailTemplateDto: CreateEmailTemplateDto) {
    return this.emailTemplatesService.update(id, updateEmailTemplateDto, req.user.userId, req.user.businessId);
  }

  @Delete(':id')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  remove(@Request() req: any, @Param('id') id: string) {
    return this.emailTemplatesService.remove(id, req.user.userId, req.user.businessId);
  }
}
