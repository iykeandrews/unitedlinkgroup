"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = App;
const react_1 = __importDefault(require("react"));
const AuthContext_1 = require("./src/context/AuthContext");
const AppNavigator_1 = __importDefault(require("./src/navigation/AppNavigator"));
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const ErrorBoundary_1 = __importDefault(require("./src/components/ErrorBoundary"));
const LocationRequirement_1 = __importDefault(require("./src/components/LocationRequirement"));
function App() {
    console.log('App render');
    return (<react_native_safe_area_context_1.SafeAreaProvider>
      <AuthContext_1.AuthProvider>
        <ErrorBoundary_1.default>
          <LocationRequirement_1.default>
            <AppNavigator_1.default />
          </LocationRequirement_1.default>
        </ErrorBoundary_1.default>
      </AuthContext_1.AuthProvider>
    </react_native_safe_area_context_1.SafeAreaProvider>);
}
