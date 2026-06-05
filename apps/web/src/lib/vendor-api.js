"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const vendorApi = axios_1.default.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002',
    headers: {
        'Content-Type': 'application/json',
    },
});
vendorApi.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('vendor_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});
vendorApi.interceptors.response.use((response) => response, (error) => {
    var _a;
    if (((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('vendor_token');
        localStorage.removeItem('vendor_portal_slug');
        if (!window.location.pathname.startsWith('/vendor/login')) {
            window.location.href = '/vendor/login';
        }
    }
    return Promise.reject(error);
});
exports.default = vendorApi;
