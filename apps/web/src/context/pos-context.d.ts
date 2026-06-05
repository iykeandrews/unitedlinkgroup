import React, { ReactNode } from 'react';
import { Product, ProductVariant, Customer, Transaction } from '../types/fashion';
export interface PosCartItem {
    product: Product;
    variant: ProductVariant;
    quantity: number;
}
interface PosContextType {
    products: Product[];
    cart: PosCartItem[];
    addToCart: (product: Product, variant: ProductVariant) => void;
    removeFromCart: (variantId: string) => void;
    updateQuantity: (variantId: string, quantity: number) => void;
    clearCart: () => void;
    processCheckout: (paymentMethod: 'Cash' | 'Card' | 'Mobile' | 'Split') => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    selectedCategory: string | null;
    setSelectedCategory: (category: string | null) => void;
    isCheckoutModalOpen: boolean;
    setIsCheckoutModalOpen: (isOpen: boolean) => void;
    customers: Customer[];
    selectedCustomer: Customer | null;
    addCustomer: (customer: Omit<Customer, 'id' | 'totalSpent' | 'createdAt'>) => void;
    selectCustomer: (customer: Customer | null) => void;
    transactions: Transaction[];
    returnItem: (transactionId: string, variantId: string, reason: string) => void;
    refundTransaction: (transactionId: string, reason?: string) => void;
    subtotal: number;
    tax: number;
    total: number;
    totalItems: number;
    lastTransaction: Transaction | null;
}
export declare function PosProvider({ children }: {
    children: ReactNode;
}): React.JSX.Element;
export declare function usePos(): PosContextType;
export {};
