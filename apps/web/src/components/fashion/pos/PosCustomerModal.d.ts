import React from 'react';
interface PosCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
}
export default function PosCustomerModal({ isOpen, onClose }: PosCustomerModalProps): React.JSX.Element | null;
export {};
