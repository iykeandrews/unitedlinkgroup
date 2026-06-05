import React from 'react';
interface CreatePatrolLogModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    servicePinId: string;
    servicePinName?: string;
}
export default function CreatePatrolLogModal({ isOpen, onClose, onSuccess, servicePinId, servicePinName }: CreatePatrolLogModalProps): React.JSX.Element | null;
export {};
