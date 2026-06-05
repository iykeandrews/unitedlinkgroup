import React from 'react';
interface RequestLeaveModalProps {
    isOpen: boolean;
    onClose: () => void;
    employeeId: string;
    employeeName: string;
    onSuccess?: () => void;
}
export declare function RequestLeaveModal({ isOpen, onClose, employeeId, employeeName, onSuccess }: RequestLeaveModalProps): React.JSX.Element;
export {};
