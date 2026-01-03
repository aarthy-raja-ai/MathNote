// Design Tokens for Math Note App
import { Platform } from 'react-native';

export const tokens = {
    colors: {
        brand: {
            primary: '#EC0B43',
            secondary: '#58355E',
        },
        semantic: {
            success: '#7AE7C7',
            soft: '#D6FFB7',
            background: '#FFF689',
            surface: '#FFFFFF',
        },
        text: {
            primary: '#58355E',
            secondary: 'rgba(88,53,94,0.75)',
            inverse: '#FFFFFF',
            muted: 'rgba(88,53,94,0.45)',
        },
        border: {
            default: 'rgba(88,53,94,0.2)',
        },
        icon: {
            active: '#EC0B43',
            inactive: 'rgba(88,53,94,0.45)',
            activeBackground: 'rgba(236,11,67,0.12)',
        },
    },

    typography: {
        fontFamily: 'System',
        sizes: {
            xs: 12,
            sm: 14,
            md: 16,
            lg: 20,
            xl: 24,
            xxl: 32,
        },
        weight: {
            regular: '400' as const,
            medium: '500' as const,
            semibold: '600' as const,
            bold: '700' as const,
        },
    },

    spacing: {
        xxs: 4,
        xs: 8,
        sm: 12,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 40,
    },

    radius: {
        sm: 6,
        md: 12,
        lg: 20,
        xl: 22,
        xxl: 24,
        pill: 999,
    },

    shadow: {
        card: Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
            },
            android: {
                elevation: 4,
            },
        }) || {},
        floating: Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.08,
                shadowRadius: 16,
            },
            android: {
                elevation: 10,
            },
        }) || {},
        quickAction: Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.06,
                shadowRadius: 10,
            },
            android: {
                elevation: 3,
            },
        }) || {},
    },

    motion: {
        duration: {
            fast: 120,
            normal: 220,
            slow: 360,
        },
        easing: {
            enter: 'easeOut',
            exit: 'easeIn',
            emphasize: 'spring',
        },
        spring: {
            tension: 80,
            friction: 10,
        },
        scale: {
            pressIn: 0.97,
            pressOut: 1,
        },
        fade: {
            from: 0,
            to: 1,
        },
        slide: {
            yEnter: 12,
            yExit: -12,
        },
    },
};

export type Tokens = typeof tokens;
export default tokens;
