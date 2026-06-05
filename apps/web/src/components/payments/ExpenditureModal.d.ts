import React from 'react';
interface ExpenditureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}
export default function ExpenditureModal({ isOpen, onClose, onSuccess }: ExpenditureModalProps): React.JSX.Element;
export {};
