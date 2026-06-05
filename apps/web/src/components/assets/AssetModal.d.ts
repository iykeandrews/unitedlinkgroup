import React from 'react';
interface AssetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
}
export default function AssetModal({ isOpen, onClose, onSuccess, initialData }: AssetModalProps): React.JSX.Element;
export {};
