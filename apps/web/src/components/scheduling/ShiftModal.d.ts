import React from 'react';
import { Shift, Employee, Location } from './types';
interface ShiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (shift: Partial<Shift>) => void;
    onDelete?: (shiftId: string) => void;
    shift?: Shift | null;
    employees: Employee[];
    locations: Location[];
    defaultDate?: Date;
    defaultLocationId?: string;
    defaultEmployee?: Employee;
    readOnly?: boolean;
    onApply?: () => void;
    onApproveApplication?: (appId: string) => void;
    onDeclineApplication?: (appId: string) => void;
    currentUserId?: string;
}
export declare function ShiftModal({ isOpen, onClose, onSave, onDelete, shift, employees, locations, defaultDate, defaultLocationId, defaultEmployee, readOnly, onApply, onApproveApplication, onDeclineApplication, currentUserId }: ShiftModalProps): React.JSX.Element | null;
export {};
