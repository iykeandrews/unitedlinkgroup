import { TextStyle } from "react-native";
export declare const Theme: {
    colors: {
        background: string;
        surface: string;
        surfaceHighlight: string;
        primary: string;
        secondary: string;
        accent: string;
        text: string;
        textSecondary: string;
        success: string;
        warning: string;
        error: string;
        border: string;
    };
    spacing: {
        xs: number;
        s: number;
        m: number;
        l: number;
        xl: number;
    };
    borderRadius: {
        s: number;
        m: number;
        l: number;
        xl: number;
    };
    typography: {
        h1: {
            fontSize: number;
            fontWeight: TextStyle["fontWeight"];
            color: string;
        };
        h2: {
            fontSize: number;
            fontWeight: TextStyle["fontWeight"];
            color: string;
        };
        h3: {
            fontSize: number;
            fontWeight: TextStyle["fontWeight"];
            color: string;
        };
        h4: {
            fontSize: number;
            fontWeight: TextStyle["fontWeight"];
            color: string;
        };
        body: {
            fontSize: number;
            color: string;
        };
        caption: {
            fontSize: number;
            color: string;
        };
        button: {
            fontSize: number;
            fontWeight: TextStyle["fontWeight"];
            color: string;
        };
    };
    shadows: {
        glow: {
            shadowColor: string;
            shadowOffset: {
                width: number;
                height: number;
            };
            shadowOpacity: number;
            shadowRadius: number;
            elevation: number;
        };
        card: {
            shadowColor: string;
            shadowOffset: {
                width: number;
                height: number;
            };
            shadowOpacity: number;
            shadowRadius: number;
            elevation: number;
        };
    };
};
