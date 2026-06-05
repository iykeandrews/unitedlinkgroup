export interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    hourlyRate?: number;
}
export interface Client {
    id: string;
    name: string;
    status: string;
}
export interface Location {
    id: string;
    name: string;
    address: string;
    code?: string;
    businessId?: string;
    clientId?: string;
    client?: Client;
    workOrder?: string;
    startDate?: string;
    endDate?: string;
}
export interface ShiftApplication {
    id: string;
    shiftId: string;
    employeeId: string;
    status: string;
    employee: Employee;
    createdAt: string;
}
export interface ShiftCallout {
    id: string;
    shiftId: string;
    absentEmployeeId: string;
    absentEmployee?: Employee;
    reasonCode: string;
    reasonNote?: string | null;
    type: string;
    noticeAt: string;
    documentationUrl?: string | null;
    submittedByUserId?: string | null;
    resolvedAt?: string | null;
}
export interface ShiftCoverage {
    id: string;
    shiftId: string;
    calloutId?: string | null;
    absentEmployeeId?: string | null;
    replacementEmployeeId: string;
    replacementEmployee?: Employee;
    method?: string;
    reassignedAt: string;
    acceptedAt?: string | null;
    responseMinutes?: number | null;
}
export interface Shift {
    id: string;
    groupId?: string;
    startTime: string;
    endTime?: string;
    employeeId?: string;
    locationId: string;
    employee?: Employee;
    location?: Location;
    status?: string;
    notes?: string;
    breakMinutes?: number;
    applications?: ShiftApplication[];
    callout?: ShiftCallout | null;
    coverages?: ShiftCoverage[];
}
export interface LeaveRequest {
    id: string;
    employeeId: string;
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    isAllDay?: boolean;
    startTime?: string | null;
    endTime?: string | null;
    resumedAt?: string | null;
    status: string;
    employee?: Employee;
}
export type ViewType = 'day' | 'week' | 'month';
export type GroupBy = 'area' | 'employee';
