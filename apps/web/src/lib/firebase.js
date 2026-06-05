"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = void 0;
const app_1 = require("firebase/app");
const storage_1 = require("firebase/storage");
// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCLw8_CsNL3AyEg_KBu3XnI7smESOrMESs",
    authDomain: "unitedlinkgroup-a2cb5.firebaseapp.com",
    projectId: "unitedlinkgroup-a2cb5",
    storageBucket: "unitedlinkgroup-a2cb5.firebasestorage.app",
    messagingSenderId: "613627406684",
    appId: "1:613627406684:web:aee7af03857f3e9bdbb999",
    measurementId: "G-QHEJDN8NLR"
};
// Initialize Firebase
const app = (0, app_1.initializeApp)(firebaseConfig);
// Analytics is optional and may fail in some environments (like SSR), so handle carefully if needed.
// For now, we export storage.
exports.storage = (0, storage_1.getStorage)(app);
exports.default = app;
