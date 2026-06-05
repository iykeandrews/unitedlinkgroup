import React from 'react';
interface AssetReturnModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    asset: any;
}
export default function AssetReturnModal({ isOpen, onClose, onSuccess, asset }: AssetReturnModalProps): React.JSX.Element | null;
export {};
