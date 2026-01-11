import React, { useState, useRef, useEffect, useMemo } from 'react';
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
import { PieChart, LineChart } from 'react-native-chart-kit';
import { FileText } from 'lucide-react-native';
import { Card } from '../components';
import { tokens, useTheme } from '../theme';
import { useApp } from '../context';
import pdfService from '../utils/pdfService';

type DateRange = 'daily' | 'weekly' | 'monthly' | 'all';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ReportsScreen: React.FC = () => {
    const { sales, expenses, credits, settings } = useApp();
    const { colors } = useTheme();
    const [range, setRange] = useState<DateRange>('weekly');
    const [isExporting, setIsExporting] = useState(false);
    const chartAnim = useRef(new Animated.Value(0)).current;
    const currency = settings.currency;
    const styles = useMemo(() => createStyles(colors), [colors]);

    useEffect(() => {
        chartAnim.setValue(0);
        Animated.timing(chartAnim, { toValue: 1, duration: tokens.motion.duration.slow, useNativeDriver: false }).start();
    }, [chartAnim, range]);

    const getDateRange = () => {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        switch (range) {
            case 'daily': return { start: today, end: today };
            case 'weekly':
                const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
                return { start: weekAgo.toISOString().split('T')[0], end: today };
            case 'monthly':
                const monthAgo = new Date(now); monthAgo.setMonth(monthAgo.getMonth() - 1);
                return { start: monthAgo.toISOString().split('T')[0], end: today };
            default: return { start: '', end: today };
        }
    };

    const filterByRange = <T extends { date: string }>(items: T[]): T[] => {
        const { start, end } = getDateRange();
        if (!start) return items;
        return items.filter((item) => item.date >= start && item.date <= end);
    };

    // Helper to safely get sale amount (handles legacy data)
    const getSaleAmount = (sale: any): number => {
        // Handle new format (totalAmount) and legacy format (amount)
        const amount = sale.paidAmount ?? sale.totalAmount ?? sale.amount ?? 0;
        return isNaN(amount) ? 0 : amount;
    };

    const filteredSales = filterByRange(sales);
    const filteredExpenses = filterByRange(expenses);
    const filteredCredits = filterByRange(credits);

    const totalSales = filteredSales.reduce((sum, s) => sum + getSaleAmount(s), 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Credit payments received (from given credits - money coming in)
    const creditReceived = filteredCredits
        .filter((c) => c.type === 'given')
        .reduce((sum, c) => sum + (c.paidAmount || 0), 0);

    // Credit payments made (for taken credits - money going out)
    const creditPaid = filteredCredits
        .filter((c) => c.type === 'taken')
        .reduce((sum, c) => sum + (c.paidAmount || 0), 0);

    // Total income = sales + credit received
    const totalIncome = totalSales + creditReceived;
    // Total outflow = expenses + credit paid
    const totalOutflow = totalExpenses + creditPaid;

    const netProfit = totalIncome - totalOutflow;
    const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0';

    const expensesByCategory = filteredExpenses.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + (e.amount || 0);
        return acc;
    }, {} as Record<string, number>);

    const categoryLabels: Record<string, { label: string; icon: string; color: string }> = {
        food: { label: 'Food', icon: '🍔', color: '#FF6384' },
        transport: { label: 'Transport', icon: '🚗', color: '#36A2EB' },
        shopping: { label: 'Shopping', icon: '🛒', color: '#FFCE56' },
        utilities: { label: 'Utilities', icon: '💡', color: '#4BC0C0' },
        rent: { label: 'Rent', icon: '🏠', color: '#9966FF' },
        salary: { label: 'Salary', icon: '💼', color: '#FF9F40' },
        other: { label: 'Other', icon: '📦', color: '#C9CBCF' },
    };

    const maxExpense = Math.max(...Object.values(expensesByCategory), 1);

    // Prepare pie chart data
    const pieChartData = Object.entries(expensesByCategory).map(([category, amount]) => {
        const catInfo = categoryLabels[category] || categoryLabels.other;
        return {
            name: catInfo.label,
            amount: amount,
            color: catInfo.color,
            legendFontColor: colors.text.primary,
            legendFontSize: 12,
        };
    });

    // Prepare sales trend data (last 7 days)
    const getLast7DaysSales = () => {
        const labels: string[] = [];
        const data: number[] = [];
        const now = new Date();

        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayLabel = date.toLocaleDateString('en-IN', { weekday: 'short' });
            labels.push(dayLabel);

            const daySales = sales
                .filter(s => s.date === dateStr)
                .reduce((sum, s) => sum + getSaleAmount(s), 0);
            data.push(daySales);
        }
        return { labels, data };
    };

    const salesTrendData = getLast7DaysSales();

    const chartConfig = {
        backgroundGradientFrom: colors.semantic.surface,
        backgroundGradientTo: colors.semantic.surface,
        color: (opacity = 1) => `rgba(129, 178, 154, ${opacity})`,
        strokeWidth: 2,
        barPercentage: 0.5,
        useShadowColorFromDataset: false,
        decimalPlaces: 0,
        labelColor: () => colors.text.secondary,
        propsForBackgroundLines: { strokeDasharray: '', stroke: colors.border.default },
    };

    const handleExportPDF = async () => {
        setIsExporting(true);
        try {
            const { start, end } = getDateRange();
            await pdfService.shareReport({
                sales: filteredSales,
                expenses: filteredExpenses,
                credits: credits.filter(c => !start || (c.date >= start && c.date <= end)),
                startDate: start || 'All Time',
                endDate: end,
                currency,
            });
        } catch (error) {
            console.error('PDF Export Error:', error);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.title}>Reports</Text>
                        <Text style={styles.subtitle}>Financial Overview</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.exportBtn, isExporting && styles.exportBtnDisabled]}
                        onPress={handleExportPDF}
                        disabled={isExporting}
                    >
                        <FileText size={18} color={colors.text.inverse} strokeWidth={2} />
                        <Text style={styles.exportBtnText}>{isExporting ? 'Exporting...' : 'Export PDF'}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.rangeSelector}>
                    {(['daily', 'weekly', 'monthly', 'all'] as DateRange[]).map((r) => (
                        <TouchableOpacity key={r} style={[styles.rangeTab, range === r && styles.rangeTabActive]} onPress={() => setRange(r)}>
                            <Text style={[styles.rangeText, range === r && styles.rangeTextActive]}>{r.charAt(0).toUpperCase() + r.slice(1)}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.summaryRow}>
                    <Card style={styles.salesSummary}>
                        <Text style={styles.summaryLabel}>Total Sales</Text>
                        <Text style={styles.salesAmount}>{currency} {totalSales.toLocaleString()}</Text>
                    </Card>
                    <Card style={styles.expensesSummary}>
                        <Text style={styles.summaryLabelLight}>Total Expenses</Text>
                        <Text style={styles.expensesAmount}>{currency} {totalExpenses.toLocaleString()}</Text>
                    </Card>
                </View>

                {(creditReceived > 0 || creditPaid > 0) && (
                    <View style={styles.summaryRow}>
                        <Card style={styles.creditReceivedCard}>
                            <Text style={styles.summaryLabel}>Credit Received</Text>
                            <Text style={styles.creditReceivedAmount}>{currency} {creditReceived.toLocaleString()}</Text>
                        </Card>
                        <Card style={styles.creditPaidCard}>
                            <Text style={styles.summaryLabelLight}>Credit Paid</Text>
                            <Text style={styles.creditPaidAmount}>{currency} {creditPaid.toLocaleString()}</Text>
                        </Card>
                    </View>
                )}

                <Card style={[styles.profitCard, netProfit >= 0 ? styles.profitPositive : styles.profitNegative]}>
                    <View style={styles.profitRow}>
                        <View>
                            <Text style={styles.profitLabel}>Net Profit</Text>
                            <Text style={styles.profitAmount}>{currency} {Math.abs(netProfit).toLocaleString()}{netProfit < 0 && ' (Loss)'}</Text>
                        </View>
                        <View style={styles.marginBadge}>
                            <Text style={styles.marginText}>{profitMargin}%</Text>
                        </View>
                    </View>
                </Card>

                <Text style={styles.sectionTitle}>Expense Breakdown</Text>
                {pieChartData.length > 0 ? (
                    <Card style={styles.chartCard}>
                        <PieChart
                            data={pieChartData}
                            width={SCREEN_WIDTH - tokens.spacing.md * 2 - 32}
                            height={180}
                            chartConfig={chartConfig}
                            accessor="amount"
                            backgroundColor="transparent"
                            paddingLeft="15"
                            absolute
                        />
                    </Card>
                ) : (
                    <Card style={styles.chartCard}>
                        <View style={styles.emptyChart}>
                            <Text style={styles.emptyIcon}>📊</Text>
                            <Text style={styles.emptyText}>No expenses in this period</Text>
                        </View>
                    </Card>
                )}

                <Text style={styles.sectionTitle}>Sales Trend (Last 7 Days)</Text>
                <Card style={styles.chartCard}>
                    {salesTrendData.data.some(d => d > 0) ? (
                        <LineChart
                            data={{
                                labels: salesTrendData.labels,
                                datasets: [{ data: salesTrendData.data.map(d => d || 0) }],
                            }}
                            width={SCREEN_WIDTH - tokens.spacing.md * 2 - 32}
                            height={200}
                            chartConfig={chartConfig}
                            bezier
                            style={{ marginVertical: 8, borderRadius: 16 }}
                            fromZero
                        />
                    ) : (
                        <View style={styles.emptyChart}>
                            <Text style={styles.emptyIcon}>📈</Text>
                            <Text style={styles.emptyText}>No sales data yet</Text>
                        </View>
                    )}
                </Card>

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
                        <Text style={styles.statValue}>{filteredSales.length > 0 ? `${currency}${Math.round(totalSales / filteredSales.length).toLocaleString()}` : '-'}</Text>
                        <Text style={styles.statLabel}>Avg Sale</Text>
                    </Card>
                    <Card style={styles.statCard}>
                        <Text style={styles.statValue}>{filteredExpenses.length > 0 ? `${currency}${Math.round(totalExpenses / filteredExpenses.length).toLocaleString()}` : '-'}</Text>
                        <Text style={styles.statLabel}>Avg Expense</Text>
                    </Card>
                </View>

                <View style={styles.bottomSpacer} />
            </ScrollView>
        </SafeAreaView>
    );
};

const createStyles = (colors: typeof tokens.colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.semantic.background },
    content: { flex: 1, paddingHorizontal: tokens.spacing.md },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: tokens.spacing.md, paddingBottom: tokens.spacing.md },
    header: { paddingTop: tokens.spacing.md, paddingBottom: tokens.spacing.md },
    title: { fontSize: tokens.typography.sizes.xxl, color: colors.brand.secondary, fontFamily: tokens.typography.fontFamily.bold },
    subtitle: { fontSize: tokens.typography.sizes.sm, color: colors.text.secondary, fontFamily: tokens.typography.fontFamily.regular },
    exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.brand.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: tokens.radius.md },
    exportBtnDisabled: { opacity: 0.6 },
    exportBtnText: { color: colors.text.inverse, fontSize: tokens.typography.sizes.sm, fontFamily: tokens.typography.fontFamily.medium },
    rangeSelector: { flexDirection: 'row', backgroundColor: colors.semantic.soft, borderRadius: tokens.radius.pill, padding: tokens.spacing.xxs, marginBottom: tokens.spacing.md },
    rangeTab: { flex: 1, paddingVertical: tokens.spacing.xs, alignItems: 'center', borderRadius: tokens.radius.pill },
    rangeTabActive: { backgroundColor: colors.brand.secondary },
    rangeText: { fontSize: tokens.typography.sizes.sm, color: colors.text.secondary, fontFamily: tokens.typography.fontFamily.medium },
    rangeTextActive: { color: colors.text.inverse },
    summaryRow: { flexDirection: 'row', gap: tokens.spacing.sm, marginBottom: tokens.spacing.sm },
    salesSummary: { flex: 1, backgroundColor: colors.semantic.success },
    expensesSummary: { flex: 1, backgroundColor: colors.brand.primary },
    summaryLabel: { fontSize: tokens.typography.sizes.sm, color: colors.brand.secondary, marginBottom: tokens.spacing.xxs, fontFamily: tokens.typography.fontFamily.regular },
    summaryLabelLight: { fontSize: tokens.typography.sizes.sm, color: colors.text.inverse, marginBottom: tokens.spacing.xxs, fontFamily: tokens.typography.fontFamily.regular },
    salesAmount: { fontSize: tokens.typography.sizes.xl, color: colors.brand.secondary, fontFamily: tokens.typography.fontFamily.bold },
    expensesAmount: { fontSize: tokens.typography.sizes.xl, color: colors.text.inverse, fontFamily: tokens.typography.fontFamily.bold },
    creditReceivedCard: { flex: 1, backgroundColor: 'rgba(129, 178, 154, 0.8)' },
    creditPaidCard: { flex: 1, backgroundColor: 'rgba(236, 11, 67, 0.8)' },
    creditReceivedAmount: { fontSize: tokens.typography.sizes.xl, color: colors.brand.secondary, fontFamily: tokens.typography.fontFamily.bold },
    creditPaidAmount: { fontSize: tokens.typography.sizes.xl, color: colors.text.inverse, fontFamily: tokens.typography.fontFamily.bold },
    profitCard: { marginBottom: tokens.spacing.md },
    profitPositive: { backgroundColor: colors.brand.secondary },
    profitNegative: { backgroundColor: colors.brand.primary },
    profitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    profitLabel: { fontSize: tokens.typography.sizes.sm, color: colors.text.inverse, fontFamily: tokens.typography.fontFamily.regular },
    profitAmount: { fontSize: tokens.typography.sizes.xxl, color: colors.text.inverse, fontFamily: tokens.typography.fontFamily.bold },
    marginBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: tokens.spacing.md, paddingVertical: tokens.spacing.xs, borderRadius: tokens.radius.pill },
    marginText: { fontSize: tokens.typography.sizes.lg, color: colors.text.inverse, fontFamily: tokens.typography.fontFamily.bold },
    sectionTitle: { fontSize: tokens.typography.sizes.lg, color: colors.text.primary, marginBottom: tokens.spacing.sm, fontFamily: tokens.typography.fontFamily.semibold },
    chartCard: { marginBottom: tokens.spacing.md, backgroundColor: colors.semantic.surface },
    emptyChart: { alignItems: 'center', paddingVertical: tokens.spacing.xl },
    emptyIcon: { fontSize: 40, marginBottom: tokens.spacing.sm },
    emptyText: { fontSize: tokens.typography.sizes.md, color: colors.text.muted, fontFamily: tokens.typography.fontFamily.regular },
    barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: tokens.spacing.sm },
    barLabel: { width: 80, flexDirection: 'row', alignItems: 'center' },
    barIcon: { fontSize: 16, marginRight: tokens.spacing.xxs },
    barText: { fontSize: tokens.typography.sizes.xs, color: colors.text.secondary, fontFamily: tokens.typography.fontFamily.regular, flex: 1 },
    barContainer: { flex: 1, height: 20, backgroundColor: colors.semantic.soft, borderRadius: tokens.radius.sm, marginHorizontal: tokens.spacing.xs, overflow: 'hidden' },
    bar: { height: '100%', backgroundColor: colors.brand.primary, borderRadius: tokens.radius.sm },
    barAmount: { width: 70, fontSize: tokens.typography.sizes.xs, color: colors.text.primary, textAlign: 'right', fontFamily: tokens.typography.fontFamily.medium },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm, marginBottom: tokens.spacing.md },
    statCard: { width: (SCREEN_WIDTH - tokens.spacing.md * 2 - tokens.spacing.sm) / 2 - tokens.spacing.sm / 2, alignItems: 'center', paddingVertical: tokens.spacing.md, backgroundColor: colors.semantic.surface },
    statValue: { fontSize: tokens.typography.sizes.xl, color: colors.brand.secondary, fontFamily: tokens.typography.fontFamily.bold },
    statLabel: { fontSize: tokens.typography.sizes.xs, color: colors.text.secondary, marginTop: tokens.spacing.xxs, fontFamily: tokens.typography.fontFamily.regular },
    bottomSpacer: { height: tokens.spacing.xl + 80 },
});

export default ReportsScreen;
