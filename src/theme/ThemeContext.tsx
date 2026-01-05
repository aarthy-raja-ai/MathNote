import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokens } from './tokens';

const THEME_STORAGE_KEY = '@mathnote_theme';

type ThemeMode = 'light' | 'dark';

// Light theme colors (directly from tokens)
const lightColors = tokens.colors;

// Dark mode color overrides
const darkColors = {
    brand: {
        primary: '#EC0B43',
        secondary: '#E8E8E8',
    },
    semantic: {
        success: '#81B29A',
        soft: '#2D3748',
        background: '#1A1A2E',
        surface: '#16213E',
    },
    text: {
        primary: '#FFFFFF',
        secondary: 'rgba(255,255,255,0.75)',
        inverse: '#1A1A2E',
        muted: 'rgba(255,255,255,0.50)',
    },
    border: {
        default: 'rgba(255,255,255,0.15)',
    },
    icon: {
        active: '#EC0B43',
        inactive: 'rgba(255,255,255,0.50)',
        activeBackground: 'rgba(236,11,67,0.20)',
    },
};

interface ThemeContextType {
    mode: ThemeMode;
    toggleTheme: () => void;
    colors: typeof tokens.colors;
    isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const [mode, setMode] = useState<ThemeMode>('light');
    const [isLoaded, setIsLoaded] = useState(false);

    // Load saved theme on mount
    useEffect(() => {
        const loadTheme = async () => {
            try {
                const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
                if (savedTheme === 'dark' || savedTheme === 'light') {
                    setMode(savedTheme);
                }
            } catch (error) {
                console.error('Failed to load theme:', error);
            } finally {
                setIsLoaded(true);
            }
        };
        loadTheme();
    }, []);

    const toggleTheme = async () => {
        const newMode = mode === 'light' ? 'dark' : 'light';
        setMode(newMode);
        try {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
        } catch (error) {
            console.error('Failed to save theme:', error);
        }
    };

    const value = useMemo(() => ({
        mode,
        toggleTheme,
        colors: mode === 'light' ? lightColors : darkColors,
        isDark: mode === 'dark',
    }), [mode]);

    // Don't render until theme is loaded to prevent flash
    if (!isLoaded) {
        return null;
    }

    return (
        <ThemeContext.Provider value={value}>
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
