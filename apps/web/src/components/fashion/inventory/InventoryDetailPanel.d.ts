import React from 'react';
interface InventoryDetailPanelProps {
    isOpen: boolean;
    onClose: () => void;
    productId: string;
    variantId: string;
}
export default function InventoryDetailPanel({ isOpen, onClose, productId, variantId }: InventoryDetailPanelProps): React.JSX.Element | null;
export {};
