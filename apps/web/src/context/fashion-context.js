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
exports.FashionProvider = FashionProvider;
exports.useFashion = useFashion;
const react_1 = __importStar(require("react"));
const FashionContext = (0, react_1.createContext)(undefined);
function FashionProvider({ children }) {
    const [cart, setCart] = (0, react_1.useState)(() => {
        try {
            if (typeof window === 'undefined')
                return [];
            const saved = window.localStorage.getItem('fashion_cart');
            if (!saved)
                return [];
            const parsed = JSON.parse(saved);
            return Array.isArray(parsed) ? parsed : [];
        }
        catch {
            return [];
        }
    });
    const [wishlist, setWishlist] = (0, react_1.useState)(() => {
        try {
            if (typeof window === 'undefined')
                return [];
            const saved = window.localStorage.getItem('fashion_wishlist');
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
        localStorage.setItem('fashion_cart', JSON.stringify(cart));
    }, [cart]);
    (0, react_1.useEffect)(() => {
        localStorage.setItem('fashion_wishlist', JSON.stringify(wishlist));
    }, [wishlist]);
    const addToCart = (product, variant, quantity = 1) => {
        const cartItemId = variant ? `${product.id}-${variant.id}` : product.id;
        setCart(prev => {
            const existing = prev.find(item => item.id === cartItemId);
            if (existing) {
                return prev.map(item => item.id === cartItemId
                    ? { ...item, quantity: item.quantity + quantity }
                    : item);
            }
            return [...prev, { id: cartItemId, product, variant, quantity }];
        });
    };
    const removeFromCart = (cartItemId) => {
        setCart(prev => prev.filter(item => item.id !== cartItemId));
    };
    const updateCartQuantity = (cartItemId, quantity) => {
        if (quantity <= 0) {
            removeFromCart(cartItemId);
            return;
        }
        setCart(prev => prev.map(item => item.id === cartItemId ? { ...item, quantity } : item));
    };
    const clearCart = () => setCart([]);
    const toggleWishlist = (productId) => {
        setWishlist(prev => prev.includes(productId)
            ? prev.filter(id => id !== productId)
            : [...prev, productId]);
    };
    const isInWishlist = (productId) => wishlist.includes(productId);
    const cartTotal = cart.reduce((total, item) => {
        var _a, _b;
        const price = ((_a = item.variant) === null || _a === void 0 ? void 0 : _a.salePrice) || ((_b = item.variant) === null || _b === void 0 ? void 0 : _b.price) || item.product.basePrice;
        return total + (price * item.quantity);
    }, 0);
    const cartCount = cart.reduce((count, item) => count + item.quantity, 0);
    return (<FashionContext.Provider value={{
            cart,
            wishlist,
            addToCart,
            removeFromCart,
            updateCartQuantity,
            clearCart,
            toggleWishlist,
            isInWishlist,
            cartTotal,
            cartCount
        }}>
      {children}
    </FashionContext.Provider>);
}
function useFashion() {
    const context = (0, react_1.useContext)(FashionContext);
    if (context === undefined) {
        throw new Error('useFashion must be used within a FashionProvider');
    }
    return context;
}
