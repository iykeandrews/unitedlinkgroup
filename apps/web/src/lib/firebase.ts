import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";

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
const app = initializeApp(firebaseConfig);
// Analytics is optional and may fail in some environments (like SSR), so handle carefully if needed.
// For now, we export storage.
export const storage = getStorage(app);
export default app;
