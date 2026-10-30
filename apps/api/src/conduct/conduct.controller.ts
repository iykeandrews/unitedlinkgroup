import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "@unitedlinkgroup/types";
import { ConductService } from "./conduct.service";
import {
  CreateConductDto,
  ConductActionDto,
  ConductListDto,
} from "./conduct.dto";
import { ComplaintPortalService } from "./complaint-portal.service";
@Controller("conduct")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.SUPER_ADMIN,
  UserRole.BUSINESS_ADMIN,
  UserRole.MANAGER,
  UserRole.EMPLOYEE,
)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class ConductController {
  constructor(
    private service: ConductService,
    private portal: ComplaintPortalService,
  ) {}
  @Post("portal-link") portalLink(
    @Request() req: any,
    @Headers("x-business-id") business?: string,
  ) {
    return this.portal.link(req.user, business);
  }
  @Get("options") options(
    @Request() req: any,
    @Headers("x-business-id") business?: string,
  ) {
    return this.service.options(req.user, business);
  }
  @Get() list(
    @Request() req: any,
    @Headers("x-business-id") business: string | undefined,
    @Query() query: ConductListDto,
  ) {
    return this.service.list(req.user, business, query);
  }
  @Get(":id") detail(
    @Param("id") id: string,
    @Request() req: any,
    @Headers("x-business-id") business?: string,
  ) {
    return this.service.detail(id, req.user, business);
  }
  @Post() create(
    @Body() data: CreateConductDto,
    @Request() req: any,
    @Headers("x-business-id") business?: string,
  ) {
    return this.service.create(data, req.user, business);
  }
  @Post(":id/actions") action(
    @Param("id") id: string,
    @Body() data: ConductActionDto,
    @Request() req: any,
    @Headers("x-business-id") business?: string,
  ) {
    return this.service.action(id, data, req.user, business);
  }
}
