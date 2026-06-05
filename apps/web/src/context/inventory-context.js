"use strict";
'use client';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryProvider = InventoryProvider;
exports.useInventory = useInventory;
const react_1 = __importStar(require("react"));
const mock_fashion_data_1 = require("../lib/mock-fashion-data");
const InventoryContext = (0, react_1.createContext)(undefined);
function InventoryProvider({ children }) {
    const [products, setProducts] = (0, react_1.useState)(() => {
        try {
            if (typeof window === 'undefined')
                return mock_fashion_data_1.MOCK_PRODUCTS;
            const saved = window.localStorage.getItem('inventory_products');
            if (!saved)
                return mock_fashion_data_1.MOCK_PRODUCTS;
            const parsed = JSON.parse(saved);
            return Array.isArray(parsed) ? parsed : mock_fashion_data_1.MOCK_PRODUCTS;
        }
        catch {
            return mock_fashion_data_1.MOCK_PRODUCTS;
        }
    });
    const [stockLogs, setStockLogs] = (0, react_1.useState)(() => {
        try {
            if (typeof window === 'undefined')
                return [];
            const saved = window.localStorage.getItem('inventory_logs');
            if (!saved)
                return [];
            const parsed = JSON.parse(saved);
            return Array.isArray(parsed) ? parsed : [];
        }
        catch {
            return [];
        }
    });
    // Save to local storage on change
    (0, react_1.useEffect)(() => {
        localStorage.setItem('inventory_products', JSON.stringify(products));
    }, [products]);
    (0, react_1.useEffect)(() => {
        localStorage.setItem('inventory_logs', JSON.stringify(stockLogs));
    }, [stockLogs]);
    const updateStock = (productId, variantId, newQuantity, reason, note) => {
        setProducts(prevProducts => {
            return prevProducts.map(product => {
                if (product.id !== productId)
                    return product;
                const updatedVariants = product.variants.map(variant => {
                    if (variant.id !== variantId)
                        return variant;
                    // Log the change
                    const changeAmount = newQuantity - variant.stockQuantity;
                    const newLog = {
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
                        stockStatus: (newQuantity <= 0 ? 'Out of Stock' : (newQuantity < 10 ? 'Low Stock' : 'In Stock'))
                    };
                });
                return { ...product, variants: updatedVariants };
            });
        });
    };
    const bulkUpdateStock = (updates, reason, note) => {
        // Similar implementation but batching
        // For now, simpler to just loop, but for state updates better to do in one go
        setProducts(prevProducts => {
            let newProducts = [...prevProducts];
            const newLogs = [];
            updates.forEach(update => {
                const productIndex = newProducts.findIndex(p => p.id === update.productId);
                if (productIndex === -1)
                    return;
                const product = newProducts[productIndex];
                const variantIndex = product.variants.findIndex(v => v.id === update.variantId);
                if (variantIndex === -1)
                    return;
                const variant = product.variants[variantIndex];
                const changeAmount = update.newQuantity - variant.stockQuantity;
                if (changeAmount === 0)
                    return;
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
                    stockStatus: update.newQuantity <= 0 ? 'Out of Stock' : (update.newQuantity < 10 ? 'Low Stock' : 'In Stock')
                };
                const updatedVariants = [...product.variants];
                updatedVariants[variantIndex] = updatedVariant;
                newProducts[productIndex] = { ...product, variants: updatedVariants };
            });
            setStockLogs(prev => [...newLogs, ...prev]);
            return newProducts;
        });
    };
    const addProduct = (product) => {
        setProducts(prev => [product, ...prev]);
    };
    const updateProduct = (product) => {
        setProducts(prev => prev.map(p => p.id === product.id ? product : p));
    };
    return (<InventoryContext.Provider value={{
            products,
            stockLogs,
            updateStock,
            bulkUpdateStock,
            addProduct,
            updateProduct
        }}>
      {children}
    </InventoryContext.Provider>);
}
function useInventory() {
    const context = (0, react_1.useContext)(InventoryContext);
    if (context === undefined) {
        throw new Error('useInventory must be used within an InventoryProvider');
    }
    return context;
}
