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
exports.PosProvider = PosProvider;
exports.usePos = usePos;
const react_1 = __importStar(require("react"));
const mock_fashion_data_1 = require("../lib/mock-fashion-data");
const mock_pos_data_1 = require("../lib/mock-pos-data");
const PosContext = (0, react_1.createContext)(undefined);
function PosProvider({ children }) {
    // Initialize products from mock data
    const [products, setProducts] = (0, react_1.useState)(mock_fashion_data_1.MOCK_PRODUCTS);
    const [cart, setCart] = (0, react_1.useState)(() => {
        try {
            if (typeof window === 'undefined')
                return [];
            const saved = window.localStorage.getItem('pos_cart');
            if (!saved)
                return [];
            const parsed = JSON.parse(saved);
            return Array.isArray(parsed) ? parsed : [];
        }
        catch {
            return [];
        }
    });
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [selectedCategory, setSelectedCategory] = (0, react_1.useState)(null);
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = (0, react_1.useState)(false);
    const [lastTransaction, setLastTransaction] = (0, react_1.useState)(null);
    // Customer & Transaction State
    const [customers, setCustomers] = (0, react_1.useState)(mock_pos_data_1.MOCK_CUSTOMERS);
    const [selectedCustomer, setSelectedCustomer] = (0, react_1.useState)(null);
    const [transactions, setTransactions] = (0, react_1.useState)(mock_pos_data_1.MOCK_TRANSACTIONS);
    // Save cart to local storage on change
    (0, react_1.useEffect)(() => {
        localStorage.setItem('pos_cart', JSON.stringify(cart));
    }, [cart]);
    const addToCart = (product, variant) => {
        setCart(prev => {
            const existingItem = prev.find(item => item.variant.id === variant.id);
            if (existingItem) {
                // Check stock limit
                if (existingItem.quantity >= variant.stockQuantity) {
                    alert('Cannot add more than available stock');
                    return prev;
                }
                return prev.map(item => item.variant.id === variant.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item);
            }
            return [...prev, { product, variant, quantity: 1 }];
        });
    };
    const removeFromCart = (variantId) => {
        setCart(prev => prev.filter(item => item.variant.id !== variantId));
    };
    const updateQuantity = (variantId, quantity) => {
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
        setCart(prev => prev.map(item => item.variant.id === variantId
            ? { ...item, quantity }
            : item));
    };
    const clearCart = () => {
        setCart([]);
        setSelectedCustomer(null);
    };
    const addCustomer = (customerData) => {
        const newCustomer = {
            ...customerData,
            id: `c${Date.now()}`,
            totalSpent: 0,
            createdAt: new Date(),
        };
        setCustomers(prev => [...prev, newCustomer]);
        setSelectedCustomer(newCustomer);
    };
    const selectCustomer = (customer) => {
        setSelectedCustomer(customer);
    };
    const returnItem = (transactionId, variantId, reason) => {
        setTransactions(prev => prev.map(tx => {
            if (tx.id !== transactionId)
                return tx;
            const updatedItems = tx.items.map(item => item.variantId === variantId
                ? { ...item, returned: true, returnReason: reason }
                : item);
            const allReturned = updatedItems.every(item => item.returned);
            const anyReturned = updatedItems.some(item => item.returned);
            const newStatus = allReturned ? 'Refunded' : (anyReturned ? 'Partially Refunded' : tx.status);
            return {
                ...tx,
                items: updatedItems,
                status: newStatus
            };
        }));
    };
    const refundTransaction = (transactionId, reason = 'Full Transaction Refund') => {
        setTransactions(prev => prev.map(tx => {
            if (tx.id !== transactionId)
                return tx;
            return {
                ...tx,
                status: 'Refunded',
                items: tx.items.map(item => ({ ...item, returned: true, returnReason: reason }))
            };
        }));
    };
    const processCheckout = (paymentMethod = 'Card') => {
        // Capture transaction details
        const currentSubtotal = cart.reduce((sum, item) => {
            const price = item.variant.salePrice || item.variant.price;
            return sum + (price * item.quantity);
        }, 0);
        const currentTax = currentSubtotal * 0.08;
        const currentTotal = currentSubtotal + currentTax;
        const newTransaction = {
            id: `TX-${Date.now()}`,
            date: new Date(),
            cashierName: 'Current User', // Placeholder
            customerId: selectedCustomer === null || selectedCustomer === void 0 ? void 0 : selectedCustomer.id,
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
            setCustomers(prev => prev.map(c => c.id === selectedCustomer.id
                ? { ...c, totalSpent: c.totalSpent + currentTotal }
                : c));
        }
        // Decrement stock
        const newProducts = products.map(product => {
            const cartItemsForProduct = cart.filter(item => item.product.id === product.id);
            if (cartItemsForProduct.length === 0)
                return product;
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
    return (<PosContext.Provider value={{
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
    </PosContext.Provider>);
}
function usePos() {
    const context = (0, react_1.useContext)(PosContext);
    if (context === undefined) {
        throw new Error('usePos must be used within a PosProvider');
    }
    return context;
}
