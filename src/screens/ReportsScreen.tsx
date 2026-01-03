import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Animated,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../components';
import { tokens } from '../theme';
import { useApp } from '../context';

type DateRange = 'daily' | 'weekly' | 'monthly' | 'all';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_HEIGHT = 200;

export const ReportsScreen: React.FC = () => {
    const { sales, expenses, settings } = useApp();
    const [range, setRange] = useState<DateRange>('weekly');
    const chartAnim = useRef(new Animated.Value(0)).current;

    const currency = settings.currency;

    useEffect(() => {
        Animated.timing(chartAnim, {
            toValue: 1,
            duration: tokens.motion.duration.slow,
            useNativeDriver: false,
        }).start();
    }, [chartAnim, range]);

    const getDateRange = () => {
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        switch (range) {
            case 'daily':
                return { start: today, end: today };
            case 'weekly':
                const weekAgo = new Date(now);
                weekAgo.setDate(weekAgo.getDate() - 7);
                return { start: weekAgo.toISOString().split('T')[0], end: today };
            case 'monthly':
                const monthAgo = new Date(now);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                return { start: monthAgo.toISOString().split('T')[0], end: today };
            default:
                return { start: '', end: today };
        }
    };

    const filterByRange = <T extends { date: string }>(items: T[]): T[] => {
        const { start, end } = getDateRange();
        if (!start) return items;
        return items.filter((item) => item.date >= start && item.date <= end);
    };

    const filteredSales = filterByRange(sales);
    const filteredExpenses = filterByRange(expenses);

    const totalSales = filteredSales.reduce((sum, s) => sum + s.amount, 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalSales - totalExpenses;
    const profitMargin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : '0';

    // Group expenses by category
    const expensesByCategory = filteredExpenses.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
    }, {} as Record<string, number>);

    const categoryLabels: Record<string, { label: string; icon: string }> = {
        food: { label: 'Food', icon: '🍔' },
        transport: { label: 'Transport', icon: '🚗' },
        shopping: { label: 'Shopping', icon: '🛒' },
        utilities: { label: 'Utilities', icon: '💡' },
        rent: { label: 'Rent', icon: '🏠' },
        salary: { label: 'Salary', icon: '💼' },
        other: { label: 'Other', icon: '📦' },
    };

    const maxExpense = Math.max(...Object.values(expensesByCategory), 1);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Reports</Text>
                    <Text style={styles.subtitle}>Financial Overview</Text>
                </View>

                {/* Range Selector */}
                <View style={styles.rangeSelector}>
                    {(['daily', 'weekly', 'monthly', 'all'] as DateRange[]).map((r) => (
                        <TouchableOpacity
                            key={r}
                            style={[styles.rangeTab, range === r && styles.rangeTabActive]}
                            onPress={() => setRange(r)}
                        >
                            <Text style={[styles.rangeText, range === r && styles.rangeTextActive]}>
                                {r.charAt(0).toUpperCase() + r.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Summary Cards */}
                <View style={styles.summaryRow}>
                    <Card style={styles.salesSummary}>
                        <Text style={styles.summaryLabel}>Total Sales</Text>
                        <Text style={styles.salesAmount}>
                            {currency} {totalSales.toLocaleString()}
                        </Text>
                    </Card>
                    <Card style={styles.expensesSummary}>
                        <Text style={styles.summaryLabel}>Total Expenses</Text>
                        <Text style={styles.expensesAmount}>
                            {currency} {totalExpenses.toLocaleString()}
                        </Text>
                    </Card>
                </View>

                {/* Net Profit Card */}
                <Card style={[styles.profitCard, netProfit >= 0 ? styles.profitPositive : styles.profitNegative]}>
                    <View style={styles.profitRow}>
                        <View>
                            <Text style={styles.profitLabel}>Net Profit</Text>
                            <Text style={styles.profitAmount}>
                                {currency} {Math.abs(netProfit).toLocaleString()}
                                {netProfit < 0 && ' (Loss)'}
                            </Text>
                        </View>
                        <View style={styles.marginBadge}>
                            <Text style={styles.marginText}>{profitMargin}%</Text>
                        </View>
                    </View>
                </Card>

                {/* Expense Breakdown */}
                <Text style={styles.sectionTitle}>Expense Breakdown</Text>
                <Card style={styles.chartCard}>
                    {Object.entries(expensesByCategory).length === 0 ? (
                        <View style={styles.emptyChart}>
                            <Text style={styles.emptyIcon}>📊</Text>
                            <Text style={styles.emptyText}>No expenses in this period</Text>
                        </View>
                    ) : (
                        <View>
                            {Object.entries(expensesByCategory)
                                .sort((a, b) => b[1] - a[1])
                                .map(([category, amount]) => {
                                    const catInfo = categoryLabels[category] || categoryLabels.other;
                                    const percentage = ((amount / maxExpense) * 100);

                                    return (
                                        <Animated.View key={category} style={styles.barRow}>
                                            <View style={styles.barLabel}>
                                                <Text style={styles.barIcon}>{catInfo.icon}</Text>
                                                <Text style={styles.barText}>{catInfo.label}</Text>
                                            </View>
                                            <View style={styles.barContainer}>
                                                <Animated.View
                                                    style={[
                                                        styles.bar,
                                                        {
                                                            width: chartAnim.interpolate({
                                                                inputRange: [0, 1],
                                                                outputRange: ['0%', `${percentage}%`],
                                                            }),
                                                        },
                                                    ]}
                                                />
                                            </View>
                                            <Text style={styles.barAmount}>
                                                {currency}{amount.toLocaleString()}
                                            </Text>
                                        </Animated.View>
                                    );
                                })}
                        </View>
                    )}
                </Card>

                {/* Stats Summary */}
                <Text style={styles.sectionTitle}>Statistics</Text>
                <View style={styles.statsGrid}>
                    <Card style={styles.statCard}>
                        <Text style={styles.statValue}>{filteredSales.length}</Text>
                        <Text style={styles.statLabel}>Total Sales</Text>
                    </Card>
                    <Card style={styles.statCard}>
                        <Text style={styles.statValue}>{filteredExpenses.length}</Text>
                        <Text style={styles.statLabel}>Total Expenses</Text>
                    </Card>
                    <Card style={styles.statCard}>
                        <Text style={styles.statValue}>
                            {filteredSales.length > 0
                                ? `${currency}${(totalSales / filteredSales.length).toFixed(0)}`
                                : '-'}
                        </Text>
                        <Text style={styles.statLabel}>Avg Sale</Text>
                    </Card>
                    <Card style={styles.statCard}>
                        <Text style={styles.statValue}>
                            {filteredExpenses.length > 0
                                ? `${currency}${(totalExpenses / filteredExpenses.length).toFixed(0)}`
                                : '-'}
                        </Text>
                        <Text style={styles.statLabel}>Avg Expense</Text>
                    </Card>
                </View>

                <View style={styles.bottomSpacer} />
            </ScrollView>
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
    header: {
        paddingTop: tokens.spacing.md,
        paddingBottom: tokens.spacing.md,
    },
    title: {
        fontSize: tokens.typography.sizes.xxl,
        fontWeight: tokens.typography.weight.bold,
        color: tokens.colors.brand.secondary,
    },
    subtitle: {
        fontSize: tokens.typography.sizes.sm,
        color: tokens.colors.text.secondary,
    },
    rangeSelector: {
        flexDirection: 'row',
        backgroundColor: tokens.colors.semantic.soft,
        borderRadius: tokens.radius.pill,
        padding: tokens.spacing.xxs,
        marginBottom: tokens.spacing.md,
    },
    rangeTab: {
        flex: 1,
        paddingVertical: tokens.spacing.xs,
        alignItems: 'center',
        borderRadius: tokens.radius.pill,
    },
    rangeTabActive: {
        backgroundColor: tokens.colors.brand.secondary,
    },
    rangeText: {
        fontSize: tokens.typography.sizes.sm,
        color: tokens.colors.text.secondary,
        fontWeight: tokens.typography.weight.medium,
    },
    rangeTextActive: {
        color: tokens.colors.text.inverse,
    },
    summaryRow: {
        flexDirection: 'row',
        gap: tokens.spacing.sm,
        marginBottom: tokens.spacing.sm,
    },
    salesSummary: {
        flex: 1,
        backgroundColor: tokens.colors.semantic.success,
    },
    expensesSummary: {
        flex: 1,
        backgroundColor: tokens.colors.brand.primary,
    },
    summaryLabel: {
        fontSize: tokens.typography.sizes.sm,
        color: tokens.colors.brand.secondary,
        marginBottom: tokens.spacing.xxs,
    },
    salesAmount: {
        fontSize: tokens.typography.sizes.xl,
        fontWeight: tokens.typography.weight.bold,
        color: tokens.colors.brand.secondary,
    },
    expensesAmount: {
        fontSize: tokens.typography.sizes.xl,
        fontWeight: tokens.typography.weight.bold,
        color: tokens.colors.text.inverse,
    },
    profitCard: {
        marginBottom: tokens.spacing.md,
    },
    profitPositive: {
        backgroundColor: tokens.colors.brand.secondary,
    },
    profitNegative: {
        backgroundColor: tokens.colors.brand.primary,
    },
    profitRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    profitLabel: {
        fontSize: tokens.typography.sizes.sm,
        color: tokens.colors.text.inverse,
    },
    profitAmount: {
        fontSize: tokens.typography.sizes.xxl,
        fontWeight: tokens.typography.weight.bold,
        color: tokens.colors.text.inverse,
    },
    marginBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: tokens.spacing.md,
        paddingVertical: tokens.spacing.xs,
        borderRadius: tokens.radius.pill,
    },
    marginText: {
        fontSize: tokens.typography.sizes.lg,
        fontWeight: tokens.typography.weight.bold,
        color: tokens.colors.text.inverse,
    },
    sectionTitle: {
        fontSize: tokens.typography.sizes.lg,
        fontWeight: tokens.typography.weight.semibold,
        color: tokens.colors.text.primary,
        marginBottom: tokens.spacing.sm,
    },
    chartCard: {
        marginBottom: tokens.spacing.md,
        backgroundColor: tokens.colors.semantic.surface,
    },
    emptyChart: {
        alignItems: 'center',
        paddingVertical: tokens.spacing.xl,
    },
    emptyIcon: {
        fontSize: 40,
        marginBottom: tokens.spacing.sm,
    },
    emptyText: {
        fontSize: tokens.typography.sizes.md,
        color: tokens.colors.text.muted,
    },
    barRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: tokens.spacing.sm,
    },
    barLabel: {
        width: 80,
        flexDirection: 'row',
        alignItems: 'center',
    },
    barIcon: {
        fontSize: 16,
        marginRight: tokens.spacing.xxs,
    },
    barText: {
        fontSize: tokens.typography.sizes.xs,
        color: tokens.colors.text.secondary,
    },
    barContainer: {
        flex: 1,
        height: 20,
        backgroundColor: tokens.colors.semantic.soft,
        borderRadius: tokens.radius.sm,
        marginHorizontal: tokens.spacing.xs,
        overflow: 'hidden',
    },
    bar: {
        height: '100%',
        backgroundColor: tokens.colors.brand.primary,
        borderRadius: tokens.radius.sm,
    },
    barAmount: {
        width: 70,
        fontSize: tokens.typography.sizes.xs,
        color: tokens.colors.text.primary,
        textAlign: 'right',
        fontWeight: tokens.typography.weight.medium,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: tokens.spacing.sm,
        marginBottom: tokens.spacing.md,
    },
    statCard: {
        width: (SCREEN_WIDTH - tokens.spacing.md * 2 - tokens.spacing.sm) / 2 - tokens.spacing.sm / 2,
        alignItems: 'center',
        paddingVertical: tokens.spacing.md,
    },
    statValue: {
        fontSize: tokens.typography.sizes.xl,
        fontWeight: tokens.typography.weight.bold,
        color: tokens.colors.brand.secondary,
    },
    statLabel: {
        fontSize: tokens.typography.sizes.xs,
        color: tokens.colors.text.secondary,
        marginTop: tokens.spacing.xxs,
    },
    bottomSpacer: {
        height: tokens.spacing.xl,
    },
});

export default ReportsScreen;
