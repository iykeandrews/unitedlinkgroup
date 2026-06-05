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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessProvider = BusinessProvider;
exports.useBusiness = useBusiness;
const react_1 = __importStar(require("react"));
const api_1 = __importDefault(require("../lib/api"));
const types_1 = require("@unitedlinkgroup/types");
const BusinessContext = (0, react_1.createContext)(undefined);
function BusinessProvider({ children }) {
    const [selectedBusiness, setSelectedBusiness] = (0, react_1.useState)(null);
    const [businesses, setBusinesses] = (0, react_1.useState)([]);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const handleSetSelectedBusiness = (0, react_1.useCallback)((business) => {
        setSelectedBusiness(business);
        if (business) {
            localStorage.setItem('selectedBusiness', JSON.stringify(business));
        }
        else {
            localStorage.removeItem('selectedBusiness');
        }
    }, []);
    const refreshBusinesses = (0, react_1.useCallback)(async () => {
        setIsLoading(true);
        try {
            // Only fetch if super admin - but we don't know role here easily without another call or passing it in.
            // We'll let the component handle the trigger, or check profile here.
            // Actually, let's just try to fetch and handle 403 silently or checking role first.
            const profileRes = await api_1.default.get('/auth/profile');
            if (profileRes.data.role === types_1.UserRole.SUPER_ADMIN) {
                const res = await api_1.default.get('/businesses');
                setBusinesses(res.data);
                const superContext = typeof window !== 'undefined' ? localStorage.getItem('superadminBusinessContext') : null;
                if (!superContext) {
                    handleSetSelectedBusiness(null);
                }
            }
            else {
                const res = await api_1.default.get('/businesses/mine');
                if (res.data) {
                    // If local storage differs or not set, update it
                    // Actually, always update to keep in sync
                    handleSetSelectedBusiness(res.data);
                }
            }
        }
        catch (error) {
            console.error('Failed to fetch businesses', error);
        }
        finally {
            setIsLoading(false);
        }
    }, [handleSetSelectedBusiness]);
    (0, react_1.useEffect)(() => {
        // Load selected business from local storage on mount
        const stored = localStorage.getItem('selectedBusiness');
        if (stored) {
            try {
                setSelectedBusiness(JSON.parse(stored));
            }
            catch (e) {
                localStorage.removeItem('selectedBusiness');
            }
        }
        refreshBusinesses();
    }, [refreshBusinesses]);
    return (<BusinessContext.Provider value={{
            selectedBusiness,
            setSelectedBusiness: handleSetSelectedBusiness,
            businesses,
            isLoading,
            refreshBusinesses,
        }}>
      {children}
    </BusinessContext.Provider>);
}
function useBusiness() {
    const context = (0, react_1.useContext)(BusinessContext);
    if (context === undefined) {
        throw new Error('useBusiness must be used within a BusinessProvider');
    }
    return context;
}
