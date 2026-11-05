import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Headers,
  Request,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { FlexPayService } from "./flex-pay.service";
@Controller("flex-pay")
@UseGuards(JwtAuthGuard)
export class FlexPayController {
  constructor(private readonly service: FlexPayService) {}
  @Get() list(@Request() r: any, @Headers("x-business-id") b?: string) {
    return this.service.list(r.user, b);
  }
  @Get("options") options(
    @Request() r: any,
    @Headers("x-business-id") b?: string,
  ) {
    return this.service.options(r.user, b);
  }
  @Post() offer(
    @Request() r: any,
    @Body() body: any,
    @Headers("x-business-id") b?: string,
  ) {
    return this.service.offer(r.user, body, b);
  }
  @Patch(":id/respond") respond(
    @Request() r: any,
    @Param("id") id: string,
    @Body() body: any,
    @Headers("x-business-id") b?: string,
  ) {
    return this.service.respond(r.user, id, body, b);
  }
  @Patch(":id/paid") paid(
    @Request() r: any,
    @Param("id") id: string,
    @Body() body: any,
    @Headers("x-business-id") b?: string,
  ) {
    return this.service.recordPayment(r.user, id, body, b);
  }
  @Patch(":id/cancel") cancel(
    @Request() r: any,
    @Param("id") id: string,
    @Body() body: any,
    @Headers("x-business-id") b?: string,
  ) {
    return this.service.cancel(r.user, id, body, b);
  }
  @Get(":id/attendance") attendance(
    @Request() r: any,
    @Param("id") id: string,
    @Headers("x-business-id") b?: string,
  ) {
    return this.service.attendance(r.user, id, b);
  }
}
