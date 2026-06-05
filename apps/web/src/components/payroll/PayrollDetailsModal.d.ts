import React from 'react';
interface PayrollDetailsModalProps {
    payrollId: string | null;
    onClose: () => void;
}
export default function PayrollDetailsModal({ payrollId, onClose }: PayrollDetailsModalProps): React.JSX.Element | null;
export {};
