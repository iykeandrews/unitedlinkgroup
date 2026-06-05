import { Module } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { PrismaService } from '../prisma.service';
import { EncryptionService } from '../common/security/encryption.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [NotificationsModule, PushModule],
  controllers: [EmployeesController],
  providers: [EmployeesService, PrismaService, EncryptionService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
