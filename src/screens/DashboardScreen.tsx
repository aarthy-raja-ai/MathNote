import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Pressable, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TrendingUp, Receipt, Handshake, Sparkles, Send, X, Check, Settings as SettingsIcon, RotateCcw, FileText, BarChart3 } from 'lucide-react-native';
import { tokens, useTheme } from '../theme';
import { useApp } from '../context';
import { parseMagicNote, ParsedTransaction } from '../utils/nlpParser';
import { Modal, TextInput, KeyboardAvoidingView, Alert } from 'react-native';
import pdfService from '../utils/pdfService';

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
        addCredit
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

    // Inventory Calculations
    const totalStockItems = products.reduce((sum, p) => sum + p.stock, 0);
    const lowStockItems = products.filter(p => p.stock <= (p.minStockLevel || 5)).length;

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
            icon: <BarChart3 size={28} color={colors.icon.active} strokeWidth={2.5} />,
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
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerTop}>
                            <View>
                                <Text style={styles.greeting}>Welcome back! 👋</Text>
                                <Text style={styles.title}>Math Note</Text>
                            </View>
                            <Pressable onPress={() => navigation.navigate('Settings')} style={styles.settingsIcon}>
                                <SettingsIcon size={24} color={colors.text.secondary} />
                            </Pressable>
                        </View>
                        <Text style={styles.tagline}>Every Number. Clearly Noted.</Text>
                    </View>

                    {/* Magic Note Bar */}
                    <View style={styles.magicBarContainer}>
                        <View style={styles.magicInputWrapper}>
                            <Sparkles size={20} color={colors.brand.primary} style={styles.magicIcon} />
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
                                    <Send size={20} color={colors.brand.primary} />
                                </Pressable>
                            )}
                        </View>
                    </View>

                    {/* Summary Cards */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Today's Summary</Text>
                        <Pressable
                            style={[styles.exportTodayBtn, isExporting && { opacity: 0.6 }]}
                            onPress={handleExportToday}
                            disabled={isExporting}
                        >
                            {isExporting ? <ActivityIndicator size="small" color={colors.brand.primary} /> : <FileText size={18} color={colors.brand.primary} />}
                            <Text style={styles.exportTodayText}>PDF Report</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.exportTodayBtn, { backgroundColor: colors.brand.secondary + '15' }]}
                            onPress={() => navigation.navigate('Reports')}
                        >
                            <BarChart3 size={18} color={colors.brand.secondary} />
                            <Text style={[styles.exportTodayText, { color: colors.brand.secondary }]}>View Stats</Text>
                        </Pressable>
                    </View>

                    <View style={styles.summaryCard}>
                        <Text style={styles.cardLabel}>Today's Sales</Text>
                        <Text style={styles.cardAmountGreen}>
                            {currency} {todaySales.toLocaleString()}
                        </Text>
                    </View>

                    <View style={styles.summaryCard}>
                        <Text style={styles.cardAmountRed}>
                            {currency} {todayExpenses.toLocaleString()}
                        </Text>
                    </View>

                    {/* Inventory Summary Card */}
                    <View style={styles.inventoryCard}>
                        <View style={styles.inventoryHeader}>
                            <View>
                                <Text style={styles.cardLabel}>Inventory Status</Text>
                                <Text style={styles.inventoryMain}>
                                    {totalStockItems} Items in Stock
                                </Text>
                            </View>
                            {lowStockItems > 0 && (
                                <View style={styles.lowStockBadgeLarge}>
                                    <Text style={styles.lowStockTitle}>{lowStockItems}</Text>
                                    <Text style={styles.lowStockSub}>Alerts</Text>
                                </View>
                            )}
                        </View>

                        {lowStockItems > 0 && (
                            <View style={styles.lowStockList}>
                                {products.filter(p => p.stock <= (p.minStockLevel || 5)).slice(0, 3).map(p => (
                                    <View key={p.id} style={styles.lowStockItem}>
                                        <View style={styles.lowStockIndicator} />
                                        <Text style={styles.lowStockName} numberOfLines={1}>{p.name}</Text>
                                        <Text style={styles.lowStockQty}>{p.stock} left</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        <Pressable onPress={() => navigation.navigate('Inventory')} style={styles.viewInventoryBtnContainer}>
                            <Text style={styles.viewInventoryBtn}>Manage Inventory →</Text>
                        </Pressable>
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
                        <View>
                            <Text style={styles.balanceLabel}>Total Balance</Text>
                            <Text style={styles.balanceAmount}>
                                {currency} {Math.abs(balance).toLocaleString()}
                                {balance < 0 && ' (Deficit)'}
                            </Text>
                        </View>
                        <View style={styles.balanceTag}>
                            <Text style={styles.balanceTagText}>LIVE</Text>
                        </View>
                    </View>

                    {/* Recent Invoices / Activity */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Invoices</Text>
                        <Pressable onPress={() => navigation.navigate('Sales')}>
                            <Text style={styles.seeAllText}>See All</Text>
                        </Pressable>
                    </View>

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

            {/* Preview Modal */}
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
    },
    scrollContent: {
        paddingBottom: 100, // Increased for floating navbar
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
        paddingBottom: tokens.spacing.md,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    settingsIcon: {
        padding: 10,
    },
    magicBarContainer: {
        marginBottom: tokens.spacing.lg,
    },
    magicInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.semantic.surface,
        borderRadius: 20,
        paddingHorizontal: tokens.spacing.md,
        height: 56,
        ...tokens.shadow.card,
        borderWidth: 1,
        borderColor: colors.brand.primary + '33',
    },
    magicIcon: {
        marginRight: tokens.spacing.sm,
    },
    magicInput: {
        flex: 1,
        fontSize: 15,
        color: colors.text.primary,
        fontFamily: tokens.typography.fontFamily.medium,
    },
    sendButton: {
        padding: 8,
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
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: tokens.spacing.lg,
        marginBottom: tokens.spacing.sm,
    },
    sectionTitle: {
        fontSize: tokens.typography.sizes.lg,
        color: colors.text.primary,
        fontFamily: tokens.typography.fontFamily.semibold,
    },
    exportTodayBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.brand.primary + '15',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    exportTodayText: {
        fontSize: 12,
        color: colors.brand.primary,
        fontFamily: tokens.typography.fontFamily.bold,
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
        color: '#6366F1', // Using Indigo
        fontFamily: tokens.typography.fontFamily.bold,
    },
    cardAmountPurple: {
        fontSize: tokens.typography.sizes.lg,
        color: '#8B5CF6', // Modern Violet
        fontFamily: tokens.typography.fontFamily.bold,
    },
    inventoryCard: {
        backgroundColor: colors.semantic.surface,
        borderRadius: tokens.radius.lg,
        padding: tokens.spacing.md,
        marginBottom: 14,
        ...tokens.shadow.card,
        borderWidth: 1,
        borderColor: colors.border.default,
    },
    inventoryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    lowStockBadgeLarge: {
        backgroundColor: '#FEF2F2',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    lowStockTitle: {
        fontSize: 16,
        color: '#DC2626',
        fontFamily: tokens.typography.fontFamily.bold,
    },
    lowStockSub: {
        fontSize: 8,
        color: '#DC2626',
        fontFamily: tokens.typography.fontFamily.bold,
        textTransform: 'uppercase',
    },
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
    inventoryMain: {
        fontSize: 20,
        color: colors.brand.secondary,
        fontFamily: tokens.typography.fontFamily.bold,
        marginTop: 2,
    },
    viewInventoryBtnContainer: {
        marginTop: 4,
    },
    viewInventoryBtn: {
        fontSize: 13,
        color: colors.brand.primary,
        fontFamily: tokens.typography.fontFamily.semibold,
    },
    balanceCard: {
        backgroundColor: colors.brand.secondary,
        borderRadius: tokens.radius.xl,
        padding: tokens.spacing.lg,
        marginBottom: tokens.spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        ...tokens.shadow.floating,
    },
    balanceLabel: {
        fontSize: tokens.typography.sizes.sm,
        color: '#94A3B8',
        marginBottom: tokens.spacing.xxs,
        fontFamily: tokens.typography.fontFamily.medium,
    },
    balanceAmount: {
        fontSize: tokens.typography.sizes.xxl,
        color: colors.text.inverse,
        fontFamily: tokens.typography.fontFamily.bold,
        letterSpacing: -0.5,
    },
    balanceTag: {
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    balanceTagText: {
        fontSize: 10,
        color: '#10B981',
        fontFamily: tokens.typography.fontFamily.bold,
    },
    seeAllText: {
        fontSize: 13,
        color: colors.brand.primary,
        fontFamily: tokens.typography.fontFamily.semibold,
    },
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
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: tokens.spacing.xl,
        gap: 12,
    },
    // Preview Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        padding: tokens.spacing.xl,
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
        padding: tokens.spacing.lg,
        ...tokens.shadow.modal,
    },
    previewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: tokens.spacing.lg,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.brand.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewTitle: {
        fontSize: 20,
        fontFamily: tokens.typography.fontFamily.bold,
        color: colors.text.primary,
        flex: 1,
        marginLeft: 12,
    },
    previewDetails: {
        backgroundColor: colors.semantic.background,
        borderRadius: 16,
        padding: tokens.spacing.md,
        marginBottom: tokens.spacing.xl,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.default,
    },
    detailLabel: {
        fontSize: 14,
        color: colors.text.secondary,
        fontFamily: tokens.typography.fontFamily.regular,
    },
    detailValue: {
        fontSize: 16,
        color: colors.text.primary,
        fontFamily: tokens.typography.fontFamily.semibold,
    },
    previewButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelPreview: {
        flex: 1,
        height: 52,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: colors.border.default,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmPreview: {
        flex: 2,
        height: 52,
        borderRadius: 16,
        backgroundColor: colors.brand.primary,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 16,
        fontFamily: tokens.typography.fontFamily.semibold,
        color: colors.text.secondary,
    },
    confirmText: {
        fontSize: 16,
        fontFamily: tokens.typography.fontFamily.semibold,
        color: '#fff',
    },
});

export default DashboardScreen;
