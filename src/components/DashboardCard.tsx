import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { tokens } from '../theme';

interface DashboardCardProps {
    title?: string;
    icon?: React.ReactNode;
    rightAction?: React.ReactNode;
    children: React.ReactNode;
    style?: ViewStyle;
    onPress?: () => void;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
    title,
    icon,
    rightAction,
    children,
    style,
    onPress,
}) => {
    const Container = onPress ? Pressable : View;

    return (
        <Container
            style={[styles.card, style]}
            onPress={onPress}
        >
            {(title || icon || rightAction) && (
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        {icon && <View style={styles.iconContainer}>{icon}</View>}
                        {title && <Text style={styles.title}>{title}</Text>}
                    </View>
                    {rightAction && <View style={styles.headerRight}>{rightAction}</View>}
                </View>
            )}
            <View style={styles.content}>
                {children}
            </View>
        </Container>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: tokens.colors.semantic.surface,
        borderRadius: tokens.radius.xl,
        padding: tokens.spacing.md,
        marginBottom: tokens.spacing.md,
        ...tokens.shadow.card,
        borderWidth: 1,
        borderColor: tokens.colors.border.default,
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
        // flex: 1, 
    },
});
