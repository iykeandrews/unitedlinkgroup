import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request, Headers, UsePipes, ValidationPipe, Delete } from '@nestjs/common';
import { BusinessesService } from './businesses.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@unitedlinkgroup/types';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Controller('businesses')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  create(@Body() createBusinessDto: CreateBusinessDto, @Request() req: any) {
    return this.businessesService.create(createBusinessDto, req.user.userId);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  findAll() {
    return this.businessesService.findAll();
  }

  @Get('mine')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  findMine(@Request() req: any) {
    return this.businessesService.findMine(req.user.userId);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN)
  findOne(@Param('id') id: string) {
    return this.businessesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateBusinessDto: UpdateBusinessDto,
    @Headers('x-business-id') businessId?: string,
  ) {
    return this.businessesService.updateForUser(req.user, id, updateBusinessDto, businessId);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.SUPER_ADMIN)
  deactivate(@Param('id') id: string) {
    return this.businessesService.setStatus(id, 'INACTIVE');
  }

  @Patch(':id/activate')
  @Roles(UserRole.SUPER_ADMIN)
  activate(@Param('id') id: string) {
    return this.businessesService.setStatus(id, 'ACTIVE');
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.businessesService.setStatus(id, 'DELETED');
  }
}
