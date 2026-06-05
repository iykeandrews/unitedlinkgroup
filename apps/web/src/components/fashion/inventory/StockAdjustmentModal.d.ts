import React from 'react';
interface StockAdjustmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    productId: string;
    variantId: string;
    currentStock: number;
    productName: string;
    variantName: string;
}
export default function StockAdjustmentModal({ isOpen, onClose, productId, variantId, currentStock, productName, variantName }: StockAdjustmentModalProps): React.JSX.Element | null;
export {};
