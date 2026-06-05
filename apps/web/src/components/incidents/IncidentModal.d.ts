import React from 'react';
interface IncidentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
}
export default function IncidentModal({ isOpen, onClose, onSuccess, initialData }: IncidentModalProps): React.JSX.Element;
export {};
