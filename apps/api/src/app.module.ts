import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PayrollModule } from './payroll/payroll.module';
import { SchedulingModule } from './scheduling/scheduling.module';
import { TimeTrackingModule } from './time-tracking/time-tracking.module';
import { LeaveModule } from './leave/leave.module';
import { LoansModule } from './loans/loans.module';
import { InvoicesModule } from './invoices/invoices.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { AuditModule } from './audit/audit.module';
import { EmployeesModule } from './employees/employees.module';
import { BusinessesModule } from './businesses/businesses.module';
import { LocationsModule } from './locations/locations.module';
import { ClientsModule } from './clients/clients.module';
import { ServicePinsModule } from './service-pins/service-pins.module';
import { PatrolLogsModule } from './patrol-logs/patrol-logs.module';
import { PushModule } from './push/push.module';
import { UploadsModule } from './uploads/uploads.module';
import { DepartmentsModule } from './departments/departments.module';
import { RolesModule } from './roles/roles.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { EmailCampaignsModule } from './email-campaigns/email-campaigns.module';
import { EmailTemplatesModule } from './email-templates/email-templates.module';
import { IncidentReportsModule } from './incident-reports/incident-reports.module';
import { AssetsModule } from './assets/assets.module';
import { PaymentsModule } from './payments/payments.module';
import { ChatsModule } from './chats/chats.module';
import { SwapsModule } from './swaps/swaps.module';
import { CompanyCertificationsModule } from './company-certifications/company-certifications.module';
import { ContractsModule } from './contracts/contracts.module';
import { ComplianceDocumentsModule } from './compliance-documents/compliance-documents.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { EmployeeFormsModule } from './employee-forms/employee-forms.module';
import { VendorsModule } from './vendors/vendors.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/api/.env', '.env'],
    }),
    ThrottlerModule.forRoot([{
      ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
      limit: parseInt(process.env.THROTTLE_LIMIT || '600', 10),
    }]),
    ScheduleModule.forRoot(),
    AuthModule, 
    UsersModule, 
    PayrollModule, 
    SchedulingModule, 
    TimeTrackingModule, 
    LeaveModule, 
    LoansModule, 
    InvoicesModule, 
    NotificationsModule, 
    ReportsModule, 
    AuditModule, 
    EmployeesModule, 
    BusinessesModule,
    LocationsModule,
    ClientsModule,
    ServicePinsModule,
    PatrolLogsModule,
    PushModule,
    UploadsModule,
    DepartmentsModule,
    RolesModule,
    AnnouncementsModule,
    EmailCampaignsModule,
    EmailTemplatesModule,
    IncidentReportsModule,
    AssetsModule,
    PaymentsModule,
    ChatsModule,
    SwapsModule,
    CompanyCertificationsModule
    ,
    ContractsModule
    ,
    ComplianceDocumentsModule
    ,
    AssignmentsModule
    ,
    EmployeeFormsModule
    ,
    VendorsModule
  ],
  controllers: [AppController],
  providers: [
    AppService, 
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
