import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { tokens, useTheme } from '../theme';

interface DashboardCardProps {
    title?: string;
    children: ReactNode;
    style?: ViewStyle;
    renderHeaderRight?: () => ReactNode;
    onPress?: () => void;
    gradient?: string[];
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
    title,
    children,
    style,
    renderHeaderRight,
    onPress,
    gradient
}) => {
    const { colors } = useTheme();

    const Container = gradient ? LinearGradient : View;
    const containerProps = gradient ? { colors: gradient, start: { x: 0, y: 0 }, end: { x: 1, y: 1 } } : {};

    return (
        <View style={[styles.cardContainer, style]}>
            <Pressable
                onPress={onPress}
                disabled={!onPress}
                style={({ pressed }) => [
                    styles.pressable,
                    pressed && styles.pressed
                ]}
            >
                {/* @ts-ignore - Dynamic component */}
                <Container {...containerProps} style={[styles.cardContent, gradient && styles.gradientContent]}>
                    {title || renderHeaderRight ? (
                        <View style={styles.header}>
                            {title ? <Text style={[styles.title, { color: gradient ? colors.text.inverse : colors.text.primary }]}>{title}</Text> : <View />}
                            {renderHeaderRight && renderHeaderRight()}
                        </View>
                    ) : null}
                    {children}
                </Container>
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        marginBottom: tokens.spacing.md,
        borderRadius: tokens.radius.xl,
        ...tokens.shadow.card,
        backgroundColor: tokens.colors.semantic.surface, // Elevate container with shadow and surface color
    },
    pressable: {
        borderRadius: tokens.radius.xl,
        overflow: 'hidden', // Ensure gradient/background respects border radius
    },
    pressed: {
        opacity: 0.8,
    },
    cardContent: {
        borderRadius: tokens.radius.xl,
        padding: tokens.spacing.md,
        borderWidth: 1,
        borderColor: tokens.colors.border.default,
    },
    gradientContent: {
        borderWidth: 0,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: tokens.spacing.md,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.spacing.sm,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: tokens.colors.brand.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: tokens.typography.sizes.md,
        fontFamily: tokens.typography.fontFamily.bold,
        color: tokens.colors.text.primary,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    content: {
        // Allow children to control height
    },
});
