'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, ProductVariant, StockLog, StockAdjustmentReason } from '../types/fashion';
import { MOCK_PRODUCTS } from '../lib/mock-fashion-data';

interface InventoryContextType {
  products: Product[];
  stockLogs: StockLog[];
  updateStock: (productId: string, variantId: string, newQuantity: number, reason: StockAdjustmentReason, note?: string) => void;
  bulkUpdateStock: (updates: { productId: string, variantId: string, newQuantity: number }[], reason: StockAdjustmentReason, note?: string) => void;
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      if (typeof window === 'undefined') return MOCK_PRODUCTS;
      const saved = window.localStorage.getItem('inventory_products');
      if (!saved) return MOCK_PRODUCTS;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : MOCK_PRODUCTS;
    } catch {
      return MOCK_PRODUCTS;
    }
  });
  const [stockLogs, setStockLogs] = useState<StockLog[]>(() => {
    try {
      if (typeof window === 'undefined') return [];
      const saved = window.localStorage.getItem('inventory_logs');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('inventory_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('inventory_logs', JSON.stringify(stockLogs));
  }, [stockLogs]);

  const updateStock = (productId: string, variantId: string, newQuantity: number, reason: StockAdjustmentReason, note?: string) => {
    setProducts(prevProducts => {
      return prevProducts.map(product => {
        if (product.id !== productId) return product;

        const updatedVariants = product.variants.map(variant => {
          if (variant.id !== variantId) return variant;

          // Log the change
          const changeAmount = newQuantity - variant.stockQuantity;
          const newLog: StockLog = {
            id: Math.random().toString(36).substr(2, 9),
            productId,
            variantId,
            previousQuantity: variant.stockQuantity,
            newQuantity,
            changeAmount,
            reason,
            note,
            userId: 'u1', // Mock user
            userName: 'Admin User',
            timestamp: new Date(),
          };
          setStockLogs(prev => [newLog, ...prev]);

          return {
            ...variant,
            stockQuantity: newQuantity,
            stockStatus: (newQuantity <= 0 ? 'Out of Stock' : (newQuantity < 10 ? 'Low Stock' : 'In Stock')) as any
          };
        });

        return { ...product, variants: updatedVariants };
      });
    });
  };

  const bulkUpdateStock = (updates: { productId: string, variantId: string, newQuantity: number }[], reason: StockAdjustmentReason, note?: string) => {
    // Similar implementation but batching
    // For now, simpler to just loop, but for state updates better to do in one go
    setProducts(prevProducts => {
        let newProducts = [...prevProducts];
        const newLogs: StockLog[] = [];

        updates.forEach(update => {
            const productIndex = newProducts.findIndex(p => p.id === update.productId);
            if (productIndex === -1) return;

            const product = newProducts[productIndex];
            const variantIndex = product.variants.findIndex(v => v.id === update.variantId);
            if (variantIndex === -1) return;

            const variant = product.variants[variantIndex];
            const changeAmount = update.newQuantity - variant.stockQuantity;
            
            if (changeAmount === 0) return;

            newLogs.push({
                id: Math.random().toString(36).substr(2, 9),
                productId: update.productId,
                variantId: update.variantId,
                previousQuantity: variant.stockQuantity,
                newQuantity: update.newQuantity,
                changeAmount,
                reason,
                note,
                userId: 'u1',
                userName: 'Admin User',
                timestamp: new Date(),
            });

            const updatedVariant = {
                ...variant,
                stockQuantity: update.newQuantity,
                stockStatus: update.newQuantity <= 0 ? 'Out of Stock' : (update.newQuantity < 10 ? 'Low Stock' : 'In Stock') as any
            };

            const updatedVariants = [...product.variants];
            updatedVariants[variantIndex] = updatedVariant;

            newProducts[productIndex] = { ...product, variants: updatedVariants };
        });

        setStockLogs(prev => [...newLogs, ...prev]);
        return newProducts;
    });
  };

  const addProduct = (product: Product) => {
    setProducts(prev => [product, ...prev]);
  };

  const updateProduct = (product: Product) => {
    setProducts(prev => prev.map(p => p.id === product.id ? product : p));
  };

  return (
    <InventoryContext.Provider value={{
      products,
      stockLogs,
      updateStock,
      bulkUpdateStock,
      addProduct,
      updateProduct
    }}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
}
