import React, { ReactNode } from 'react';
import { Product, ProductVariant } from '../types/fashion';
export interface CartItem {
    id: string;
    product: Product;
    variant?: ProductVariant;
    quantity: number;
}
interface FashionContextType {
    cart: CartItem[];
    wishlist: string[];
    addToCart: (product: Product, variant?: ProductVariant, quantity?: number) => void;
    removeFromCart: (cartItemId: string) => void;
    updateCartQuantity: (cartItemId: string, quantity: number) => void;
    clearCart: () => void;
    toggleWishlist: (productId: string) => void;
    isInWishlist: (productId: string) => boolean;
    cartTotal: number;
    cartCount: number;
}
export declare function FashionProvider({ children }: {
    children: ReactNode;
}): React.JSX.Element;
export declare function useFashion(): FashionContextType;
export {};
