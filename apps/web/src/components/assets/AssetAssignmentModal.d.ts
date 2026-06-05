import React from 'react';
interface AssetAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    asset: any;
}
export default function AssetAssignmentModal({ isOpen, onClose, onSuccess, asset }: AssetAssignmentModalProps): React.JSX.Element | null;
export {};
