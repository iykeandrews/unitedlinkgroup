export const TYPES_VERSION = '0.0.1';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  BUSINESS_ADMIN = 'BUSINESS_ADMIN',
  MANAGER = 'MANAGER',
  FINANCE = 'FINANCE',
  EMPLOYEE = 'EMPLOYEE',
  VENDOR = 'VENDOR',
}

export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACTOR = 'CONTRACTOR',
  TEMPORARY = 'TEMPORARY',
}

export enum PayType {
  HOURLY = 'HOURLY',
  SALARIED = 'SALARIED',
}

export enum TimesheetStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum PayrollStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  PROCESSED = 'PROCESSED',
  PAID = 'PAID',
}

export enum ShiftStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ASSIGNED = 'ASSIGNED',
  OPEN = 'OPEN',
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
