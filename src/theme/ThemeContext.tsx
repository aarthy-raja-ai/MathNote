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
        primary: '#818CF8', // Indigo 400
        secondary: '#F8FAFC',
    },
    semantic: {
        success: '#10B981',
        soft: '#1E293B',
        background: '#0F172A',
        surface: '#1E293B',
    },
    text: {
        primary: '#F8FAFC',
        secondary: '#94A3B8',
        inverse: '#0F172A',
        muted: '#64748B',
    },
    border: {
        default: '#334155',
    },
    icon: {
        active: '#818CF8',
        inactive: '#64748B',
        activeBackground: 'rgba(129,140,248,0.20)',
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
