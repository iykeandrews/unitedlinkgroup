"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const Theme_1 = require("../constants/Theme");
class ErrorBoundary extends react_1.default.Component {
    constructor() {
        super(...arguments);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, message: String((error === null || error === void 0 ? void 0 : error.message) || error) };
    }
    componentDidCatch(error) {
        console.error('Root error boundary', error);
    }
    render() {
        if (this.state.hasError) {
            return (<react_native_1.View style={styles.container}>
          <react_native_1.Text style={styles.title}>An error occurred</react_native_1.Text>
          <react_native_1.Text style={styles.subtitle}>{this.state.message || 'Unknown error'}</react_native_1.Text>
        </react_native_1.View>);
        }
        return this.props.children;
    }
}
exports.default = ErrorBoundary;
const styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: Theme_1.Theme.colors.background,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
        color: Theme_1.Theme.colors.text,
    },
    subtitle: {
        fontSize: 14,
        color: Theme_1.Theme.colors.textSecondary,
        textAlign: 'center',
    },
});
