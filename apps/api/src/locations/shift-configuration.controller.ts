import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  Request,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "@unitedlinkgroup/types";
import { ShiftConfigurationService } from "./shift-configuration.service";
@Controller("locations/:locationId/shift-configurations")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShiftConfigurationController {
  constructor(private service: ShiftConfigurationService) {}
  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER)
  list(
    @Param("locationId") id: string,
    @Request() req: any,
    @Headers("x-business-id") businessId?: string,
  ) {
    return this.service.list(id, req.user, businessId);
  }
  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN)
  save(
    @Param("locationId") id: string,
    @Request() req: any,
    @Body() body: any,
    @Headers("x-business-id") businessId?: string,
  ) {
    return this.service.saveConfiguration(id, req.user, body, businessId);
  }
  @Post("pins")
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN)
  pin(
    @Param("locationId") id: string,
    @Request() req: any,
    @Body() body: any,
    @Headers("x-business-id") businessId?: string,
  ) {
    return this.service.savePin(id, req.user, body, businessId);
  }
}
