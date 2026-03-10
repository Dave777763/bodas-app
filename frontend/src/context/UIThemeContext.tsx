"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type UITheme = "light" | "dark" | "matrix";

interface UIThemeContextType {
    theme: UITheme;
    setTheme: (theme: UITheme) => void;
}

const UIThemeContext = createContext<UIThemeContextType | undefined>(undefined);

export function UIThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<UITheme>("light");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem("ventoui-theme") as UITheme;
        if (savedTheme) {
            setThemeState(savedTheme);
        }
        setMounted(true);
    }, []);

    const setTheme = (newTheme: UITheme) => {
        setThemeState(newTheme);
        localStorage.setItem("ventoui-theme", newTheme);
    };

    // Evitar flash de contenido incorrecto
    if (!mounted) {
        return <div className="opacity-0">{children}</div>;
    }

    return (
        <UIThemeContext.Provider value={{ theme, setTheme }}>
            <div className={`vento-ui-${theme} transition-colors duration-300 min-h-screen bg-vento-bg`}>
                {children}
            </div>
        </UIThemeContext.Provider>
    );
}

export function useUITheme() {
    const context = useContext(UIThemeContext);
    if (context === undefined) {
        throw new Error("useUITheme must be used within a UIThemeProvider");
    }
    return context;
}
