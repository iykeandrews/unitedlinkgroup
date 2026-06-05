export declare const TYPES_VERSION = "0.0.1";
export declare enum UserRole {
    SUPER_ADMIN = "SUPER_ADMIN",
    BUSINESS_ADMIN = "BUSINESS_ADMIN",
    MANAGER = "MANAGER",
    FINANCE = "FINANCE",
    EMPLOYEE = "EMPLOYEE",
    VENDOR = "VENDOR"
}
export declare enum EmploymentType {
    FULL_TIME = "FULL_TIME",
    PART_TIME = "PART_TIME",
    CONTRACTOR = "CONTRACTOR",
    TEMPORARY = "TEMPORARY"
}
export declare enum PayType {
    HOURLY = "HOURLY",
    SALARIED = "SALARIED"
}
export declare enum TimesheetStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED"
}
export declare enum PayrollStatus {
    DRAFT = "DRAFT",
    APPROVED = "APPROVED",
    PROCESSED = "PROCESSED",
    PAID = "PAID"
}
export declare enum ShiftStatus {
    DRAFT = "DRAFT",
    PUBLISHED = "PUBLISHED",
    ASSIGNED = "ASSIGNED",
    OPEN = "OPEN"
}
export interface IBusiness {
    id: string;
    name: string;
    ein: string;
    ownerId: string;
}
export interface IEmployee {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
    businessId: string;
}
