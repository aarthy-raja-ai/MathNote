import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Pressable, Platform, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TrendingUp, Receipt, Handshake, Sparkles, Send, X, Check, Settings as SettingsIcon, RotateCcw, FileText, BarChart3, Zap, AlertCircle, Eye, EyeOff } from 'lucide-react-native';
import { tokens, useTheme } from '../theme';
import { DashboardCard } from '../components/DashboardCard';
import { useApp } from '../context';
import { parseMagicNote, ParsedTransaction } from '../utils/nlpParser';
import { Modal, TextInput, KeyboardAvoidingView, Alert } from 'react-native';
import pdfService from '../utils/pdfService';



export const DashboardScreen: React.FC = () => {
    const {
        getTodaySales,
        getTodayCashReceived,
        getTodayUPIReceived,
        getTodayExpenses,
        getBalance,
        settings,
        isLoading,
        products,
        returns,
        sales,
        expenses,
        credits,
        addSale,
        addExpense,
        addCredit,
        getCashBalance,
        getUPIBalance
    } = useApp();
    const { colors, isDark } = useTheme();
    const navigation = useNavigation<any>();
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Magic Note State
    const [magicNote, setMagicNote] = React.useState('');
    const [parsedData, setParsedData] = React.useState<ParsedTransaction | null>(null);
    const [showPreview, setShowPreview] = React.useState(false);
    const [isProcessing, setIsProcessing] = React.useState(false);
    const [isExporting, setIsExporting] = React.useState(false);
    const [pageIndex, setPageIndex] = React.useState(0);
    const [balanceVisible, setBalanceVisible] = React.useState(true);

    // Hint Cycling
    const hints = [
        "Type: 'Sold 500 to Rahul'",
        "Type: 'Spent 200 on Lunch'",
        "Type: 'Lent 1000 to Ajay cash'",
        "Try Math: 'Sold 50*8 to Shop'",
        "Try: 'Bought 150 Petrol'",
    ];
    const [hintIndex, setHintIndex] = React.useState(0);

    React.useEffect(() => {
        const interval = setInterval(() => {
            setHintIndex((prev) => (prev + 1) % hints.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: tokens.motion.duration.slow,
            useNativeDriver: true,
        }).start();
    }, [fadeAnim]);

    // Create dynamic styles based on theme
    const styles = useMemo(() => createStyles(colors), [colors]);

    // Report Summaries
    const today = useMemo(() => new Date().toISOString().split('T')[0], []);
    const salesForToday = useMemo(() => sales.filter(s => s.date === today), [sales, today]);
    const expensesForToday = useMemo(() => expenses.filter(e => e.date === today), [expenses, today]);
    const creditsForToday = useMemo(() => credits.filter(c => c.date === today), [credits, today]);

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

    const cashBalance = getCashBalance();
    const upiBalance = getUPIBalance();

    // Inventory Calculations
    const totalStockItems = products.reduce((sum, p) => sum + p.stock, 0);
    const lowStockItems = products.filter(p => p.stock <= (p.minStockLevel || 5)).length;

    const { width } = Dimensions.get('window');
    const handleScroll = (event: any) => {
        const scrollPosition = event.nativeEvent.contentOffset.x;
        const index = Math.round(scrollPosition / width);
        setPageIndex(index);
    };

    const quickActions = [
        {
            icon: <TrendingUp size={24} color={colors.icon.active} strokeWidth={2.5} />,
            label: 'Add Sale',
            screen: 'Sales',
        },
        {
            icon: <Receipt size={24} color={colors.icon.active} strokeWidth={2.5} />,
            label: 'Add Expense',
            screen: 'Expenses',
        },
        {
            icon: <BarChart3 size={24} color={colors.icon.active} strokeWidth={2.5} />,
            label: 'Stats',
            screen: 'Reports',
        },
    ];

    const handleMagicSubmit = () => {
        if (!magicNote.trim()) return;

        const parsed = parseMagicNote(magicNote, products);
        if (parsed) {
            setParsedData(parsed);
            setShowPreview(true);
        } else {
            Alert.alert('Parser Error', "Could not understand that. Try: 'Sold 500 to Rahul' or 'Spent 200 on Lunch'");
        }
    };

    const confirmMagicNote = async () => {
        if (!parsedData) return;
        setIsProcessing(true);

        try {
            const today = new Date().toISOString().split('T')[0];
            if (parsedData.type === 'sale') {
                await addSale({
                    date: today,
                    customerName: parsedData.party || 'Walk-in',
                    totalAmount: parsedData.amount,
                    paidAmount: parsedData.paidAmount || parsedData.amount,
                    paymentMethod: parsedData.paymentMethod,
                    note: parsedData.note || '',
                });
            } else if (parsedData.type === 'expense') {
                await addExpense({
                    date: today,
                    category: parsedData.category || 'Other',
                    amount: parsedData.amount,
                    note: parsedData.note || '',
                    paymentMethod: parsedData.paymentMethod,
                });
            } else if (parsedData.type === 'credit') {
                await addCredit({
                    date: today,
                    party: parsedData.party || 'Unknown',
                    amount: parsedData.amount,
                    type: parsedData.creditType || 'given',
                    status: 'pending',
                    paymentMode: parsedData.paymentMethod,
                });
            }

            setMagicNote('');
            setShowPreview(false);
            setParsedData(null);
            Alert.alert('Success', `${parsedData.type.charAt(0).toUpperCase() + parsedData.type.slice(1)} added successfully!`);
        } catch (error) {
            Alert.alert('Error', 'Failed to save transaction');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleExportToday = async () => {
        setIsExporting(true);
        try {
            await pdfService.shareReport({
                sales: salesForToday,
                expenses: expensesForToday,
                credits: creditsForToday,
                startDate: today,
                endDate: today,
                currency,
            });
        } catch (error) {
            Alert.alert('Error', 'Failed to generate PDF report');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <View>
                            <Text style={styles.greeting}>Welcome back! ðŸ‘‹</Text>
                            <Text style={styles.title}>{settings.businessName || 'Math Note'}</Text>
                        </View>
                        <Pressable onPress={() => navigation.navigate('Settings')} style={styles.settingsIcon}>
                            <SettingsIcon size={24} color={colors.text.secondary} />
                        </Pressable>
                    </View>
                </View>

                {/* Live Balance Row */}
                <View style={styles.balanceRow}>
                    <DashboardCard style={[styles.balanceCardHalf, { backgroundColor: colors.semantic.surface }]}>
                        <View style={styles.balanceCardHeader}>
                            <Text style={styles.balanceLabel}>Cash Balance</Text>
                            <Pressable onPress={() => setBalanceVisible(!balanceVisible)} hitSlop={8}>
                                {balanceVisible ? <Eye size={16} color={colors.text.secondary} /> : <EyeOff size={16} color={colors.text.secondary} />}
                            </Pressable>
                        </View>
                        <Text style={[styles.balanceAmount, { color: colors.semantic.success }]}>
                            {balanceVisible ? `${currency} ${cashBalance.toLocaleString()}` : `${currency} ••••••`}
                        </Text>
                        <View style={[styles.balanceTag, { backgroundColor: colors.semantic.success + '20' }]}>
                            <Text style={[styles.balanceTagText, { color: colors.semantic.success }]}>LIVE</Text>
                        </View>
                    </DashboardCard>

                    <DashboardCard style={[styles.balanceCardHalf, { backgroundColor: colors.semantic.surface }]}>
                        <View style={styles.balanceCardHeader}>
                            <Text style={styles.balanceLabel}>Online Balance</Text>
                            <Pressable onPress={() => setBalanceVisible(!balanceVisible)} hitSlop={8}>
                                {balanceVisible ? <Eye size={16} color={colors.text.secondary} /> : <EyeOff size={16} color={colors.text.secondary} />}
                            </Pressable>
                        </View>
                        <Text style={[styles.balanceAmount, { color: '#8B5CF6' }]}>
                            {balanceVisible ? `${currency} ${upiBalance.toLocaleString()}` : `${currency} ••••••`}
                        </Text>
                        <View style={[styles.balanceTag, { backgroundColor: '#8B5CF620' }]}>
                            <Text style={[styles.balanceTagText, { color: '#8B5CF6' }]}>LIVE</Text>
                        </View>
                    </DashboardCard>
                </View>

                {/* Magic Note Input (Compact) */}
                <View style={styles.magicContainer}>
                    <View style={[styles.magicInputWrapper, { borderColor: colors.brand.primary }]}>
                        <Sparkles size={16} color={colors.brand.primary} style={styles.magicIcon} />
                        <TextInput
                            style={styles.magicInput}
                            placeholder={hints[hintIndex]}
                            placeholderTextColor={colors.text.muted}
                            value={magicNote}
                            onChangeText={setMagicNote}
                            onSubmitEditing={handleMagicSubmit}
                        />
                        {magicNote.length > 0 && (
                            <Pressable onPress={handleMagicSubmit} style={styles.sendButton}>
                                <Send size={18} color={colors.brand.primary} />
                            </Pressable>
                        )}
                    </View>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statsRow}>
                        <DashboardCard style={styles.statCard}>
                            <Text style={styles.statLabel}>Today's Sales</Text>
                            <Text style={styles.cardAmountGreen}>
                                {currency} {todaySales.toLocaleString()}
                            </Text>
                        </DashboardCard>
                        <DashboardCard style={styles.statCard}>
                            <Text style={styles.statLabel}>Expenses</Text>
                            <Text style={styles.cardAmountRed}>
                                {currency} {todayExpenses.toLocaleString()}
                            </Text>
                        </DashboardCard>
                    </View>
                    <View style={styles.statsRow}>
                        <DashboardCard style={styles.statCard}>
                            <Text style={styles.statLabel}>Cash In</Text>
                            <Text style={[styles.cardAmountBlue, { fontSize: 18 }]}>
                                {currency} {todayCashReceived.toLocaleString()}
                            </Text>
                        </DashboardCard>
                        <DashboardCard style={styles.statCard}>
                            <Text style={styles.statLabel}>UPI In</Text>
                            <Text style={[styles.cardAmountPurple, { fontSize: 18 }]}>
                                {currency} {todayUPIReceived.toLocaleString()}
                            </Text>
                        </DashboardCard>
                    </View>
                </View>

                {/* Spacer to push Swipeable Section to bottom */}
                <View style={{ flex: 1 }} />

                {/* Swipeable Bottom Section */}
                <View style={styles.swipeSection}>
                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                        contentContainerStyle={styles.swipeContent}
                        decelerationRate="fast"
                        snapToInterval={width} // Snap to screen width
                    >
                        {/* 1. Quick Actions Card */}
                        <View style={{ width: width, paddingHorizontal: tokens.spacing.md }}>
                            <DashboardCard title="Quick Actions" icon={<Zap size={20} color={colors.brand.primary} />}>
                                <View style={styles.quickActionsGrid}>
                                    {quickActions.map((action, index) => (
                                        <Pressable
                                            key={index}
                                            style={styles.quickActionItem}
                                            onPress={() => navigation.navigate(action.screen)}
                                        >
                                            <View style={[styles.quickActionIcon, { backgroundColor: colors.semantic.soft }]}>
                                                {action.icon}
                                            </View>
                                            <Text style={styles.quickActionLabel}>{action.label}</Text>
                                        </Pressable>
                                    ))}
                                    <Pressable
                                        style={styles.quickActionItem}
                                        onPress={handleExportToday}
                                    >
                                        <View style={[styles.quickActionIcon, { backgroundColor: colors.semantic.soft }]}>
                                            {isExporting ? <ActivityIndicator size="small" color={colors.brand.primary} /> : <FileText size={24} color={colors.brand.primary} />}
                                        </View>
                                        <Text style={styles.quickActionLabel}>Report</Text>
                                    </Pressable>
                                </View>
                            </DashboardCard>
                        </View>

                        {/* 2. Recent Activity Card */}
                        <View style={{ width: width, paddingHorizontal: tokens.spacing.md }}>
                            <DashboardCard
                                title="Recent Activity"
                                icon={<FileText size={20} color={colors.brand.primary} />}
                                rightAction={
                                    <Pressable onPress={() => navigation.navigate('Sales')}>
                                        <Text style={styles.seeAllText}>See All</Text>
                                    </Pressable>
                                }
                            >
                                <View style={styles.activityList}>
                                    {sales.slice(-3).reverse().map((sale, index) => (
                                        <Pressable
                                            key={sale.id}
                                            style={[styles.activityItem, index === 2 && { borderBottomWidth: 0 }]}
                                            onPress={() => navigation.navigate('Sales', { highlightId: sale.id })}
                                        >
                                            <View style={styles.activityIcon}>
                                                <FileText size={20} color={colors.brand.primary} />
                                            </View>
                                            <View style={styles.activityMain}>
                                                <Text style={styles.activityName}>{sale.customerName || 'Walk-in'}</Text>
                                                <Text style={styles.activityDate}>{sale.date}</Text>
                                            </View>
                                            <Text style={styles.activityAmount}>{currency} {sale.totalAmount.toLocaleString()}</Text>
                                        </Pressable>
                                    ))}
                                    {sales.length === 0 && (
                                        <Text style={styles.emptyActivity}>No recent invoices</Text>
                                    )}
                                </View>
                            </DashboardCard>
                        </View>

                        {/* 3. Inventory / Stock Alerts */}
                        <View style={{ width: width, paddingHorizontal: tokens.spacing.md }}>
                            <DashboardCard
                                title="Stock Alerts"
                                icon={<AlertCircle size={20} color={colors.semantic.error || '#EF4444'} />}
                                rightAction={
                                    <Pressable onPress={() => navigation.navigate('Inventory')}>
                                        <Text style={styles.seeAllText}>Manage</Text>
                                    </Pressable>
                                }
                            >
                                {lowStockItems > 0 ? (
                                    <View style={styles.lowStockList}>
                                        {products.filter(p => p.stock <= (p.minStockLevel || 5)).slice(0, 3).map(p => (
                                            <View key={p.id} style={styles.lowStockItem}>
                                                <View style={styles.lowStockIndicator} />
                                                <Text style={styles.lowStockName} numberOfLines={1}>{p.name}</Text>
                                                <Text style={styles.lowStockQty}>{p.stock} left</Text>
                                            </View>
                                        ))}
                                    </View>
                                ) : (
                                    <View style={[styles.emptyActivity, { paddingVertical: tokens.spacing.lg }]}>
                                        <Check size={32} color={colors.semantic.success} style={{ alignSelf: 'center', marginBottom: 8 }} />
                                        <Text style={{ color: colors.text.secondary }}>All stocks are healthy!</Text>
                                    </View>
                                )}
                            </DashboardCard>
                        </View>
                    </ScrollView>

                    {/* Pagination Dots */}
                    <View style={styles.paginationDots}>
                        {[0, 1, 2].map((_, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.dot,
                                    pageIndex === i ? { backgroundColor: colors.brand.primary, width: 20 } : { backgroundColor: colors.border.default }
                                ]}
                            />
                        ))}
                    </View>
                </View>

            </View>

            {/* Preview Modal (Kept as is) */}
            <Modal visible={showPreview} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.modalBackdrop} onPress={() => setShowPreview(false)} />
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContent}>
                        <View style={styles.previewCard}>
                            <View style={styles.previewHeader}>
                                <View style={styles.iconCircle}>
                                    <Sparkles size={24} color={colors.text.inverse} />
                                </View>
                                <Text style={styles.previewTitle}>Confirm Entry</Text>
                                <Pressable onPress={() => setShowPreview(false)}>
                                    <X size={24} color={colors.text.secondary} />
                                </Pressable>
                            </View>

                            {parsedData && (
                                <View style={styles.previewDetails}>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Type</Text>
                                        <Text style={[styles.detailValue, { color: colors.brand.primary, textTransform: 'capitalize' }]}>
                                            {parsedData.type}
                                        </Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Amount</Text>
                                        <Text style={styles.detailValue}>{currency} {parsedData.amount.toLocaleString()}</Text>
                                    </View>
                                    {parsedData.party && (
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Party/Name</Text>
                                            <Text style={styles.detailValue}>{parsedData.party}</Text>
                                        </View>
                                    )}
                                    {parsedData.category && (
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Category</Text>
                                            <Text style={styles.detailValue}>{parsedData.category}</Text>
                                        </View>
                                    )}
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Method</Text>
                                        <Text style={styles.detailValue}>{parsedData.paymentMethod}</Text>
                                    </View>
                                </View>
                            )}

                            <View style={styles.previewButtons}>
                                <Pressable style={styles.cancelPreview} onPress={() => setShowPreview(false)}>
                                    <Text style={styles.cancelText}>Edit</Text>
                                </Pressable>
                                <Pressable style={styles.confirmPreview} onPress={confirmMagicNote}>
                                    {isProcessing ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <>
                                            <Check size={20} color="#fff" style={{ marginRight: 8 }} />
                                            <Text style={styles.confirmText}>Add Now</Text>
                                        </>
                                    )}
                                </Pressable>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
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
        paddingBottom: tokens.spacing.md, // Add padding at bottom
    },
    // Header
    header: {
        paddingTop: tokens.spacing.lg,
        paddingBottom: tokens.spacing.md,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    settingsIcon: {
        padding: 8,
        backgroundColor: colors.semantic.surface,
        borderRadius: 20,
    },
    greeting: {
        fontSize: tokens.typography.sizes.sm,
        color: colors.text.secondary,
        marginBottom: 2,
        fontFamily: tokens.typography.fontFamily.regular,
    },
    title: {
        fontSize: tokens.typography.sizes.xl,
        color: colors.brand.secondary,
        fontFamily: tokens.typography.fontFamily.bold,
    },

    // Balance Row
    balanceRow: {
        flexDirection: 'row',
        marginBottom: tokens.spacing.md,
        gap: 12,
    },
    balanceCardHalf: {
        flex: 1,
        marginBottom: 0, // Override default card margin
        padding: 12,
        minHeight: 100,
        justifyContent: 'space-between',
        ...tokens.shadow.card,
        borderWidth: 1,
        borderColor: colors.border.default,
    },
    balanceLabel: {
        fontSize: 12,
        color: colors.text.secondary,
        fontFamily: tokens.typography.fontFamily.medium,
        marginBottom: 4,
    },
    balanceCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    balanceAmount: {
        fontSize: 20,
        fontFamily: tokens.typography.fontFamily.bold,
        letterSpacing: -0.5,
    },
    balanceTag: {
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 8,
    },
    balanceTagText: {
        fontSize: 9,
        fontFamily: tokens.typography.fontFamily.bold,
    },

    // Magic Input
    magicContainer: {
        marginBottom: tokens.spacing.md,
    },
    magicInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.semantic.surface,
        borderRadius: 16,
        paddingHorizontal: 12,
        height: 50,
        borderWidth: 1,
    },
    magicIcon: {
        marginRight: 8,
    },
    magicInput: {
        flex: 1,
        fontSize: 14,
        color: colors.text.primary,
        fontFamily: tokens.typography.fontFamily.medium,
    },
    sendButton: {
        padding: 8,
    },

    // Stats Grid
    statsGrid: {
        gap: 8,
        marginBottom: tokens.spacing.md,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    statCard: {
        flex: 1,
        marginBottom: 0,
        padding: 12,
        backgroundColor: colors.semantic.surface,
    },
    statLabel: {
        fontSize: 11,
        color: colors.text.secondary,
        fontFamily: tokens.typography.fontFamily.medium,
        marginBottom: 2,
    },
    cardAmountGreen: {
        fontSize: 16,
        color: colors.semantic.success,
        fontFamily: tokens.typography.fontFamily.bold,
    },
    cardAmountRed: {
        fontSize: 16,
        color: colors.brand.primary,
        fontFamily: tokens.typography.fontFamily.bold,
    },
    cardAmountBlue: {
        fontSize: 16,
        color: '#6366F1',
        fontFamily: tokens.typography.fontFamily.bold,
    },
    cardAmountPurple: {
        fontSize: 16,
        color: '#8B5CF6',
        fontFamily: tokens.typography.fontFamily.bold,
    },

    // Swipe Section
    swipeSection: {
        marginBottom: 0,
        marginHorizontal: -tokens.spacing.md,
    },
    swipeContent: {
        paddingBottom: 2,
    },
    paginationDots: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
        marginTop: 8,
        marginBottom: 8,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },

    // Quick Actions Grid (inside card)
    quickActionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    quickActionItem: {
        width: '48%', // roughly half
        backgroundColor: colors.semantic.background,
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    quickActionIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickActionLabel: {
        fontSize: 14,
        color: colors.text.primary,
        fontFamily: tokens.typography.fontFamily.medium,
    },
    seeAllText: {
        fontSize: 13,
        color: colors.brand.primary,
        fontFamily: tokens.typography.fontFamily.semibold,
    },

    // Inventory List additional styles
    lowStockList: {
        marginTop: 4,
        marginBottom: 12,
        backgroundColor: colors.semantic.background,
        borderRadius: 12,
        padding: 8,
    },
    lowStockItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
    },
    lowStockIndicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#DC2626',
        marginRight: 10,
    },
    lowStockName: {
        flex: 1,
        fontSize: 13,
        color: colors.text.primary,
        fontFamily: tokens.typography.fontFamily.medium,
    },
    lowStockQty: {
        fontSize: 12,
        color: '#DC2626',
        fontFamily: tokens.typography.fontFamily.bold,
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContent: {
        width: '100%',
    },
    previewCard: {
        backgroundColor: colors.semantic.surface,
        borderRadius: 24,
        padding: 20,
        ...tokens.shadow.floating,
    },
    previewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.brand.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewTitle: {
        fontSize: 18,
        fontFamily: tokens.typography.fontFamily.bold,
        color: colors.text.primary,
    },
    previewDetails: {
        backgroundColor: colors.semantic.background,
        borderRadius: 16,
        padding: 16,
        gap: 12,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 14,
        color: colors.text.secondary,
        fontFamily: tokens.typography.fontFamily.medium,
    },
    detailValue: {
        fontSize: 14,
        color: colors.text.primary,
        fontFamily: tokens.typography.fontFamily.semibold,
    },
    previewButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
    },
    cancelPreview: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        backgroundColor: colors.semantic.background,
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 15,
        fontFamily: tokens.typography.fontFamily.semibold,
        color: colors.text.secondary,
    },
    confirmPreview: {
        flex: 2,
        flexDirection: 'row',
        padding: 14,
        borderRadius: 12,
        backgroundColor: colors.brand.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmText: {
        fontSize: 15,
        fontFamily: tokens.typography.fontFamily.semibold,
        color: '#fff',
    },
    // Loading
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
    // Activity List
    activityList: {
        backgroundColor: colors.semantic.surface,
        borderRadius: tokens.radius.lg,
        paddingHorizontal: tokens.spacing.md,
        marginBottom: tokens.spacing.lg,
        ...tokens.shadow.card,
        borderWidth: 1,
        borderColor: colors.border.default,
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: tokens.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.default,
    },
    activityIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.brand.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    activityMain: {
        flex: 1,
    },
    activityName: {
        fontSize: 15,
        color: colors.text.primary,
        fontFamily: tokens.typography.fontFamily.semibold,
    },
    activityDate: {
        fontSize: 12,
        color: colors.text.muted,
        fontFamily: tokens.typography.fontFamily.regular,
        marginTop: 2,
    },
    activityAmount: {
        fontSize: 15,
        color: colors.text.primary,
        fontFamily: tokens.typography.fontFamily.bold,
    },
    emptyActivity: {
        textAlign: 'center',
        paddingVertical: tokens.spacing.xl,
        color: colors.text.muted,
        fontFamily: tokens.typography.fontFamily.regular,
    },
});

export default DashboardScreen;
