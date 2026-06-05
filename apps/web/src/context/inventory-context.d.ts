import React, { ReactNode } from 'react';
import { Product, StockLog, StockAdjustmentReason } from '../types/fashion';
interface InventoryContextType {
    products: Product[];
    stockLogs: StockLog[];
    updateStock: (productId: string, variantId: string, newQuantity: number, reason: StockAdjustmentReason, note?: string) => void;
    bulkUpdateStock: (updates: {
        productId: string;
        variantId: string;
        newQuantity: number;
    }[], reason: StockAdjustmentReason, note?: string) => void;
    addProduct: (product: Product) => void;
    updateProduct: (product: Product) => void;
}
export declare function InventoryProvider({ children }: {
    children: ReactNode;
}): React.JSX.Element;
export declare function useInventory(): InventoryContextType;
export {};
