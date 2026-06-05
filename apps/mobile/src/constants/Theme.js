"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Theme = void 0;
exports.Theme = {
    colors: {
        background: '#0F172A', // Dark Slate
        surface: '#1E293B', // Slightly lighter slate
        surfaceHighlight: '#334155',
        primary: '#38BDF8', // Cyan/Sky Blue
        secondary: '#818CF8', // Indigo/Purple
        accent: '#F472B6', // Pink
        text: '#F8FAFC',
        textSecondary: '#94A3B8',
        success: '#4ADE80',
        warning: '#FBBF24',
        error: '#F87171',
        border: 'rgba(148, 163, 184, 0.2)',
    },
    spacing: {
        xs: 4,
        s: 8,
        m: 16,
        l: 24,
        xl: 32,
    },
    borderRadius: {
        s: 8,
        m: 16,
        l: 24,
        xl: 32,
    },
    typography: {
        h1: { fontSize: 32, fontWeight: '700', color: '#F8FAFC' },
        h2: { fontSize: 24, fontWeight: '700', color: '#F8FAFC' },
        h3: { fontSize: 20, fontWeight: '600', color: '#F8FAFC' },
        h4: { fontSize: 18, fontWeight: '600', color: '#F8FAFC' },
        body: { fontSize: 16, color: '#94A3B8' },
        caption: { fontSize: 12, color: '#64748B' },
        button: { fontSize: 16, fontWeight: '700', color: '#F8FAFC' },
    },
    shadows: {
        glow: {
            shadowColor: '#38BDF8',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 10,
            elevation: 5,
        },
        card: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
        }
    }
};
