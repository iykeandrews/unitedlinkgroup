'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, ProductVariant, Customer, Transaction } from '../types/fashion';
import { MOCK_PRODUCTS } from '../lib/mock-fashion-data';
import { MOCK_CUSTOMERS, MOCK_TRANSACTIONS } from '../lib/mock-pos-data';

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
  
  // Search & Filter
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  
  // Checkout State
  isCheckoutModalOpen: boolean;
  setIsCheckoutModalOpen: (isOpen: boolean) => void;
  
  // Customers
  customers: Customer[];
  selectedCustomer: Customer | null;
  addCustomer: (customer: Omit<Customer, 'id' | 'totalSpent' | 'createdAt'>) => void;
  selectCustomer: (customer: Customer | null) => void;

  // Transactions
  transactions: Transaction[];
  returnItem: (transactionId: string, variantId: string, reason: string) => void;
  refundTransaction: (transactionId: string, reason?: string) => void;

  // Totals
  subtotal: number;
  tax: number;
  total: number;
  totalItems: number;
  
  // Last Transaction for Receipt
  lastTransaction: Transaction | null;
}

const PosContext = createContext<PosContextType | undefined>(undefined);

export function PosProvider({ children }: { children: ReactNode }) {
  // Initialize products from mock data
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [cart, setCart] = useState<PosCartItem[]>(() => {
    try {
      if (typeof window === 'undefined') return [];
      const saved = window.localStorage.getItem('pos_cart');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);

  // Customer & Transaction State
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);

  // Save cart to local storage on change
  useEffect(() => {
    localStorage.setItem('pos_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: Product, variant: ProductVariant) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.variant.id === variant.id);
      if (existingItem) {
        // Check stock limit
        if (existingItem.quantity >= variant.stockQuantity) {
            alert('Cannot add more than available stock');
            return prev;
        }
        return prev.map(item => 
          item.variant.id === variant.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, variant, quantity: 1 }];
    });
  };

  const removeFromCart = (variantId: string) => {
    setCart(prev => prev.filter(item => item.variant.id !== variantId));
  };

  const updateQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(variantId);
      return;
    }
    
    // Check stock
    const item = cart.find(i => i.variant.id === variantId);
    if (item && quantity > item.variant.stockQuantity) {
         alert('Cannot add more than available stock');
         return;
    }

    setCart(prev => prev.map(item => 
      item.variant.id === variantId 
        ? { ...item, quantity }
        : item
    ));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
  };

  const addCustomer = (customerData: Omit<Customer, 'id' | 'totalSpent' | 'createdAt'>) => {
    const newCustomer: Customer = {
      ...customerData,
      id: `c${Date.now()}`,
      totalSpent: 0,
      createdAt: new Date(),
    };
    setCustomers(prev => [...prev, newCustomer]);
    setSelectedCustomer(newCustomer);
  };

  const selectCustomer = (customer: Customer | null) => {
    setSelectedCustomer(customer);
  };

  const returnItem = (transactionId: string, variantId: string, reason: string) => {
    setTransactions(prev => prev.map(tx => {
      if (tx.id !== transactionId) return tx;

      const updatedItems = tx.items.map(item => 
        item.variantId === variantId 
          ? { ...item, returned: true, returnReason: reason }
          : item
      );

      const allReturned = updatedItems.every(item => item.returned);
      const anyReturned = updatedItems.some(item => item.returned);
      
      const newStatus = allReturned ? 'Refunded' : (anyReturned ? 'Partially Refunded' : tx.status);

      return {
        ...tx,
        items: updatedItems,
        status: newStatus as any
      };
    }));
  };

  const refundTransaction = (transactionId: string, reason: string = 'Full Transaction Refund') => {
    setTransactions(prev => prev.map(tx => {
        if (tx.id !== transactionId) return tx;
        return {
            ...tx,
            status: 'Refunded',
            items: tx.items.map(item => ({ ...item, returned: true, returnReason: reason }))
        };
    }));
  };

  const processCheckout = (paymentMethod: 'Cash' | 'Card' | 'Mobile' | 'Split' = 'Card') => {
    // Capture transaction details
    const currentSubtotal = cart.reduce((sum, item) => {
      const price = item.variant.salePrice || item.variant.price;
      return sum + (price * item.quantity);
    }, 0);
    const currentTax = currentSubtotal * 0.08;
    const currentTotal = currentSubtotal + currentTax;

    const newTransaction: Transaction = {
      id: `TX-${Date.now()}`,
      date: new Date(),
      cashierName: 'Current User', // Placeholder
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : undefined,
      items: cart.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        variantId: item.variant.id,
        sku: item.variant.sku,
        size: item.variant.size,
        color: item.variant.color,
        quantity: item.quantity,
        price: item.variant.salePrice || item.variant.price
      })),
      subtotal: currentSubtotal,
      tax: currentTax,
      total: currentTotal,
      paymentMethod,
      status: 'Completed'
    };

    setLastTransaction(newTransaction);
    setTransactions(prev => [newTransaction, ...prev]);

    // Update customer total spent
    if (selectedCustomer) {
        setCustomers(prev => prev.map(c => 
            c.id === selectedCustomer.id 
                ? { ...c, totalSpent: c.totalSpent + currentTotal }
                : c
        ));
    }

    // Decrement stock
    const newProducts = products.map(product => {
      const cartItemsForProduct = cart.filter(item => item.product.id === product.id);
      if (cartItemsForProduct.length === 0) return product;

      const newVariants = product.variants.map(variant => {
        const cartItem = cartItemsForProduct.find(item => item.variant.id === variant.id);
        if (cartItem) {
          return {
            ...variant,
            stockQuantity: Math.max(0, variant.stockQuantity - cartItem.quantity)
          };
        }
        return variant;
      });

      return { ...product, variants: newVariants };
    });

    setProducts(newProducts);
    clearCart();
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => {
    const price = item.variant.salePrice || item.variant.price;
    return sum + (price * item.quantity);
  }, 0);
  
  const TAX_RATE = 0.08; // Example tax rate
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <PosContext.Provider value={{
      products,
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      processCheckout,
      searchQuery,
      setSearchQuery,
      selectedCategory,
      setSelectedCategory,
      isCheckoutModalOpen,
      setIsCheckoutModalOpen,
      subtotal,
      tax,
      total,
      totalItems,
      lastTransaction,
      customers,
      selectedCustomer,
      addCustomer,
      selectCustomer,
      transactions,
      returnItem,
      refundTransaction
    }}>
      {children}
    </PosContext.Provider>
  );
}

export function usePos() {
  const context = useContext(PosContext);
  if (context === undefined) {
    throw new Error('usePos must be used within a PosProvider');
  }
  return context;
}
