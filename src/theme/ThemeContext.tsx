import React, { createContext, useContext, useState, ReactNode } from 'react';
import { tokens } from './tokens';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
    mode: ThemeMode;
    toggleTheme: () => void;
    colors: typeof tokens.colors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const [mode, setMode] = useState<ThemeMode>('light');

    const toggleTheme = () => {
        setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
    };

    const colors = mode === 'light'
        ? tokens.colors
        : {
            ...tokens.colors,
            semantic: {
                ...tokens.colors.semantic,
                background: '#1a1a2e',
                surface: '#16213e',
            },
            text: {
                ...tokens.colors.text,
                primary: '#FFFFFF',
                secondary: 'rgba(255,255,255,0.75)',
                muted: 'rgba(255,255,255,0.45)',
            },
        };

    return (
        <ThemeContext.Provider value={{ mode, toggleTheme, colors }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
