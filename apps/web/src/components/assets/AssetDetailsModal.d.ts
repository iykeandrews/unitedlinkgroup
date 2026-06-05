import React from 'react';
interface AssetDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAssign: (asset: any) => void;
    onReturn: (asset: any) => void;
    asset: any;
}
export default function AssetDetailsModal({ isOpen, onClose, onAssign, onReturn, asset: initialAsset }: AssetDetailsModalProps): React.JSX.Element | null;
export {};
