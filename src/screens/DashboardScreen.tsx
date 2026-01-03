import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TrendingUp, Receipt, Handshake } from 'lucide-react-native';
import { tokens } from '../theme';
import { useApp } from '../context';

interface QuickActionProps {
    icon: React.ReactNode;
    label: string;
    onPress: () => void;
}

const QuickActionCard: React.FC<QuickActionProps> = ({ icon, label, onPress }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: tokens.motion.scale.pressIn,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: tokens.motion.scale.pressOut,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
        }).start();
    };

    return (
        <Pressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={styles.actionPressable}
        >
            <Animated.View style={[styles.actionCard, { transform: [{ scale: scaleAnim }] }]}>
                <View style={styles.iconContainer}>
                    {icon}
                </View>
                <Text style={styles.actionLabel}>{label}</Text>
            </Animated.View>
        </Pressable>
    );
};

export const DashboardScreen: React.FC = () => {
    const { getTodaySales, getTodayExpenses, getBalance, settings, isLoading } = useApp();
    const navigation = useNavigation<any>();
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: tokens.motion.duration.slow,
            useNativeDriver: true,
        }).start();
    }, [fadeAnim]);

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            </SafeAreaView>
        );
    }

    const todaySales = getTodaySales();
    const todayExpenses = getTodayExpenses();
    const balance = getBalance();
    const currency = settings.currency;

    const quickActions = [
        {
            icon: <TrendingUp size={28} color={tokens.colors.icon.active} strokeWidth={2.5} />,
            label: 'Add Sale',
            screen: 'Sales',
        },
        {
            icon: <Receipt size={28} color={tokens.colors.icon.active} strokeWidth={2.5} />,
            label: 'Add Expense',
            screen: 'Expenses',
        },
        {
            icon: <Handshake size={28} color={tokens.colors.icon.active} strokeWidth={2.5} />,
            label: 'Add Credit',
            screen: 'Credits',
        },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.greeting}>Welcome back! 👋</Text>
                        <Text style={styles.title}>Math Note</Text>
                        <Text style={styles.tagline}>Every Number. Clearly Noted.</Text>
                    </View>

                    {/* Summary Cards */}
                    <Text style={styles.sectionTitle}>Today's Summary</Text>

                    <View style={styles.summaryCard}>
                        <Text style={styles.cardLabel}>Today's Sales</Text>
                        <Text style={styles.cardAmountGreen}>
                            {currency} {todaySales.toLocaleString()}
                        </Text>
                    </View>

                    <View style={styles.summaryCard}>
                        <Text style={styles.cardLabel}>Today's Expenses</Text>
                        <Text style={styles.cardAmountRed}>
                            {currency} {todayExpenses.toLocaleString()}
                        </Text>
                    </View>

                    <View style={styles.balanceCard}>
                        <Text style={styles.balanceLabel}>Total Balance</Text>
                        <Text style={styles.balanceAmount}>
                            {currency} {Math.abs(balance).toLocaleString()}
                            {balance < 0 && ' (Deficit)'}
                        </Text>
                    </View>

                    {/* Quick Actions */}
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.quickActions}>
                        {quickActions.map((action, index) => (
                            <QuickActionCard
                                key={index}
                                icon={action.icon}
                                label={action.label}
                                onPress={() => navigation.navigate(action.screen)}
                            />
                        ))}
                    </View>
                </ScrollView>
            </Animated.View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: tokens.colors.semantic.background,
    },
    content: {
        flex: 1,
        paddingHorizontal: tokens.spacing.md,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: tokens.typography.sizes.lg,
        color: tokens.colors.text.secondary,
    },
    header: {
        paddingTop: tokens.spacing.lg,
        paddingBottom: tokens.spacing.xl,
    },
    greeting: {
        fontSize: tokens.typography.sizes.md,
        color: tokens.colors.text.secondary,
        marginBottom: tokens.spacing.xxs,
    },
    title: {
        fontSize: tokens.typography.sizes.xxl,
        fontWeight: tokens.typography.weight.bold,
        color: tokens.colors.brand.secondary,
    },
    tagline: {
        fontSize: tokens.typography.sizes.sm,
        color: tokens.colors.text.muted,
        fontStyle: 'italic',
    },
    sectionTitle: {
        fontSize: tokens.typography.sizes.lg,
        fontWeight: tokens.typography.weight.semibold,
        color: tokens.colors.text.primary,
        marginTop: tokens.spacing.lg,
        marginBottom: tokens.spacing.sm,
    },
    summaryCard: {
        backgroundColor: tokens.colors.semantic.surface,
        borderRadius: tokens.radius.lg,
        padding: tokens.spacing.md,
        marginBottom: 14,
        ...tokens.shadow.card,
    },
    cardLabel: {
        fontSize: tokens.typography.sizes.sm,
        color: tokens.colors.text.secondary,
        marginBottom: tokens.spacing.xxs,
    },
    cardAmountGreen: {
        fontSize: tokens.typography.sizes.xl,
        fontWeight: tokens.typography.weight.bold,
        color: tokens.colors.semantic.success,
    },
    cardAmountRed: {
        fontSize: tokens.typography.sizes.xl,
        fontWeight: tokens.typography.weight.bold,
        color: tokens.colors.brand.primary,
    },
    balanceCard: {
        backgroundColor: tokens.colors.brand.secondary,
        borderRadius: tokens.radius.xl,
        padding: tokens.spacing.md,
        marginBottom: tokens.spacing.md,
        height: 90,
        justifyContent: 'center',
        alignItems: 'center',
        ...tokens.shadow.card,
    },
    balanceLabel: {
        fontSize: tokens.typography.sizes.sm,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: tokens.spacing.xxs,
    },
    balanceAmount: {
        fontSize: tokens.typography.sizes.xxl,
        fontWeight: tokens.typography.weight.bold,
        color: tokens.colors.text.inverse,
    },
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: tokens.spacing.xl,
        gap: 12,
    },
    actionPressable: {
        flex: 1,
    },
    actionCard: {
        backgroundColor: tokens.colors.semantic.surface,
        borderRadius: 18,
        padding: tokens.spacing.md,
        alignItems: 'center',
        minHeight: 100,
        justifyContent: 'center',
        ...tokens.shadow.quickAction,
    },
    iconContainer: {
        marginBottom: tokens.spacing.xs,
    },
    actionLabel: {
        fontSize: tokens.typography.sizes.sm,
        color: tokens.colors.brand.secondary,
        fontWeight: tokens.typography.weight.semibold,
        textAlign: 'center',
        marginTop: tokens.spacing.xs,
    },
});

export default DashboardScreen;
