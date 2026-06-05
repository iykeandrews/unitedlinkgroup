import { Module } from '@nestjs/common';
import { PatrolLogsService } from './patrol-logs.service';
import { PatrolLogsController } from './patrol-logs.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [PatrolLogsController],
  providers: [PatrolLogsService, PrismaService],
})
export class PatrolLogsModule {}
