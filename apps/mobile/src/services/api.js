"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const react_native_1 = require("react-native");
const expo_constants_1 = __importDefault(require("expo-constants"));
const hostCandidate = ((expo_constants_1.default === null || expo_constants_1.default === void 0 ? void 0 : expo_constants_1.default.debuggerHost) || ((_a = expo_constants_1.default === null || expo_constants_1.default === void 0 ? void 0 : expo_constants_1.default.expoConfig) === null || _a === void 0 ? void 0 : _a.hostUri) || '').split(':')[0];
const envUrl = process.env.EXPO_PUBLIC_API_URL;
const iosDevUrl = hostCandidate ? `http://${hostCandidate}:3002` : 'http://localhost:3002';
const BASE_URL = envUrl ||
    (react_native_1.Platform.OS === 'android' ? 'http://10.0.2.2:3002' : iosDevUrl);
const api = axios_1.default.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});
console.log('API base URL', BASE_URL);
api.interceptors.request.use(async (config) => {
    const [token, storedUser, storedBusinessId] = await Promise.all([
        async_storage_1.default.getItem('token'),
        async_storage_1.default.getItem('user'),
        async_storage_1.default.getItem('businessId'),
    ]);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    let businessId = String(storedBusinessId || '').trim();
    if (!businessId && storedUser) {
        try {
            const parsedUser = JSON.parse(storedUser);
            businessId = String((parsedUser === null || parsedUser === void 0 ? void 0 : parsedUser.businessId) || '').trim();
        }
        catch {
        }
    }
    if (businessId) {
        config.headers['x-business-id'] = businessId;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});
api.interceptors.response.use((response) => response, async (error) => {
    var _a;
    if (((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.status) === 401) {
        try {
            await async_storage_1.default.removeItem('token');
        }
        catch { }
    }
    return Promise.reject(error);
});
exports.default = api;
