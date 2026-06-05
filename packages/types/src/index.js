"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShiftStatus = exports.PayrollStatus = exports.TimesheetStatus = exports.PayType = exports.EmploymentType = exports.UserRole = exports.TYPES_VERSION = void 0;
exports.TYPES_VERSION = '0.0.1';
var UserRole;
(function (UserRole) {
    UserRole["SUPER_ADMIN"] = "SUPER_ADMIN";
    UserRole["BUSINESS_ADMIN"] = "BUSINESS_ADMIN";
    UserRole["MANAGER"] = "MANAGER";
    UserRole["FINANCE"] = "FINANCE";
    UserRole["EMPLOYEE"] = "EMPLOYEE";
    UserRole["VENDOR"] = "VENDOR";
})(UserRole || (exports.UserRole = UserRole = {}));
var EmploymentType;
(function (EmploymentType) {
    EmploymentType["FULL_TIME"] = "FULL_TIME";
    EmploymentType["PART_TIME"] = "PART_TIME";
    EmploymentType["CONTRACTOR"] = "CONTRACTOR";
    EmploymentType["TEMPORARY"] = "TEMPORARY";
})(EmploymentType || (exports.EmploymentType = EmploymentType = {}));
var PayType;
(function (PayType) {
    PayType["HOURLY"] = "HOURLY";
    PayType["SALARIED"] = "SALARIED";
})(PayType || (exports.PayType = PayType = {}));
var TimesheetStatus;
(function (TimesheetStatus) {
    TimesheetStatus["PENDING"] = "PENDING";
    TimesheetStatus["APPROVED"] = "APPROVED";
    TimesheetStatus["REJECTED"] = "REJECTED";
})(TimesheetStatus || (exports.TimesheetStatus = TimesheetStatus = {}));
var PayrollStatus;
(function (PayrollStatus) {
    PayrollStatus["DRAFT"] = "DRAFT";
    PayrollStatus["APPROVED"] = "APPROVED";
    PayrollStatus["PROCESSED"] = "PROCESSED";
    PayrollStatus["PAID"] = "PAID";
})(PayrollStatus || (exports.PayrollStatus = PayrollStatus = {}));
var ShiftStatus;
(function (ShiftStatus) {
    ShiftStatus["DRAFT"] = "DRAFT";
    ShiftStatus["PUBLISHED"] = "PUBLISHED";
    ShiftStatus["ASSIGNED"] = "ASSIGNED";
    ShiftStatus["OPEN"] = "OPEN";
})(ShiftStatus || (exports.ShiftStatus = ShiftStatus = {}));
//# sourceMappingURL=index.js.map