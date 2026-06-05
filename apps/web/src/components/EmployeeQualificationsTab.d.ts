import React from 'react';
export interface EmployeeQualificationsTabRef {
    openAddModal: () => void;
}
interface EmployeeQualificationsTabProps {
    employeeId: string;
    highlightId?: string;
    hideHeader?: boolean;
    className?: string;
}
export declare const EmployeeQualificationsTab: React.ForwardRefExoticComponent<EmployeeQualificationsTabProps & React.RefAttributes<EmployeeQualificationsTabRef>>;
export {};
