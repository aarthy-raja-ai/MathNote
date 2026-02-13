import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Animated,
    TouchableOpacity,
    Dimensions,
    Modal,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { FileText, BarChart3, TrendingUp, Calendar, FileSpreadsheet } from 'lucide-react-native';
import { Card } from '../components';
import { tokens, useTheme } from '../theme';
import { useApp } from '../context';
import pdfService from '../utils/pdfService';
import { exportSalesCSV, exportExpensesCSV, exportCreditsCSV, exportAllDataCSV } from '../utils/exportService';

type DateRange = 'daily' | 'weekly' | 'monthly' | 'yearly';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ReportsScreen: React.FC = () => {
    const { sales, expenses, credits, settings } = useApp();
    const { colors } = useTheme();
    const [range, setRange] = useState<DateRange>('weekly');
    const [isExporting, setIsExporting] = useState(false);
    const [pdfDatePickerVisible, setPdfDatePickerVisible] = useState(false);
    const [pdfStartDate, setPdfStartDate] = useState('');
    const [pdfEndDate, setPdfEndDate] = useState('');
    const [showExportMenu, setShowExportMenu] = useState(false);
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
            case 'yearly':
                const yearAgo = new Date(now); yearAgo.setFullYear(yearAgo.getFullYear() - 1);
                return { start: yearAgo.toISOString().split('T')[0], end: today };
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

    const totalSales = filteredSales.reduce((sum, s) => sum + (s.totalAmount ?? s.paidAmount ?? 0), 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Calculate COGS (Cost of Goods Sold)
    const totalCOGS = filteredSales.reduce((sum, s) => {
        const saleItemsCOGS = (s.items || []).reduce((itemSum, item) => {
            return itemSum + ((item.costPrice || 0) * item.quantity);
        }, 0);
        return sum + saleItemsCOGS;
    }, 0);

    const grossProfit = totalSales - totalCOGS;
    const netProfit = grossProfit - totalExpenses;
    const profitMargin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : '0';

    // Top Selling Products
    const productStats = filteredSales.reduce((acc, s) => {
        (s.items || []).forEach(item => {
            if (!acc[item.productId]) {
                acc[item.productId] = { name: item.productName, qty: 0, revenue: 0, profit: 0 };
            }
            acc[item.productId].qty += item.quantity;
            acc[item.productId].revenue += (item.unitPrice * item.quantity);
            acc[item.productId].profit += ((item.unitPrice - (item.costPrice || 0)) * item.quantity);
        });
        return acc;
    }, {} as Record<string, { name: string; qty: number; revenue: number; profit: number }>);

    const topProducts = Object.values(productStats)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

    // GST Summary (Monthly)
    const gstSummary = useMemo(() => {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        const monthSales = sales.filter(s => s.date >= monthStart && s.date <= monthEnd);

        let totalCGST = 0, totalSGST = 0, totalIGST = 0, totalTaxableValue = 0;

        monthSales.forEach(sale => {
            const subtotal = sale.subtotal || sale.totalAmount || 0;
            totalTaxableValue += subtotal;
            totalCGST += sale.cgstAmount || 0;
            totalSGST += sale.sgstAmount || 0;
            totalIGST += sale.igstAmount || 0;
        });

        return {
            month: now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
            taxableValue: totalTaxableValue,
            cgst: totalCGST,
            sgst: totalSGST,
            igst: totalIGST,
            totalGST: totalCGST + totalSGST + totalIGST,
            salesCount: monthSales.length,
        };
    }, [sales]);

    // Customer-wise Sales
    const customerSales = useMemo(() => {
        const customerMap = filteredSales.reduce((acc, sale) => {
            const customer = sale.customerName || 'Walk-in';
            if (!acc[customer]) {
                acc[customer] = { name: customer, salesCount: 0, totalAmount: 0, paidAmount: 0 };
            }
            acc[customer].salesCount += 1;
            acc[customer].totalAmount += sale.totalAmount || 0;
            acc[customer].paidAmount += sale.paidAmount || 0;
            return acc;
        }, {} as Record<string, { name: string; salesCount: number; totalAmount: number; paidAmount: number }>);

        return Object.values(customerMap)
            .sort((a, b) => b.totalAmount - a.totalAmount)
            .slice(0, 8);
    }, [filteredSales]);

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
        inventory: { label: 'Inventory', icon: '📦', color: '#4BC0C0' },
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

    // Prepare Financial Trends (last 7 days)
    const getFinancialTrends = () => {
        const labels: string[] = [];
        const salesData: number[] = [];
        const expensesData: number[] = [];
        const profitData: number[] = [];
        const now = new Date();

        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayLabel = date.toLocaleDateString('en-IN', { weekday: 'short' });
            labels.push(dayLabel);

            const daySales = sales
                .filter(s => s.date === dateStr)
                .reduce((sum, s) => sum + (s.totalAmount ?? s.paidAmount ?? 0), 0);

            const dayExpenses = expenses
                .filter(e => e.date === dateStr)
                .reduce((sum, e) => sum + (e.amount || 0), 0);

            const dayCOGS = sales
                .filter(s => s.date === dateStr)
                .reduce((sum, s) => {
                    return sum + (s.items || []).reduce((itemSum, item) => itemSum + ((item.costPrice || 0) * item.quantity), 0);
                }, 0);

            const dayProfit = daySales - dayCOGS - dayExpenses;

            salesData.push(daySales);
            expensesData.push(dayExpenses);
            profitData.push(dayProfit);
        }
        return { labels, salesData, expensesData, profitData };
    };

    const financialTrends = getFinancialTrends();

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

    const handleOpenPdfDatePicker = () => {
        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        setPdfStartDate(weekAgo.toISOString().split('T')[0]);
        setPdfEndDate(today);
        setPdfDatePickerVisible(true);
    };

    const handleExportPDF = async () => {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(pdfStartDate) || !dateRegex.test(pdfEndDate)) {
            return;
        }
        if (pdfStartDate > pdfEndDate) {
            return;
        }
        setPdfDatePickerVisible(false);
        setIsExporting(true);
        try {
            const pdfSales = sales.filter(s => s.date >= pdfStartDate && s.date <= pdfEndDate);
            const pdfExpenses = expenses.filter(e => e.date >= pdfStartDate && e.date <= pdfEndDate);
            const pdfCredits = credits.filter(c => c.date >= pdfStartDate && c.date <= pdfEndDate);
            await pdfService.shareReport({
                sales: pdfSales,
                expenses: pdfExpenses,
                credits: pdfCredits,
                startDate: pdfStartDate,
                endDate: pdfEndDate,
                currency,
            });
        } catch (error) {
            console.error('PDF Export Error:', error);
        } finally {
            setIsExporting(false);
        }
    };

    const handleCSVExport = async (type: 'sales' | 'expenses' | 'credits' | 'all') => {
        setShowExportMenu(false);
        setIsExporting(true);
        try {
            const { start, end } = getDateRange();
            const filtered = {
                sales: filteredSales,
                expenses: filteredExpenses,
                credits: filteredCredits,
            };
            switch (type) {
                case 'sales':
                    await exportSalesCSV(filtered.sales, currency);
                    break;
                case 'expenses':
                    await exportExpensesCSV(filtered.expenses, currency);
                    break;
                case 'credits':
                    await exportCreditsCSV(filtered.credits, currency);
                    break;
                case 'all':
                    await exportAllDataCSV({ ...filtered, currency });
                    break;
            }
        } catch (error) {
            console.error('CSV Export Error:', error);
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
                    <View style={styles.exportBtnGroup}>
                        <TouchableOpacity
                            style={[styles.exportBtn, isExporting && styles.exportBtnDisabled]}
                            onPress={handleOpenPdfDatePicker}
                            disabled={isExporting}
                        >
                            <FileText size={16} color={colors.text.inverse} strokeWidth={2} />
                            <Text style={styles.exportBtnText}>PDF</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.exportBtnCsv, isExporting && styles.exportBtnDisabled]}
                            onPress={() => setShowExportMenu(!showExportMenu)}
                            disabled={isExporting}
                        >
                            <FileSpreadsheet size={16} color={colors.brand.secondary} strokeWidth={2} />
                            <Text style={styles.exportBtnCsvText}>CSV</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* CSV Export Dropdown */}
                {showExportMenu && (
                    <View style={styles.csvDropdown}>
                        <TouchableOpacity style={styles.csvOption} onPress={() => handleCSVExport('sales')}>
                            <Text style={styles.csvOptionText}>📊 Export Sales</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.csvOption} onPress={() => handleCSVExport('expenses')}>
                            <Text style={styles.csvOptionText}>💸 Export Expenses</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.csvOption} onPress={() => handleCSVExport('credits')}>
                            <Text style={styles.csvOptionText}>🤝 Export Credits</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.csvOption, styles.csvOptionLast]} onPress={() => handleCSVExport('all')}>
                            <Text style={[styles.csvOptionText, { fontFamily: tokens.typography.fontFamily.bold }]}>📁 Export All Data</Text>
                        </TouchableOpacity>
                    </View>
                )}
                <View style={styles.rangeSelector}>
                    {(['daily', 'weekly', 'monthly', 'yearly'] as DateRange[]).map((r) => (
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
                    <Card style={styles.cogsSummary}>
                        <Text style={styles.summaryLabelLight}>Total COGS</Text>
                        <Text style={styles.expensesAmount}>{currency} {totalCOGS.toLocaleString()}</Text>
                    </Card>
                </View>

                <View style={styles.summaryRow}>
                    <Card style={styles.profitSummary}>
                        <Text style={styles.summaryLabel}>Gross Profit</Text>
                        <Text style={styles.salesAmount}>{currency} {grossProfit.toLocaleString()}</Text>
                    </Card>
                    <Card style={styles.expensesSummary}>
                        <Text style={styles.summaryLabelLight}>Op. Expenses</Text>
                        <Text style={styles.expensesAmount}>{currency} {totalExpenses.toLocaleString()}</Text>
                    </Card>
                </View>

                <Card style={[styles.profitCard, netProfit >= 0 ? styles.profitPositive : styles.profitNegative]}>
                    <View style={styles.profitRow}>
                        <View>
                            <Text style={styles.profitLabel}>Net Profit (Actual)</Text>
                            <Text style={styles.profitAmount}>{currency} {Math.abs(netProfit).toLocaleString()}{netProfit < 0 && ' (Loss)'}</Text>
                        </View>
                        <View style={styles.marginBadge}>
                            <Text style={styles.marginText}>{profitMargin}%</Text>
                        </View>
                    </View>
                </Card>

                {topProducts.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>Top Selling Products</Text>
                        <Card style={styles.chartCard}>
                            {topProducts.map((p, idx) => (
                                <View key={idx} style={styles.topProductRow}>
                                    <View style={styles.productInfo}>
                                        <Text style={[styles.productName, { color: colors.text.primary }]}>{p.name}</Text>
                                        <Text style={[styles.productMeta, { color: colors.text.muted }]}>{p.qty} units sold</Text>
                                    </View>
                                    <View style={styles.productStats}>
                                        <Text style={[styles.productRevenue, { color: colors.brand.secondary }]}>{currency}{p.revenue.toLocaleString()}</Text>
                                        <Text style={[styles.productProfit, { color: colors.semantic.success }]}>+{currency}{p.profit.toLocaleString()}</Text>
                                    </View>
                                </View>
                            ))}
                        </Card>
                    </>
                )}

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
                            <View style={styles.emptyIconContainer}>
                                <BarChart3 size={48} color={colors.brand.primary} strokeWidth={1.5} />
                            </View>
                            <Text style={styles.emptyText}>No expenses in this period</Text>
                        </View>
                    </Card>
                )}

                <Text style={styles.sectionTitle}>Financial Trends (Last 7 Days)</Text>
                <Card style={styles.chartCard}>
                    {financialTrends.salesData.some(d => d > 0) || financialTrends.expensesData.some(d => d > 0) ? (
                        <>
                            <LineChart
                                data={{
                                    labels: financialTrends.labels,
                                    datasets: [
                                        { data: financialTrends.salesData, color: () => '#4BC0C0', strokeWidth: 2 }, // Revenue
                                        { data: financialTrends.expensesData, color: () => '#FF6384', strokeWidth: 2 }, // Expenses
                                        { data: financialTrends.profitData, color: () => '#36A2EB', strokeWidth: 2 }, // Profit
                                    ],
                                    legend: ['Sales', 'Expenses', 'Profit']
                                }}
                                width={SCREEN_WIDTH - tokens.spacing.md * 2 - 32}
                                height={220}
                                chartConfig={{
                                    ...chartConfig,
                                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                                }}
                                bezier
                                style={{ marginVertical: 8, borderRadius: 16 }}
                                fromZero
                            />
                            <View style={styles.legendContainer}>
                                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#4BC0C0' }]} /><Text style={styles.legendText}>Sales</Text></View>
                                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#FF6384' }]} /><Text style={styles.legendText}>Expenses</Text></View>
                                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#36A2EB' }]} /><Text style={styles.legendText}>Profit</Text></View>
                            </View>
                        </>
                    ) : (
                        <View style={styles.emptyChart}>
                            <View style={styles.emptyIconContainer}>
                                <TrendingUp size={48} color={colors.brand.primary} strokeWidth={1.5} />
                            </View>
                            <Text style={styles.emptyText}>Not enough data for trends</Text>
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

                {/* GST Summary */}
                {settings.gstEnabled && (
                    <>
                        <Text style={styles.sectionTitle}>GST Summary - {gstSummary.month}</Text>
                        <Card style={styles.gstCard}>
                            <View style={styles.gstRow}>
                                <View style={styles.gstItem}>
                                    <Text style={styles.gstLabel}>Taxable Value</Text>
                                    <Text style={styles.gstValue}>{currency} {gstSummary.taxableValue.toLocaleString()}</Text>
                                </View>
                                <View style={styles.gstItem}>
                                    <Text style={styles.gstLabel}>Total GST</Text>
                                    <Text style={[styles.gstValue, { color: colors.brand.primary }]}>{currency} {gstSummary.totalGST.toLocaleString()}</Text>
                                </View>
                            </View>
                            <View style={styles.gstBreakdown}>
                                <View style={styles.gstBreakdownItem}>
                                    <Text style={styles.gstBreakdownLabel}>CGST</Text>
                                    <Text style={styles.gstBreakdownValue}>{currency} {gstSummary.cgst.toLocaleString()}</Text>
                                </View>
                                <View style={styles.gstBreakdownItem}>
                                    <Text style={styles.gstBreakdownLabel}>SGST</Text>
                                    <Text style={styles.gstBreakdownValue}>{currency} {gstSummary.sgst.toLocaleString()}</Text>
                                </View>
                                <View style={styles.gstBreakdownItem}>
                                    <Text style={styles.gstBreakdownLabel}>IGST</Text>
                                    <Text style={styles.gstBreakdownValue}>{currency} {gstSummary.igst.toLocaleString()}</Text>
                                </View>
                            </View>
                            <Text style={styles.gstNote}>{gstSummary.salesCount} invoices this month</Text>
                        </Card>
                    </>
                )}

                {/* Customer-wise Sales */}
                {customerSales.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>Customer-wise Sales</Text>
                        <Card style={styles.customerCard}>
                            {customerSales.map((customer, idx) => (
                                <View key={customer.name} style={[styles.customerRow, idx === customerSales.length - 1 && { borderBottomWidth: 0 }]}>
                                    <View style={styles.customerInfo}>
                                        <Text style={styles.customerName} numberOfLines={1}>{customer.name}</Text>
                                        <Text style={styles.customerMeta}>{customer.salesCount} sale{customer.salesCount > 1 ? 's' : ''}</Text>
                                    </View>
                                    <View style={styles.customerStats}>
                                        <Text style={styles.customerAmount}>{currency} {customer.totalAmount.toLocaleString()}</Text>
                                        {customer.paidAmount < customer.totalAmount && (
                                            <Text style={styles.customerPending}>
                                                {currency} {(customer.totalAmount - customer.paidAmount).toLocaleString()} due
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </Card>
                    </>
                )}

                <View style={styles.bottomSpacer} />
            </ScrollView>

            {/* PDF Date Picker Modal */}
            <Modal visible={pdfDatePickerVisible} animationType="fade" transparent={true}>
                <View style={styles.datePickerOverlay}>
                    <View style={styles.datePickerCard}>
                        <Text style={styles.datePickerTitle}>Export PDF Report</Text>
                        <Text style={styles.datePickerHint}>Select date range (YYYY-MM-DD format)</Text>

                        <View style={styles.dateInputRow}>
                            <View style={styles.dateInputGroup}>
                                <Text style={styles.dateInputLabel}>Start Date</Text>
                                <TextInput
                                    style={styles.datePickerInput}
                                    value={pdfStartDate}
                                    onChangeText={setPdfStartDate}
                                    placeholder="2024-01-01"
                                    placeholderTextColor={colors.text.muted}
                                    keyboardType="numbers-and-punctuation"
                                />
                            </View>
                            <View style={styles.dateInputGroup}>
                                <Text style={styles.dateInputLabel}>End Date</Text>
                                <TextInput
                                    style={styles.datePickerInput}
                                    value={pdfEndDate}
                                    onChangeText={setPdfEndDate}
                                    placeholder="2024-01-31"
                                    placeholderTextColor={colors.text.muted}
                                    keyboardType="numbers-and-punctuation"
                                />
                            </View>
                        </View>

                        <View style={styles.datePickerButtons}>
                            <TouchableOpacity style={styles.datePickerCancelBtn} onPress={() => setPdfDatePickerVisible(false)}>
                                <Text style={styles.datePickerCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.datePickerExportBtn} onPress={handleExportPDF}>
                                <FileText size={16} color={colors.text.inverse} />
                                <Text style={styles.datePickerExportText}>Export</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    cogsSummary: { flex: 1, backgroundColor: colors.text.muted },
    profitSummary: { flex: 1, backgroundColor: 'rgba(129, 178, 154, 0.4)', elevation: 0, shadowOpacity: 0 },
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
    chartCard: { marginBottom: tokens.spacing.md, backgroundColor: colors.semantic.surface, padding: 16 },
    topProductRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.default },
    productInfo: { flex: 1 },
    productName: { fontSize: 14, fontFamily: tokens.typography.fontFamily.bold },
    productMeta: { fontSize: 11, fontFamily: tokens.typography.fontFamily.regular, marginTop: 2 },
    productStats: { alignItems: 'flex-end' },
    productRevenue: { fontSize: 14, fontFamily: tokens.typography.fontFamily.bold },
    productProfit: { fontSize: 11, fontFamily: tokens.typography.fontFamily.medium, marginTop: 2 },
    legendContainer: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 10, color: colors.text.secondary, fontFamily: tokens.typography.fontFamily.medium },
    emptyChart: { alignItems: 'center', paddingVertical: tokens.spacing.xl },
    emptyIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.semantic.soft, justifyContent: 'center', alignItems: 'center', marginBottom: tokens.spacing.md },
    emptyText: { fontSize: tokens.typography.sizes.md, color: colors.text.muted, fontFamily: tokens.typography.fontFamily.regular },
    // PDF Date Picker Styles
    datePickerOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    datePickerCard: { backgroundColor: colors.semantic.surface, borderRadius: tokens.radius.lg, padding: tokens.spacing.lg, width: '90%', maxWidth: 380 },
    datePickerTitle: { fontSize: tokens.typography.sizes.lg, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.bold, textAlign: 'center', marginBottom: tokens.spacing.xs },
    datePickerHint: { fontSize: tokens.typography.sizes.xs, color: colors.text.muted, textAlign: 'center', marginBottom: tokens.spacing.md, fontFamily: tokens.typography.fontFamily.regular },
    dateInputRow: { flexDirection: 'row', gap: tokens.spacing.sm, marginBottom: tokens.spacing.md },
    dateInputGroup: { flex: 1 },
    dateInputLabel: { fontSize: tokens.typography.sizes.xs, color: colors.text.secondary, fontFamily: tokens.typography.fontFamily.medium, marginBottom: tokens.spacing.xxs },
    datePickerInput: { backgroundColor: colors.semantic.background, borderRadius: tokens.radius.md, padding: tokens.spacing.sm, fontSize: tokens.typography.sizes.sm, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.medium, textAlign: 'center' },
    datePickerButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: tokens.spacing.sm },
    datePickerCancelBtn: { paddingVertical: tokens.spacing.sm, paddingHorizontal: tokens.spacing.md, backgroundColor: colors.semantic.background, borderRadius: tokens.radius.md },
    datePickerCancelText: { fontSize: tokens.typography.sizes.sm, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.medium },
    datePickerExportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: tokens.spacing.sm, paddingHorizontal: tokens.spacing.lg, backgroundColor: colors.brand.primary, borderRadius: tokens.radius.md },
    datePickerExportText: { fontSize: tokens.typography.sizes.sm, color: colors.text.inverse, fontFamily: tokens.typography.fontFamily.semibold },
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
    // GST Summary Styles
    gstCard: { marginBottom: tokens.spacing.md, backgroundColor: colors.semantic.surface, padding: tokens.spacing.md },
    gstRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: tokens.spacing.md },
    gstItem: { flex: 1 },
    gstLabel: { fontSize: tokens.typography.sizes.xs, color: colors.text.muted, fontFamily: tokens.typography.fontFamily.regular, marginBottom: 2 },
    gstValue: { fontSize: tokens.typography.sizes.lg, color: colors.brand.secondary, fontFamily: tokens.typography.fontFamily.bold },
    gstBreakdown: { flexDirection: 'row', backgroundColor: colors.semantic.background, borderRadius: tokens.radius.md, padding: tokens.spacing.sm, marginBottom: tokens.spacing.sm },
    gstBreakdownItem: { flex: 1, alignItems: 'center' },
    gstBreakdownLabel: { fontSize: 10, color: colors.text.muted, fontFamily: tokens.typography.fontFamily.medium, textTransform: 'uppercase' },
    gstBreakdownValue: { fontSize: tokens.typography.sizes.sm, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.semibold, marginTop: 2 },
    gstNote: { fontSize: 11, color: colors.text.muted, fontFamily: tokens.typography.fontFamily.regular, textAlign: 'center' },
    // Customer Sales Styles
    customerCard: { marginBottom: tokens.spacing.md, backgroundColor: colors.semantic.surface, padding: tokens.spacing.sm },
    customerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.default },
    customerInfo: { flex: 1 },
    customerName: { fontSize: 14, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.semibold },
    customerMeta: { fontSize: 11, color: colors.text.muted, fontFamily: tokens.typography.fontFamily.regular, marginTop: 2 },
    customerStats: { alignItems: 'flex-end' },
    customerAmount: { fontSize: 14, color: colors.brand.secondary, fontFamily: tokens.typography.fontFamily.bold },
    customerPending: { fontSize: 11, color: colors.brand.primary, fontFamily: tokens.typography.fontFamily.medium, marginTop: 2 },
    bottomSpacer: { height: tokens.spacing.xl + 80 },
    // CSV Export Styles
    exportBtnGroup: { flexDirection: 'row', gap: 8 },
    exportBtnCsv: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.semantic.soft, paddingHorizontal: 12, paddingVertical: 8, borderRadius: tokens.radius.md, borderWidth: 1, borderColor: colors.border.default },
    exportBtnCsvText: { color: colors.brand.secondary, fontSize: tokens.typography.sizes.sm, fontFamily: tokens.typography.fontFamily.medium },
    csvDropdown: { backgroundColor: colors.semantic.surface, borderRadius: tokens.radius.md, marginBottom: tokens.spacing.sm, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    csvOption: { paddingVertical: tokens.spacing.sm, paddingHorizontal: tokens.spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border.default },
    csvOptionLast: { borderBottomWidth: 0 },
    csvOptionText: { fontSize: tokens.typography.sizes.sm, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.medium },
});

export default ReportsScreen;
