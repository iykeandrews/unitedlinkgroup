"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeTrackingService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const XLSX = __importStar(require("xlsx"));
let TimeTrackingService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _handleAutoClockOut_decorators;
    var TimeTrackingService = _classThis = class {
        constructor(prisma, notifications, push) {
            this.prisma = (__runInitializers(this, _instanceExtraInitializers), prisma);
            this.notifications = notifications;
            this.push = push;
        }
        async validateBusinessAccess(targetBusinessId, user) {
            if (user.role === 'SUPER_ADMIN')
                return;
            // Check if user owns the business
            const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: user.userId || user.sub || user.id } });
            if (ownedBusiness && ownedBusiness.id === targetBusinessId)
                return;
            // Check if user is an employee of the business
            const employee = await this.prisma.employee.findFirst({
                where: { userId: user.userId || user.sub || user.id, businessId: targetBusinessId }
            });
            if (employee)
                return;
            throw new common_1.BadRequestException('Access denied: You do not have access to this business data');
        }
        async importTimesheets(fileBuffer, businessId, user) {
            await this.validateBusinessAccess(businessId, user);
            const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet);
            let count = 0;
            const errors = [];
            for (const row of data) {
                try {
                    // Expected columns: EmployeeEmail, Date, StartTime, EndTime
                    const email = row['EmployeeEmail'] || row['Email'];
                    const dateStr = row['Date']; // YYYY-MM-DD
                    const startStr = row['StartTime']; // HH:mm
                    const endStr = row['EndTime']; // HH:mm
                    if (!email || !dateStr || !startStr)
                        continue;
                    const employee = await this.prisma.employee.findFirst({
                        where: {
                            businessId,
                            OR: [
                                { email: email },
                                { user: { email: email } }
                            ]
                        }
                    });
                    if (!employee) {
                        errors.push(`Employee not found for ${email}`);
                        continue;
                    }
                    const start = new Date(`${dateStr}T${startStr}`);
                    const end = endStr ? new Date(`${dateStr}T${endStr}`) : null;
                    await this.prisma.timesheet.create({
                        data: {
                            employeeId: employee.id,
                            startTime: start,
                            endTime: end,
                            status: 'APPROVED',
                            clockInIp: 'Imported',
                        }
                    });
                    count++;
                }
                catch (e) {
                    errors.push(`Failed to import row: ${JSON.stringify(row)} - ${e.message}`);
                }
            }
            return { count, errors };
        }
        async getEmployeeRecord(userId, businessId, user) {
            const where = { userId };
            if (businessId) {
                if (user)
                    await this.validateBusinessAccess(businessId, user);
                where.businessId = businessId;
            }
            const employee = await this.prisma.employee.findFirst({
                where,
            });
            if (!employee) {
                throw new common_1.BadRequestException('Employee record not found for this user');
            }
            return employee.id;
        }
        async clockIn(employeeId, locationId, lat, lng, ip, opts) {
            // Check if already clocked in
            const activeTimesheet = await this.prisma.timesheet.findFirst({
                where: {
                    employeeId,
                    endTime: null,
                },
            });
            if (activeTimesheet) {
                throw new common_1.BadRequestException(`Employee is already clocked in`);
            }
            if (!(opts === null || opts === void 0 ? void 0 : opts.bypassGeofence)) {
                if (!locationId) {
                    throw new common_1.BadRequestException('Shift location is required for clock-in');
                }
                const hasCoords = typeof lat === 'number' && Number.isFinite(lat) && typeof lng === 'number' && Number.isFinite(lng);
                if (!hasCoords) {
                    throw new common_1.BadRequestException('Location permission is required to clock in');
                }
                const [employee, location] = await Promise.all([
                    this.prisma.employee.findUnique({ where: { id: employeeId }, select: { businessId: true } }),
                    this.prisma.location.findUnique({ where: { id: locationId }, select: { id: true, businessId: true, name: true, geoLat: true, geoLng: true, radius: true } }),
                ]);
                if (!employee)
                    throw new common_1.BadRequestException('Employee not found');
                if (!location)
                    throw new common_1.BadRequestException('Clock-in location not found');
                if (location.businessId !== employee.businessId)
                    throw new common_1.BadRequestException('Invalid clock-in location');
                if (typeof location.geoLat !== 'number' || typeof location.geoLng !== 'number') {
                    throw new common_1.BadRequestException('Clock-in geofence is not configured for this site');
                }
                const radiusMeters = typeof location.radius === 'number' && Number.isFinite(location.radius) && location.radius > 0 ? location.radius : 100;
                const distance = this.calculateDistance(lat, lng, location.geoLat, location.geoLng);
                if (distance > radiusMeters) {
                    throw new common_1.BadRequestException(`You are about ${Math.round(distance)}m from ${location.name}. You must be within ${radiusMeters}m to clock in`);
                }
            }
            const timesheet = await this.prisma.timesheet.create({
                data: {
                    employeeId,
                    startTime: new Date(),
                    status: 'IN_PROGRESS',
                    locationId: locationId || undefined,
                    clockInIp: ip,
                    clockInLat: typeof lat === 'number' && Number.isFinite(lat) ? lat : undefined,
                    clockInLng: typeof lng === 'number' && Number.isFinite(lng) ? lng : undefined,
                },
            });
            return timesheet;
        }
        async validateWithinClockLocation(employeeId, locationId, lat, lng) {
            if (!locationId) {
                throw new common_1.BadRequestException('Shift location is required');
            }
            const hasCoords = typeof lat === 'number' && Number.isFinite(lat) && typeof lng === 'number' && Number.isFinite(lng);
            if (!hasCoords) {
                throw new common_1.BadRequestException('Location permission is required');
            }
            const [employee, location] = await Promise.all([
                this.prisma.employee.findUnique({ where: { id: employeeId }, select: { businessId: true } }),
                this.prisma.location.findUnique({ where: { id: locationId }, select: { id: true, businessId: true, name: true, geoLat: true, geoLng: true, radius: true } }),
            ]);
            if (!employee)
                throw new common_1.BadRequestException('Employee not found');
            if (!location)
                throw new common_1.BadRequestException('Clock location not found');
            if (location.businessId !== employee.businessId)
                throw new common_1.BadRequestException('Invalid clock location');
            if (typeof location.geoLat !== 'number' || typeof location.geoLng !== 'number') {
                throw new common_1.BadRequestException('Clock-in geofence is not configured for this site');
            }
            const radiusMeters = typeof location.radius === 'number' && Number.isFinite(location.radius) && location.radius > 0 ? location.radius : 100;
            const distance = this.calculateDistance(lat, lng, location.geoLat, location.geoLng);
            if (distance > radiusMeters) {
                throw new common_1.BadRequestException(`You are about ${Math.round(distance)}m from ${location.name}. You must be within ${radiusMeters}m to continue`);
            }
        }
        async getClockLocationStatus(employeeId, locationId, lat, lng) {
            if (!locationId) {
                throw new common_1.BadRequestException('Shift location is required');
            }
            const hasCoords = typeof lat === 'number' && Number.isFinite(lat) && typeof lng === 'number' && Number.isFinite(lng);
            if (!hasCoords) {
                throw new common_1.BadRequestException('Location permission is required');
            }
            const [employee, location] = await Promise.all([
                this.prisma.employee.findUnique({ where: { id: employeeId }, select: { businessId: true, userId: true, firstName: true, lastName: true } }),
                this.prisma.location.findUnique({ where: { id: locationId }, select: { id: true, businessId: true, name: true, address: true, geoLat: true, geoLng: true, radius: true } }),
            ]);
            if (!employee)
                throw new common_1.BadRequestException('Employee not found');
            if (!location)
                throw new common_1.BadRequestException('Clock location not found');
            if (location.businessId !== employee.businessId)
                throw new common_1.BadRequestException('Invalid clock location');
            if (typeof location.geoLat !== 'number' || typeof location.geoLng !== 'number') {
                throw new common_1.BadRequestException('Clock-in geofence is not configured for this site');
            }
            const radiusMeters = typeof location.radius === 'number' && Number.isFinite(location.radius) && location.radius > 0 ? location.radius : 100;
            const distance = this.calculateDistance(lat, lng, location.geoLat, location.geoLng);
            const within = distance <= radiusMeters;
            return {
                within,
                distanceMeters: distance,
                radiusMeters,
                location,
                employee,
            };
        }
        async locationPing(employeeId, lat, lng) {
            var _a, _b;
            const activeTimesheet = await this.prisma.timesheet.findFirst({
                where: { employeeId, endTime: null },
                include: { breaks: { where: { endTime: null } }, location: true, employee: true },
                orderBy: { startTime: 'desc' },
            });
            if (!activeTimesheet) {
                throw new common_1.BadRequestException('No active timesheet found');
            }
            if (!activeTimesheet.locationId) {
                return { ok: true, status: 'NO_LOCATION' };
            }
            const onBreak = Array.isArray(activeTimesheet.breaks) && activeTimesheet.breaks.length > 0;
            if (onBreak) {
                return { ok: true, status: 'ON_BREAK' };
            }
            const outsideBreak = await this.prisma.break.findFirst({
                where: {
                    timesheetId: activeTimesheet.id,
                    endTime: null,
                    type: 'UNPAID_OUTSIDE',
                },
                orderBy: { startTime: 'desc' },
            });
            const status = await this.getClockLocationStatus(employeeId, activeTimesheet.locationId || undefined, lat, lng);
            if (!status.within) {
                if (outsideBreak) {
                    return { ok: true, status: 'OUTSIDE', distanceMeters: Math.round(status.distanceMeters), radiusMeters: status.radiusMeters };
                }
                const created = await this.prisma.break.create({
                    data: {
                        timesheetId: activeTimesheet.id,
                        startTime: new Date(),
                        type: 'UNPAID_OUTSIDE',
                    },
                });
                const employeeName = `${status.employee.firstName || ''} ${status.employee.lastName || ''}`.trim() || 'Employee';
                const siteName = ((_a = status.location) === null || _a === void 0 ? void 0 : _a.name) || 'site';
                const siteAddress = ((_b = status.location) === null || _b === void 0 ? void 0 : _b.address) || '';
                const msg = `${employeeName} left ${siteName}${siteAddress ? ` (${siteAddress})` : ''}. Outside: ${Math.round(status.distanceMeters)}m (radius ${status.radiusMeters}m).`;
                await this.notifyLeavingSite({
                    employeeId,
                    businessId: status.employee.businessId,
                    employeeUserId: status.employee.userId || undefined,
                    title: 'Employee left site',
                    message: msg,
                    metadata: { kind: 'LEFT_SITE', timesheetId: activeTimesheet.id, employeeId, locationId: status.location.id, breakId: created.id },
                });
                return { ok: true, status: 'LEFT_SITE', distanceMeters: Math.round(status.distanceMeters), radiusMeters: status.radiusMeters };
            }
            if (outsideBreak) {
                await this.prisma.break.update({
                    where: { id: outsideBreak.id },
                    data: { endTime: new Date() },
                });
                return { ok: true, status: 'BACK_ON_SITE' };
            }
            return { ok: true, status: 'ON_SITE' };
        }
        async notifyLeavingSite(args) {
            const [business, adminEmployees, superAdmins] = await Promise.all([
                this.prisma.business.findUnique({ where: { id: args.businessId }, select: { ownerId: true } }),
                this.prisma.employee.findMany({
                    where: { businessId: args.businessId, role: { in: ['BUSINESS_ADMIN', 'MANAGER'] }, userId: { not: null } },
                    select: { userId: true },
                }),
                this.prisma.user.findMany({ where: { role: 'SUPER_ADMIN' }, select: { id: true } }),
            ]);
            const recipientIds = new Set();
            if (args.employeeUserId)
                recipientIds.add(args.employeeUserId);
            if (business === null || business === void 0 ? void 0 : business.ownerId)
                recipientIds.add(business.ownerId);
            for (const e of adminEmployees)
                if (e.userId)
                    recipientIds.add(e.userId);
            for (const u of superAdmins)
                recipientIds.add(u.id);
            const recipients = Array.from(recipientIds);
            await Promise.all(recipients.map(async (userId) => {
                await this.notifications.createNotification(userId, 'WARNING', args.title, args.message, args.metadata);
                await this.notifications.sendPush(userId, { type: 'WARNING', title: args.title, message: args.message, metadata: args.metadata });
                await this.push.send(userId, { type: 'WARNING', title: args.title, message: args.message, metadata: args.metadata, actionUrl: '/dashboard/time' });
            }));
        }
        async requireClockInShift(employeeId) {
            const now = new Date();
            const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            const shift = await this.prisma.shift.findFirst({
                where: {
                    employeeId,
                    status: 'PUBLISHED',
                    startTime: { lt: endOfToday },
                    endTime: { gt: now },
                },
                select: { id: true, startTime: true, endTime: true, locationId: true },
                orderBy: { startTime: 'asc' },
            });
            if (!shift) {
                throw new common_1.BadRequestException('No scheduled shift available for clock-in today');
            }
            if (!shift.locationId) {
                throw new common_1.BadRequestException('This shift has no assigned site. Contact your manager.');
            }
            return shift;
        }
        async adminClockIn(employeeId, locationId, user) {
            if (user) {
                const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
                if (!employee)
                    throw new common_1.BadRequestException('Employee not found');
                await this.validateBusinessAccess(employee.businessId, user);
            }
            // 1. Clock In (create timesheet)
            // We bypass geofencing checks for admin overrides
            const timesheet = await this.clockIn(employeeId, locationId, undefined, undefined, undefined, { bypassGeofence: true });
            // 2. Check if there is an active shift for this time
            const now = new Date();
            const existingShift = await this.prisma.shift.findFirst({
                where: {
                    employeeId,
                    startTime: { lte: now },
                    endTime: { gte: now },
                },
            });
            // 3. If no shift exists, create an "Unscheduled" shift
            if (!existingShift) {
                const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
                if (!employee)
                    throw new common_1.BadRequestException('Employee not found');
                const records = await this.prisma.availability.findMany({
                    where: { employeeId },
                    orderBy: { createdAt: 'desc' }
                });
                if (records && records.length > 0) {
                    const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()];
                    const applies = (rec, date) => {
                        const rep = String(rec.repeat || '').toUpperCase();
                        if (rep === 'WEEKLY') {
                            const days = typeof rec.repeatDays === 'string' ? rec.repeatDays.split(',') : [];
                            if (!days.includes(dayKey))
                                return false;
                            if (String(rec.endOption || '').toUpperCase() === 'ENDS_ON' && rec.endOn) {
                                if (date > new Date(rec.endOn))
                                    return false;
                            }
                            return true;
                        }
                        const sd = rec.startDate ? new Date(rec.startDate) : null;
                        const ed = rec.endDate ? new Date(rec.endDate) : null;
                        if (!sd)
                            return false;
                        const d0 = new Date(sd);
                        d0.setHours(0, 0, 0, 0);
                        if (ed) {
                            return date >= d0 && date <= ed;
                        }
                        return date.toDateString() === sd.toDateString();
                    };
                    const overlapsTime = (rec, s) => {
                        if (!!rec.allDay)
                            return true;
                        const sd = new Date(rec.startDate);
                        const ed = rec.endDate ? new Date(rec.endDate) : null;
                        const startMinutes = sd.getHours() * 60 + sd.getMinutes();
                        const endMinutes = ed ? (ed.getHours() * 60 + ed.getMinutes()) : (23 * 60 + 59);
                        const sMin = s.getHours() * 60 + s.getMinutes();
                        return sMin < endMinutes && sMin > startMinutes;
                    };
                    let blocked = false;
                    for (const r of records) {
                        if (!applies(r, now))
                            continue;
                        if (!r.isAvailable) {
                            const overlaps = !!r.allDay || overlapsTime(r, now);
                            if (overlaps) {
                                blocked = true;
                                break;
                            }
                        }
                    }
                    if (blocked) {
                        throw new common_1.BadRequestException('Employee is not available for this time');
                    }
                }
                // Create an open-ended shift (placeholder 8h)
                const endTime = new Date(now);
                endTime.setHours(endTime.getHours() + 8);
                await this.prisma.shift.create({
                    data: {
                        businessId: employee.businessId,
                        employeeId: employee.id,
                        locationId: locationId,
                        startTime: now,
                        endTime: endTime,
                        status: 'PUBLISHED',
                        notes: 'Unscheduled shift started by Admin',
                    },
                });
            }
            return timesheet;
        }
        async adminClockOut(employeeId, user) {
            if (user) {
                const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
                if (!employee)
                    throw new common_1.BadRequestException('Employee not found');
                await this.validateBusinessAccess(employee.businessId, user);
            }
            // 1. Check for active break and end it if exists (Force end break)
            const activeTimesheet = await this.prisma.timesheet.findFirst({
                where: {
                    employeeId,
                    endTime: null,
                },
            });
            if (activeTimesheet) {
                const activeBreak = await this.prisma.break.findFirst({
                    where: {
                        timesheetId: activeTimesheet.id,
                        endTime: null,
                    },
                });
                if (activeBreak) {
                    await this.prisma.break.update({
                        where: { id: activeBreak.id },
                        data: { endTime: new Date() },
                    });
                }
            }
            // 2. Clock Out (update timesheet)
            const timesheet = await this.clockOut(employeeId);
            // 3. Find the active shift for this employee and end it
            const now = new Date();
            const activeShift = await this.prisma.shift.findFirst({
                where: {
                    employeeId,
                    status: 'PUBLISHED',
                    startTime: { lte: now },
                    endTime: { gte: now },
                }
            });
            if (activeShift) {
                await this.prisma.shift.update({
                    where: { id: activeShift.id },
                    data: {
                        endTime: now
                    }
                });
            }
            return timesheet;
        }
        async clockOut(employeeId, ip, note, lat, lng) {
            const activeTimesheet = await this.prisma.timesheet.findFirst({
                where: {
                    employeeId,
                    endTime: null,
                },
            });
            if (!activeTimesheet) {
                throw new common_1.BadRequestException('No active timesheet found to clock out from');
            }
            // Check if there is an active break
            const activeBreak = await this.prisma.break.findFirst({
                where: {
                    timesheetId: activeTimesheet.id,
                    endTime: null,
                },
            });
            if (activeBreak) {
                throw new common_1.BadRequestException('You must end your break before clocking out');
            }
            return this.prisma.timesheet.update({
                where: { id: activeTimesheet.id },
                data: {
                    endTime: new Date(),
                    status: 'PENDING', // Pending approval
                    clockOutIp: ip,
                    clockOutLat: typeof lat === 'number' && Number.isFinite(lat) ? lat : undefined,
                    clockOutLng: typeof lng === 'number' && Number.isFinite(lng) ? lng : undefined,
                    employeeNote: note,
                },
            });
        }
        async startBreak(employeeId, type = 'UNPAID', lat, lng) {
            const activeTimesheet = await this.prisma.timesheet.findFirst({
                where: {
                    employeeId,
                    endTime: null,
                },
            });
            if (!activeTimesheet) {
                throw new common_1.BadRequestException('No active timesheet found to start a break');
            }
            await this.validateWithinClockLocation(employeeId, activeTimesheet.locationId || undefined, lat, lng);
            const activeBreak = await this.prisma.break.findFirst({
                where: {
                    timesheetId: activeTimesheet.id,
                    endTime: null,
                },
            });
            if (activeBreak) {
                throw new common_1.BadRequestException('You are already on a break');
            }
            const normalizedType = String(type || '').toUpperCase() === 'PAID' ? 'PAID' : 'UNPAID';
            return this.prisma.break.create({
                data: {
                    timesheetId: activeTimesheet.id,
                    startTime: new Date(),
                    type: normalizedType,
                },
            });
        }
        async endBreak(employeeId, lat, lng) {
            const activeTimesheet = await this.prisma.timesheet.findFirst({
                where: {
                    employeeId,
                    endTime: null,
                },
            });
            if (!activeTimesheet) {
                throw new common_1.BadRequestException('No active timesheet found');
            }
            await this.validateWithinClockLocation(employeeId, activeTimesheet.locationId || undefined, lat, lng);
            const activeBreak = await this.prisma.break.findFirst({
                where: {
                    timesheetId: activeTimesheet.id,
                    endTime: null,
                },
            });
            if (!activeBreak) {
                throw new common_1.BadRequestException('No active break found to end');
            }
            return this.prisma.break.update({
                where: { id: activeBreak.id },
                data: {
                    endTime: new Date(),
                },
            });
        }
        async getEmployeeStatus(employeeId, user) {
            if (user) {
                const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
                if (employee)
                    await this.validateBusinessAccess(employee.businessId, user);
            }
            const activeTimesheet = await this.prisma.timesheet.findFirst({
                where: {
                    employeeId,
                    endTime: null,
                },
                include: {
                    breaks: {
                        where: { endTime: null }
                    }
                }
            });
            if (!activeTimesheet) {
                return { status: 'CLOCKED_OUT', startTime: null };
            }
            if (activeTimesheet.breaks.length > 0) {
                return {
                    status: 'ON_BREAK',
                    startTime: activeTimesheet.startTime,
                    breakStartTime: activeTimesheet.breaks[0].startTime
                };
            }
            return { status: 'CLOCKED_IN', startTime: activeTimesheet.startTime };
        }
        async getTimesheets(employeeId, start, end, user) {
            if (user) {
                const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
                if (employee)
                    await this.validateBusinessAccess(employee.businessId, user);
            }
            const where = {
                employeeId,
                startTime: { gte: start },
                endTime: { lte: end }
            };
            return this.prisma.timesheet.findMany({
                where,
                include: {
                    employee: true,
                    breaks: true,
                    location: true,
                }
            });
        }
        async updateTimesheet(id, data, user) {
            const timesheet = await this.prisma.timesheet.findUnique({ where: { id }, include: { employee: true } });
            if (!timesheet)
                throw new common_1.BadRequestException('Timesheet not found');
            if (user) {
                await this.validateBusinessAccess(timesheet.employee.businessId, user);
            }
            const start = data.startTime ? new Date(data.startTime) : undefined;
            const end = data.endTime ? new Date(data.endTime) : undefined;
            if (start && end && end < start) {
                throw new common_1.BadRequestException('End time cannot be before start time');
            }
            if (data.locationId) {
                const loc = await this.prisma.location.findUnique({ where: { id: data.locationId } });
                if (!loc) {
                    throw new common_1.BadRequestException('Location not found');
                }
            }
            const updateData = {
                startTime: start !== null && start !== void 0 ? start : undefined,
                endTime: end !== null && end !== void 0 ? end : undefined,
                status: data.status
            };
            if (data.locationId) {
                updateData.location = { connect: { id: data.locationId } };
            }
            // Validate breaks payload if provided
            const breaks = Array.isArray(data.breaks) ? data.breaks : [];
            for (const b of breaks) {
                const bs = new Date(b.startTime);
                const be = b.endTime ? new Date(b.endTime) : undefined;
                if (Number.isNaN(bs.getTime()) || (be && Number.isNaN(be.getTime()))) {
                    throw new common_1.BadRequestException('Invalid break time format');
                }
                if (be && bs > be) {
                    throw new common_1.BadRequestException('Break end time cannot be before start time');
                }
                if (start && end && be && (bs < start || be > end)) {
                    // Optional strict rule: enforce breaks within timesheet window when both provided
                    throw new common_1.BadRequestException('Break must be within timesheet start and end time');
                }
            }
            if (data.employeeNote !== undefined) {
                updateData.employeeNote = data.employeeNote;
            }
            // Use transaction to avoid nested write issues and provide clearer errors
            let result = null;
            try {
                result = await this.prisma.$transaction(async (tx) => {
                    // Update base timesheet fields and relations
                    const updated = await tx.timesheet.update({
                        where: { id },
                        data: updateData,
                        include: {
                            employee: true,
                            breaks: true,
                            location: true,
                        }
                    });
                    // Replace breaks if provided
                    if (breaks) {
                        await tx.break.deleteMany({ where: { timesheetId: id } });
                        if (breaks.length > 0) {
                            await tx.break.createMany({
                                data: breaks.map(b => ({
                                    timesheetId: id,
                                    startTime: new Date(b.startTime),
                                    endTime: b.endTime ? new Date(b.endTime) : null,
                                    type: b.type || 'MEAL'
                                }))
                            });
                        }
                    }
                    // Return hydrated timesheet
                    return tx.timesheet.findUnique({
                        where: { id },
                        include: {
                            employee: true,
                            breaks: true,
                            location: true,
                        }
                    });
                });
            }
            catch (e) {
                // Normalize Prisma errors to 400 to avoid opaque 500 Internal Server Errors
                const message = (e === null || e === void 0 ? void 0 : e.message) || 'Failed to update timesheet';
                throw new common_1.BadRequestException(message);
            }
            return result;
        }
        async deleteTimesheet(id, requestingEmployeeId, user) {
            const timesheet = await this.prisma.timesheet.findUnique({ where: { id }, include: { employee: true } });
            if (!timesheet)
                throw new common_1.BadRequestException('Timesheet not found');
            if (user) {
                await this.validateBusinessAccess(timesheet.employee.businessId, user);
            }
            if (requestingEmployeeId && timesheet.employeeId !== requestingEmployeeId) {
                throw new common_1.ForbiddenException('You can only delete your own timesheets');
            }
            // Soft delete by setting status to DISCARDED
            return this.prisma.timesheet.update({
                where: { id },
                data: { status: 'DISCARDED' }
            });
        }
        async restoreTimesheet(id, requestingEmployeeId, user) {
            const timesheet = await this.prisma.timesheet.findUnique({ where: { id }, include: { employee: true } });
            if (!timesheet)
                throw new common_1.BadRequestException('Timesheet not found');
            if (user) {
                await this.validateBusinessAccess(timesheet.employee.businessId, user);
            }
            if (requestingEmployeeId && timesheet.employeeId !== requestingEmployeeId) {
                throw new common_1.ForbiddenException('You can only restore your own timesheets');
            }
            // Restore by setting status to PENDING
            return this.prisma.timesheet.update({
                where: { id },
                data: { status: 'PENDING' }
            });
        }
        async getBusinessTimesheets(businessId, start, end, user) {
            if (user)
                await this.validateBusinessAccess(businessId, user);
            return this.prisma.timesheet.findMany({
                where: {
                    employee: {
                        businessId
                    },
                    // Overlap logic: Timesheet starts before the window ends...
                    startTime: { lte: end },
                    // ...and ends after the window starts (or hasn't ended yet)
                    OR: [
                        { endTime: { gte: start } },
                        { endTime: null }
                    ]
                },
                include: {
                    employee: true,
                    breaks: true,
                    location: true,
                },
                orderBy: {
                    startTime: 'desc'
                }
            });
        }
        async getBusinessId(userId) {
            const employee = await this.prisma.employee.findFirst({ where: { userId } });
            if (!employee)
                throw new common_1.BadRequestException('User is not associated with a business');
            return employee.businessId;
        }
        // Haversine formula to calculate distance in meters
        calculateDistance(lat1, lon1, lat2, lon2) {
            const R = 6371e3; // metres
            const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
            const φ2 = lat2 * Math.PI / 180;
            const Δφ = (lat2 - lat1) * Math.PI / 180;
            const Δλ = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        }
        async handleAutoClockOut() {
            const logger = new common_1.Logger('AutoClockOut');
            const now = new Date();
            const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const staleTimesheets = await this.prisma.timesheet.findMany({
                where: {
                    endTime: null,
                    startTime: {
                        lt: twentyFourHoursAgo
                    }
                }
            });
            if (staleTimesheets.length === 0)
                return;
            logger.log(`Found ${staleTimesheets.length} stale timesheets to auto-clock out.`);
            for (const ts of staleTimesheets) {
                const autoEndTime = new Date(ts.startTime.getTime() + 24 * 60 * 60 * 1000);
                try {
                    await this.prisma.timesheet.update({
                        where: { id: ts.id },
                        data: {
                            endTime: autoEndTime,
                            employeeNote: (ts.employeeNote ? ts.employeeNote + '\n' : '') + '[System] Auto-clocked out after 24 hours.'
                        }
                    });
                    logger.log(`Auto-clocked out timesheet ${ts.id}`);
                }
                catch (error) {
                    logger.error(`Failed to auto-clock out timesheet ${ts.id}: ${error.message}`);
                }
            }
        }
    };
    __setFunctionName(_classThis, "TimeTrackingService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _handleAutoClockOut_decorators = [(0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR)];
        __esDecorate(_classThis, null, _handleAutoClockOut_decorators, { kind: "method", name: "handleAutoClockOut", static: false, private: false, access: { has: obj => "handleAutoClockOut" in obj, get: obj => obj.handleAutoClockOut }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        TimeTrackingService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return TimeTrackingService = _classThis;
})();
exports.TimeTrackingService = TimeTrackingService;
