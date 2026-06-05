interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    status: string;
    type: string;
    payType: string;
    hourlyRate?: number;
    salary?: number;
    phone?: string;
    address?: string;
    preferredName?: string;
    pronouns?: string;
    dateOfBirth?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    officialEmail?: string;
    hireDate?: string;
    payrollId?: string;
    workPeriod?: string;
    hoursPerPeriod?: number;
    daysPerPeriod?: number;
    stressProfile?: string;
}
interface Business {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    mobile?: string;
    email?: string;
    logoUrl?: string;
}
export declare const generateEmployeePdf: (employee: Employee, business?: Business | null) => Promise<void>;
export {};
