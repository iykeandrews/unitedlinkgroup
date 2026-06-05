import React from 'react';
interface PosHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}
export default function PosHistoryModal({ isOpen, onClose }: PosHistoryModalProps): React.JSX.Element | null;
export {};
