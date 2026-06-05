import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Headers } from '@nestjs/common';
import { UserRole } from '@unitedlinkgroup/types';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN) // Only admins can post for now
  create(@Request() req: any, @Headers('x-business-id') businessIdHeader: string, @Body() createAnnouncementDto: CreateAnnouncementDto) {
    return this.announcementsService.create(createAnnouncementDto, req.user.userId, req.user.businessId ?? businessIdHeader);
  }

  @Get()
  findAll(@Request() req: any, @Headers('x-business-id') businessIdHeader: string) {
    const user = req.user;
    const resolve = (bid?: string) => this.announcementsService.findAll(user.userId, bid as string);
    if (user.role === UserRole.SUPER_ADMIN) {
      if (!businessIdHeader) throw new Error('Business context required for Super Admin');
      return resolve(businessIdHeader);
    }
    return resolve(user.businessId);
  }

  @Patch(':id')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  update(@Request() req: any, @Headers('x-business-id') businessIdHeader: string, @Param('id') id: string, @Body() updateAnnouncementDto: Partial<CreateAnnouncementDto>) {
    return this.announcementsService.update(id, updateAnnouncementDto, req.user.userId, req.user.businessId ?? businessIdHeader);
  }

  @Post(':id/read')
  markAsRead(@Request() req: any, @Param('id') id: string) {
    return this.announcementsService.markAsRead(id, req.user.userId);
  }

  @Delete(':id')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  remove(@Request() req: any, @Headers('x-business-id') businessIdHeader: string, @Param('id') id: string) {
    return this.announcementsService.remove(id, req.user.userId, req.user.businessId ?? businessIdHeader);
  }
}
