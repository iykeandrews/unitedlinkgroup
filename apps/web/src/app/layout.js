"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
const react_1 = __importDefault(require("react"));
require("./globals.css");
const theme_provider_1 = require("@/components/theme-provider");
const auth_context_1 = require("@/context/auth-context");
const sonner_1 = require("sonner");
const GlobalAlert_1 = __importDefault(require("@/components/GlobalAlert"));
exports.metadata = {
    title: 'United Link Group',
    description: 'Workforce Management SaaS',
};
function RootLayout({ children, }) {
    return (<html lang="en" suppressHydrationWarning>
      <body>
        <theme_provider_1.ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <auth_context_1.AuthProvider>
            {children}
          </auth_context_1.AuthProvider>
          <sonner_1.Toaster position="top-right" richColors closeButton/>
          <GlobalAlert_1.default />
        </theme_provider_1.ThemeProvider>
      </body>
    </html>);
}
