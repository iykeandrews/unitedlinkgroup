import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { ComplaintPortalService } from "./complaint-portal.service";
import { PublicComplaintDto } from "./complaint-portal.dto";
@Controller("public/complaints")
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class ComplaintPortalController {
  constructor(private service: ComplaintPortalService) {}
  @Get("track/:token")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  track(
    @Param("token") token: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Referrer-Policy", "no-referrer");
    return this.service.track(token);
  }
  @Get(":key") info(
    @Param("key") key: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    response.setHeader("Cache-Control", "no-store");
    return this.service.info(key);
  }
  @Post(":key")
  @Throttle({ default: { limit: 5, ttl: 600000 } })
  submit(
    @Param("key") key: string,
    @Body() data: PublicComplaintDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    response.setHeader("Cache-Control", "no-store");
    return this.service.submit(key, data);
  }
}
