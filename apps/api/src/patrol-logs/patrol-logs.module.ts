import { Module } from '@nestjs/common';
import { PatrolLogsService } from './patrol-logs.service';
import { PatrolLogsController } from './patrol-logs.controller';

@Module({
  controllers: [PatrolLogsController],
  providers: [PatrolLogsService],
})
export class PatrolLogsModule {}
