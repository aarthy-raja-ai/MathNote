import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TrendingUp, Receipt, Handshake } from 'lucide-react-native';
import { tokens, useTheme } from '../theme';
import { useApp } from '../context';

interface QuickActionProps {
    icon: React.ReactNode;
    label: string;
    onPress: () => void;
    colors: typeof tokens.colors;
}

const QuickActionCard: React.FC<QuickActionProps> = ({ icon, label, onPress, colors }) => {
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
            style={actionStyles.actionPressable}
        >
            <Animated.View style={[
                actionStyles.actionCard,
                {
                    transform: [{ scale: scaleAnim }],
                    backgroundColor: colors.semantic.surface,
                }
            ]}>
                <View style={actionStyles.iconContainer}>
                    {icon}
                </View>
                <Text style={[
                    actionStyles.actionLabel,
                    {
                        color: colors.brand.secondary,
                        fontFamily: tokens.typography.fontFamily.semibold,
                    }
                ]}>{label}</Text>
            </Animated.View>
        </Pressable>
    );
};

const actionStyles = StyleSheet.create({
    actionPressable: {
        flex: 1,
    },
    actionCard: {
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
        textAlign: 'center',
        marginTop: tokens.spacing.xs,
    },
});

export const DashboardScreen: React.FC = () => {
    const { getTodaySales, getTodayCashReceived, getTodayUPIReceived, getTodayExpenses, getBalance, settings, isLoading } = useApp();
    const { colors, isDark } = useTheme();
    const navigation = useNavigation<any>();
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: tokens.motion.duration.slow,
            useNativeDriver: true,
        }).start();
    }, [fadeAnim]);

    // Create dynamic styles based on theme
    const styles = useMemo(() => createStyles(colors), [colors]);

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
    const todayCashReceived = getTodayCashReceived();
    const todayUPIReceived = getTodayUPIReceived();
    const todayExpenses = getTodayExpenses();
    const balance = getBalance();
    const currency = settings.currency;

    const quickActions = [
        {
            icon: <TrendingUp size={28} color={colors.icon.active} strokeWidth={2.5} />,
            label: 'Add Sale',
            screen: 'Sales',
        },
        {
            icon: <Receipt size={28} color={colors.icon.active} strokeWidth={2.5} />,
            label: 'Add Expense',
            screen: 'Expenses',
        },
        {
            icon: <Handshake size={28} color={colors.icon.active} strokeWidth={2.5} />,
            label: 'Add Credit',
            screen: 'Credits',
        },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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

                    {/* Separate Cash and UPI Received Cards */}
                    <View style={styles.receivedRow}>
                        <View style={[styles.receivedCard, styles.cashCard]}>
                            <Text style={styles.cardLabel}>Cash Received</Text>
                            <Text style={styles.cardAmountBlue}>
                                {currency} {todayCashReceived.toLocaleString()}
                            </Text>
                        </View>
                        <View style={[styles.receivedCard, styles.upiCard]}>
                            <Text style={styles.cardLabel}>UPI Received</Text>
                            <Text style={styles.cardAmountPurple}>
                                {currency} {todayUPIReceived.toLocaleString()}
                            </Text>
                        </View>
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
                                colors={colors}
                            />
                        ))}
                    </View>
                </ScrollView>
            </Animated.View>
        </SafeAreaView>
    );
};

// Dynamic styles factory
const createStyles = (colors: typeof tokens.colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.semantic.background,
    },
    content: {
        flex: 1,
        paddingHorizontal: tokens.spacing.md,
    },
    scrollContent: {
        paddingBottom: 100, // Prevent overlap with nav bar
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: tokens.typography.sizes.lg,
        color: colors.text.secondary,
        fontFamily: tokens.typography.fontFamily.medium,
    },
    header: {
        paddingTop: tokens.spacing.lg,
        paddingBottom: tokens.spacing.xl,
    },
    greeting: {
        fontSize: tokens.typography.sizes.md,
        color: colors.text.secondary,
        marginBottom: tokens.spacing.xxs,
        fontFamily: tokens.typography.fontFamily.regular,
    },
    title: {
        fontSize: tokens.typography.sizes.xxl,
        color: colors.brand.secondary,
        fontFamily: tokens.typography.fontFamily.bold,
    },
    tagline: {
        fontSize: tokens.typography.sizes.sm,
        color: colors.text.muted,
        fontStyle: 'italic',
        fontFamily: tokens.typography.fontFamily.regular,
    },
    sectionTitle: {
        fontSize: tokens.typography.sizes.lg,
        color: colors.text.primary,
        marginTop: tokens.spacing.lg,
        marginBottom: tokens.spacing.sm,
        fontFamily: tokens.typography.fontFamily.semibold,
    },
    summaryCard: {
        backgroundColor: colors.semantic.surface,
        borderRadius: tokens.radius.lg,
        padding: tokens.spacing.md,
        marginBottom: 14,
        ...tokens.shadow.card,
    },
    receivedRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 14,
    },
    receivedCard: {
        flex: 1,
        backgroundColor: colors.semantic.surface,
        borderRadius: tokens.radius.lg,
        padding: tokens.spacing.md,
        ...tokens.shadow.card,
    },
    cashCard: {
        borderLeftWidth: 3,
        borderLeftColor: '#2196F3',
    },
    upiCard: {
        borderLeftWidth: 3,
        borderLeftColor: '#9C27B0',
    },
    cardLabel: {
        fontSize: tokens.typography.sizes.sm,
        color: colors.text.secondary,
        marginBottom: tokens.spacing.xxs,
        fontFamily: tokens.typography.fontFamily.regular,
    },
    cardAmountGreen: {
        fontSize: tokens.typography.sizes.xl,
        color: colors.semantic.success,
        fontFamily: tokens.typography.fontFamily.bold,
    },
    cardAmountRed: {
        fontSize: tokens.typography.sizes.xl,
        color: colors.brand.primary,
        fontFamily: tokens.typography.fontFamily.bold,
    },
    cardAmountBlue: {
        fontSize: tokens.typography.sizes.lg,
        color: '#2196F3',
        fontFamily: tokens.typography.fontFamily.bold,
    },
    cardAmountPurple: {
        fontSize: tokens.typography.sizes.lg,
        color: '#9C27B0',
        fontFamily: tokens.typography.fontFamily.bold,
    },
    balanceCard: {
        backgroundColor: colors.brand.secondary,
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
        fontFamily: tokens.typography.fontFamily.regular,
    },
    balanceAmount: {
        fontSize: tokens.typography.sizes.xxl,
        color: colors.text.inverse,
        fontFamily: tokens.typography.fontFamily.bold,
    },
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: tokens.spacing.xl,
        gap: 12,
    },
});

export default DashboardScreen;
