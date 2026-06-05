import { Body, Controller, Get, Headers, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@unitedlinkgroup/types';

const VENDOR_ROLE = 'VENDOR';

@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get('public/:slug')
  getPublicBySlug(@Param('slug') slug: string) {
    return this.vendorsService.getPublicBySlug(slug);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Get()
  list(@Request() req: any, @Headers('x-business-id') businessId?: string) {
    return this.vendorsService.list(req.user, businessId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Post()
  create(@Request() req: any, @Body() body: any, @Headers('x-business-id') businessId?: string) {
    return this.vendorsService.create(req.user, body, businessId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() body: any, @Headers('x-business-id') businessId?: string) {
    return this.vendorsService.update(req.user, id, body, businessId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Post(':id/activate')
  activate(@Request() req: any, @Param('id') id: string, @Headers('x-business-id') businessId?: string) {
    return this.vendorsService.setStatus(req.user, id, 'ACTIVE', businessId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Post(':id/deactivate')
  deactivate(@Request() req: any, @Param('id') id: string, @Headers('x-business-id') businessId?: string) {
    return this.vendorsService.setStatus(req.user, id, 'INACTIVE', businessId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(VENDOR_ROLE as any)
  @Get('me/profile')
  getMyProfile(@Request() req: any) {
    return this.vendorsService.getMyProfile(req.user);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(VENDOR_ROLE as any)
  @Get('me/portal')
  getMyPortal(@Request() req: any) {
    return this.vendorsService.getMyPortalData(req.user);
  }
}
