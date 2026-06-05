"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.navigationRef = void 0;
exports.navigate = navigate;
const native_1 = require("@react-navigation/native");
exports.navigationRef = (0, native_1.createNavigationContainerRef)();
function navigate(name, params) {
    if (exports.navigationRef.isReady()) {
        exports.navigationRef.navigate(name, params);
    }
}
