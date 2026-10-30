import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { mobileRelease } from './mobile-release';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('mobile-release')
  async getMobileRelease(@Query('platform') platform: string, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'public, max-age=300');
    return { release: await mobileRelease(platform) };
  }

  @Get('businesses')
  async getBusinesses() {
    return this.appService.getBusinesses();
  }
}
