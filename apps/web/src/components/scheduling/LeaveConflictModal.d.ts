import React from 'react';
interface LeaveConflictModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    employeeName: string;
    locationName: string;
    date: string;
}
export declare const LeaveConflictModal: React.FC<LeaveConflictModalProps>;
export {};
