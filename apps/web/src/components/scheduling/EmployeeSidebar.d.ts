import React from 'react';
import { Employee, Shift } from './types';
interface EmployeeSidebarProps {
    employees: Employee[];
    shifts: Shift[];
    allShifts: Shift[];
    statusFilter: 'ALL' | 'EMPTY' | 'UNPUBLISHED' | 'PUBLISHED' | 'OPEN';
    onStatusFilterChange: (next: 'ALL' | 'EMPTY' | 'UNPUBLISHED' | 'PUBLISHED' | 'OPEN') => void;
}
export declare function EmployeeSidebar({ employees, shifts, allShifts, statusFilter, onStatusFilterChange }: EmployeeSidebarProps): React.JSX.Element;
export {};
