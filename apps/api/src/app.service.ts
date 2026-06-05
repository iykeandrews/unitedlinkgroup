import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  getHello(): string {
    return 'United Link Group API is running!';
  }

  async getBusinesses() {
    return this.prisma.business.findMany();
  }
}
