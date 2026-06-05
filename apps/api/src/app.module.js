"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const throttler_1 = require("@nestjs/throttler");
const schedule_1 = require("@nestjs/schedule");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const prisma_service_1 = require("./prisma.service");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const payroll_module_1 = require("./payroll/payroll.module");
const scheduling_module_1 = require("./scheduling/scheduling.module");
const time_tracking_module_1 = require("./time-tracking/time-tracking.module");
const leave_module_1 = require("./leave/leave.module");
const loans_module_1 = require("./loans/loans.module");
const invoices_module_1 = require("./invoices/invoices.module");
const notifications_module_1 = require("./notifications/notifications.module");
const reports_module_1 = require("./reports/reports.module");
const audit_module_1 = require("./audit/audit.module");
const employees_module_1 = require("./employees/employees.module");
const businesses_module_1 = require("./businesses/businesses.module");
const locations_module_1 = require("./locations/locations.module");
const clients_module_1 = require("./clients/clients.module");
const service_pins_module_1 = require("./service-pins/service-pins.module");
const patrol_logs_module_1 = require("./patrol-logs/patrol-logs.module");
const push_module_1 = require("./push/push.module");
const uploads_module_1 = require("./uploads/uploads.module");
const departments_module_1 = require("./departments/departments.module");
const roles_module_1 = require("./roles/roles.module");
const announcements_module_1 = require("./announcements/announcements.module");
const email_campaigns_module_1 = require("./email-campaigns/email-campaigns.module");
const email_templates_module_1 = require("./email-templates/email-templates.module");
const incident_reports_module_1 = require("./incident-reports/incident-reports.module");
const assets_module_1 = require("./assets/assets.module");
const payments_module_1 = require("./payments/payments.module");
const chats_module_1 = require("./chats/chats.module");
const swaps_module_1 = require("./swaps/swaps.module");
const company_certifications_module_1 = require("./company-certifications/company-certifications.module");
const contracts_module_1 = require("./contracts/contracts.module");
const compliance_documents_module_1 = require("./compliance-documents/compliance-documents.module");
const assignments_module_1 = require("./assignments/assignments.module");
const employee_forms_module_1 = require("./employee-forms/employee-forms.module");
const vendors_module_1 = require("./vendors/vendors.module");
let AppModule = (() => {
    let _classDecorators = [(0, common_1.Module)({
            imports: [
                config_1.ConfigModule.forRoot({
                    isGlobal: true,
                    envFilePath: ['apps/api/.env', '.env'],
                }),
                throttler_1.ThrottlerModule.forRoot([{
                        ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
                        limit: parseInt(process.env.THROTTLE_LIMIT || '600', 10),
                    }]),
                schedule_1.ScheduleModule.forRoot(),
                auth_module_1.AuthModule,
                users_module_1.UsersModule,
                payroll_module_1.PayrollModule,
                scheduling_module_1.SchedulingModule,
                time_tracking_module_1.TimeTrackingModule,
                leave_module_1.LeaveModule,
                loans_module_1.LoansModule,
                invoices_module_1.InvoicesModule,
                notifications_module_1.NotificationsModule,
                reports_module_1.ReportsModule,
                audit_module_1.AuditModule,
                employees_module_1.EmployeesModule,
                businesses_module_1.BusinessesModule,
                locations_module_1.LocationsModule,
                clients_module_1.ClientsModule,
                service_pins_module_1.ServicePinsModule,
                patrol_logs_module_1.PatrolLogsModule,
                push_module_1.PushModule,
                uploads_module_1.UploadsModule,
                departments_module_1.DepartmentsModule,
                roles_module_1.RolesModule,
                announcements_module_1.AnnouncementsModule,
                email_campaigns_module_1.EmailCampaignsModule,
                email_templates_module_1.EmailTemplatesModule,
                incident_reports_module_1.IncidentReportsModule,
                assets_module_1.AssetsModule,
                payments_module_1.PaymentsModule,
                chats_module_1.ChatsModule,
                swaps_module_1.SwapsModule,
                company_certifications_module_1.CompanyCertificationsModule,
                contracts_module_1.ContractsModule,
                compliance_documents_module_1.ComplianceDocumentsModule,
                assignments_module_1.AssignmentsModule,
                employee_forms_module_1.EmployeeFormsModule,
                vendors_module_1.VendorsModule
            ],
            controllers: [app_controller_1.AppController],
            providers: [
                app_service_1.AppService,
                prisma_service_1.PrismaService,
                {
                    provide: core_1.APP_GUARD,
                    useClass: throttler_1.ThrottlerGuard,
                },
            ],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var AppModule = _classThis = class {
    };
    __setFunctionName(_classThis, "AppModule");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AppModule = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AppModule = _classThis;
})();
exports.AppModule = AppModule;
