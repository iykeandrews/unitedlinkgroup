import React from 'react';
interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    email: string;
    status: string;
    availability?: any[];
}
export interface Availability {
    id: string;
    employeeId: string;
    isAvailable: boolean;
    startDate: string;
    endDate?: string;
    allDay: boolean;
    repeat: string;
    repeatDays?: string;
    endOption?: string;
    endOn?: string;
    comment?: string;
}
interface AvailabilityCalendarProps {
    employees: Employee[];
    availabilities: Availability[];
    startDate: Date;
    endDate: Date;
    onEdit: (employee: Employee) => void;
}
export declare const isAvailableOnDate: (availability: Availability, date: Date) => boolean;
export declare function AvailabilityCalendar({ employees, availabilities, startDate, endDate, onEdit }: AvailabilityCalendarProps): React.JSX.Element;
export {};
