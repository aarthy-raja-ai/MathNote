import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Pressable, Platform, ActivityIndicator, useWindowDimensions, TextInput, Modal, KeyboardAvoidingView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TrendingUp, Receipt, Handshake, Sparkles, Send, X, Check, Settings as SettingsIcon, RotateCcw, FileText, BarChart3, Zap, AlertCircle, Eye, EyeOff, ShoppingCart, Barcode } from 'lucide-react-native';
import { tokens, useTheme } from '../theme';
import { DashboardCard, BarcodeScannerModal } from '../components';
import { useApp, useAuth } from '../context';
import pdfService from '../utils/pdfService';
import { getFinancialYear } from '../utils/fyHelpers';

export const DashboardScreen: React.FC = () => {
    const {
        getTodaySales,
        getTodayCashReceived,
        getTodayUPIReceived,
        getTodayExpenses,
        getTodayPurchases,
        getTodayProfit,
        getBalance,
        settings,
        isLoading,
        products,
        sales,
        expenses,
        credits,
        companies,
        selectedCompanyId,
        setSelectedCompanyId,
        getCashBalance,
        getUPIBalance,
        selectedFY,
        setSelectedFY,
        availableFYs
    } = useApp();
    const { colors } = useTheme();
    const navigation = useNavigation<any>();
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Barcode Scanner State
    const [isScannerVisible, setIsScannerVisible] = React.useState(false);
    const [isExporting, setIsExporting] = React.useState(false);
    const [pageIndex, setPageIndex] = React.useState(0);
    const [balanceVisible, setBalanceVisible] = React.useState(true);
    const [fyModalVisible, setFyModalVisible] = React.useState(false);
    const [companyModalVisible, setCompanyModalVisible] = React.useState(false);

    const { width, height } = useWindowDimensions();
    const isSmallDevice = height < 700;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, [fadeAnim]);

    const styles = useMemo(() => createStyles(colors, isSmallDevice), [colors, isSmallDevice]);

    const today = useMemo(() => new Date().toISOString().split('T')[0], []);
    const filteredSales = useMemo(() => {
        return sales.filter(s => getFinancialYear(s.date) === selectedFY && (s.companyId || 'default') === selectedCompanyId);
    }, [sales, selectedFY, selectedCompanyId]);

    const salesForToday = useMemo(() => filteredSales.filter(s => s.date === today), [filteredSales, today]);

    const filteredExpenses = useMemo(() => {
        return expenses.filter(e => getFinancialYear(e.date) === selectedFY && (e.companyId || 'default') === selectedCompanyId);
    }, [expenses, selectedFY, selectedCompanyId]);

    const expensesForToday = useMemo(() => filteredExpenses.filter(e => e.date === today), [filteredExpenses, today]);

    const filteredCredits = useMemo(() => {
        return credits.filter(c => getFinancialYear(c.date) === selectedFY && (c.companyId || 'default') === selectedCompanyId);
    }, [credits, selectedFY, selectedCompanyId]);

    const creditsForToday = useMemo(() => filteredCredits.filter(c => c.date === today), [filteredCredits, today]);

    const { role, canViewReports } = useAuth();
    const isOwner = role === 'owner';

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.brand.primary} />
                </View>
            </SafeAreaView>
        );
    }

    const todaySales = getTodaySales();
    const todayExpenses = getTodayExpenses();
    const todayProfit = getTodayProfit();
    const balance = getBalance();
    const currency = settings.currency;
    const cashBalance = getCashBalance();
    const upiBalance = getUPIBalance();
    const lowStockItems = products.filter(p => (p.companyId || 'default') === selectedCompanyId && p.stock <= (p.minStockLevel || 5)).length;

    const handleScroll = (event: any) => {
        const scrollPosition = event.nativeEvent.contentOffset.x;
        const index = Math.round(scrollPosition / (width - tokens.spacing.md * 2));
        if (index !== pageIndex && index >= 0 && index <= 2) {
            setPageIndex(index);
        }
    };

    const quickActions = [
        { icon: <TrendingUp size={24} color={colors.brand.primary} />, label: 'Add Sale', screen: 'Sales' },
        { icon: <ShoppingCart size={24} color={colors.brand.primary} />, label: 'Purchase', screen: 'Purchases' },
        { icon: <Receipt size={24} color={colors.brand.primary} />, label: 'Expense', screen: 'Expenses' },
        ...(isOwner ? [{ icon: <Handshake size={24} color={colors.brand.primary} />, label: 'Users', screen: 'UserManager' }] : []),
        { icon: <BarChart3 size={24} color={colors.brand.primary} />, label: 'Stats', screen: 'Reports' },
    ];

    const handleBarcodeScan = (scannedData: string) => {
        setIsScannerVisible(false);
        const matchedProduct = products.find(p => p.barcode === scannedData || p.id === scannedData);
        if (matchedProduct) {
            Alert.alert(
                'Product Found',
                `Name: ${matchedProduct.name}\nPrice: ${currency}${matchedProduct.unitPrice}\nStock: ${matchedProduct.stock}`,
                [
                    {
                        text: 'Record Sale',
                        onPress: () => navigation.navigate('Sales', { productId: matchedProduct.id }),
                    },
                    {
                        text: 'Manage Stock',
                        onPress: () => navigation.navigate('Inventory', { productId: matchedProduct.id }),
                    },
                    { text: 'Close', style: 'cancel' },
                ]
            );
        } else {
            Alert.alert(
                'Product Not Found',
                `No product matches barcode: ${scannedData}. Would you like to add it to inventory?`,
                [
                    {
                        text: 'Add Product',
                        onPress: () => navigation.navigate('Inventory', { barcode: scannedData }),
                    },
                    { text: 'Cancel', style: 'cancel' },
                ]
            );
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
            Alert.alert('Error', 'Failed to generate PDF');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.headerTop}>
                                <View>
                                    <Text style={styles.greeting}>Welcome back! 👋</Text>
                                    <Text style={styles.title}>{settings.businessName || 'Math Note'}</Text>
                                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                                        {/* Company Selector */}
                                        <Pressable
                                            onPress={() => setCompanyModalVisible(true)}
                                            style={{
                                                backgroundColor: colors.brand.primary + '15',
                                                paddingHorizontal: 10,
                                                paddingVertical: 5,
                                                borderRadius: 12,
                                                borderWidth: 1,
                                                borderColor: colors.brand.primary + '30',
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.brand.primary }}>
                                                {selectedCompanyId === 'default' ? 'Default Company' : (companies.find(c => c.id === selectedCompanyId)?.name || 'Default Company')}
                                            </Text>
                                            <Text style={{ fontSize: 10, color: colors.brand.primary, marginLeft: 3 }}>▼</Text>
                                        </Pressable>

                                        {/* Financial Year Selector */}
                                        <Pressable
                                            onPress={() => setFyModalVisible(true)}
                                            style={{
                                                backgroundColor: colors.brand.primary + '15',
                                                paddingHorizontal: 10,
                                                paddingVertical: 5,
                                                borderRadius: 12,
                                                borderWidth: 1,
                                                borderColor: colors.brand.primary + '30',
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.brand.primary }}>FY {selectedFY}</Text>
                                            <Text style={{ fontSize: 10, color: colors.brand.primary, marginLeft: 3 }}>▼</Text>
                                        </Pressable>
                                    </View>
                                </View>
                                <Pressable onPress={() => navigation.navigate('Settings')} style={styles.settingsIcon}>
                                    <SettingsIcon size={24} color={colors.text.secondary} />
                                </Pressable>
                            </View>
                        </View>

                        {/* Balance Cards */}
                        {canViewReports && (
                            <View style={styles.balanceRow}>
                                <DashboardCard
                                    style={styles.balanceCardHalf}
                                    gradient={['#10B981', '#059669']}
                                >
                                    <View style={styles.balanceCardHeader}>
                                        <Text style={[styles.balanceLabel, { color: 'rgba(255,255,255,0.8)' }]}>Cash Balance</Text>
                                        <Pressable onPress={() => setBalanceVisible(!balanceVisible)} hitSlop={8}>
                                            {balanceVisible ? <Eye size={16} color="rgba(255,255,255,0.9)" /> : <EyeOff size={16} color="rgba(255,255,255,0.9)" />}
                                        </Pressable>
                                    </View>
                                    <Text style={[styles.balanceAmount, { color: colors.text.inverse }]}>
                                        {balanceVisible ? `${currency} ${cashBalance.toLocaleString()}` : `${currency} ••••••`}
                                    </Text>
                                    <View style={[styles.balanceTag, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                        <Text style={[styles.balanceTagText, { color: colors.text.inverse }]}>LIVE</Text>
                                    </View>
                                </DashboardCard>

                                <DashboardCard
                                    style={styles.balanceCardHalf}
                                    gradient={['#6366F1', '#4F46E5']}
                                >
                                    <View style={styles.balanceCardHeader}>
                                        <Text style={[styles.balanceLabel, { color: 'rgba(255,255,255,0.8)' }]}>Online Balance</Text>
                                        <Pressable onPress={() => setBalanceVisible(!balanceVisible)} hitSlop={8}>
                                            {balanceVisible ? <Eye size={16} color="rgba(255,255,255,0.9)" /> : <EyeOff size={16} color="rgba(255,255,255,0.9)" />}
                                        </Pressable>
                                    </View>
                                    <Text style={[styles.balanceAmount, { color: colors.text.inverse }]}>
                                        {balanceVisible ? `${currency} ${upiBalance.toLocaleString()}` : `${currency} ••••••`}
                                    </Text>
                                    <View style={[styles.balanceTag, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                        <Text style={[styles.balanceTagText, { color: colors.text.inverse }]}>LIVE</Text>
                                    </View>
                                </DashboardCard>
                            </View>
                        )}

                        {/* Quick Shortcuts */}
                        <View style={styles.shortcutsContainer}>
                            <Text style={styles.shortcutHeader}>QUICK SHORTCUTS</Text>
                            <View style={styles.shortcutsRow}>
                                <Pressable
                                    style={({ pressed }) => [styles.shortcutCard, { backgroundColor: colors.semantic.success + '15' }, pressed && styles.shortcutPressed]}
                                    onPress={() => navigation.navigate('Sales')}
                                >
                                    <View style={[styles.shortcutIconContainer, { backgroundColor: colors.semantic.success }]}>
                                        <TrendingUp size={20} color="#fff" />
                                    </View>
                                    <Text style={styles.shortcutLabel}>Record Sale</Text>
                                </Pressable>

                                <Pressable
                                    style={({ pressed }) => [styles.shortcutCard, { backgroundColor: colors.brand.primary + '15' }, pressed && styles.shortcutPressed]}
                                    onPress={() => navigation.navigate('Inventory')}
                                >
                                    <View style={[styles.shortcutIconContainer, { backgroundColor: colors.brand.primary }]}>
                                        <ShoppingCart size={20} color="#fff" />
                                    </View>
                                    <Text style={styles.shortcutLabel}>Add Stock</Text>
                                </Pressable>

                                <Pressable
                                    style={({ pressed }) => [styles.shortcutCard, { backgroundColor: colors.semantic.error + '15' }, pressed && styles.shortcutPressed]}
                                    onPress={() => navigation.navigate('Expenses')}
                                >
                                    <View style={[styles.shortcutIconContainer, { backgroundColor: colors.semantic.error }]}>
                                        <Receipt size={20} color="#fff" />
                                    </View>
                                    <Text style={styles.shortcutLabel}>Spend</Text>
                                </Pressable>

                                <Pressable
                                    style={({ pressed }) => [styles.shortcutCard, { backgroundColor: colors.brand.secondary + '15' }, pressed && styles.shortcutPressed]}
                                    onPress={() => setIsScannerVisible(true)}
                                >
                                    <View style={[styles.shortcutIconContainer, { backgroundColor: colors.brand.secondary }]}>
                                        <Barcode size={20} color="#fff" />
                                    </View>
                                    <Text style={styles.shortcutLabel}>Scan Code</Text>
                                </Pressable>
                            </View>
                        </View>

                        {/* Stats Row 1 */}
                        <View style={styles.statsRow}>
                            <DashboardCard style={styles.statCard}>
                                <Text style={styles.statLabel}>Today's Purchases</Text>
                                <Text style={[styles.cardAmountRed, { color: '#F59E0B' }]}>
                                    {currency} {getTodayPurchases().toLocaleString()}
                                </Text>
                            </DashboardCard>
                            <DashboardCard style={styles.statCard}>
                                <Text style={styles.statLabel}>Expenses</Text>
                                <Text style={styles.cardAmountRed}>
                                    {currency} {todayExpenses.toLocaleString()}
                                </Text>
                            </DashboardCard>
                        </View>

                        {/* Stats Row 2 */}
                        <View style={styles.statsRow}>
                            <DashboardCard style={styles.statCard}>
                                <Text style={styles.statLabel}>Today's Sales</Text>
                                <Text style={styles.cardAmountGreen}>
                                    {currency} {todaySales.toLocaleString()}
                                </Text>
                            </DashboardCard>
                            {canViewReports && (
                                <>
                                    <DashboardCard style={styles.statCard}>
                                        <Text style={styles.statLabel}>Today's Profit</Text>
                                        <Text style={[styles.cardAmountPurple, { color: todayProfit >= 0 ? colors.semantic.success : colors.semantic.error }]}>
                                            {currency} {todayProfit.toLocaleString()}
                                        </Text>
                                    </DashboardCard>
                                    <DashboardCard style={styles.statCard}>
                                        <Text style={styles.statLabel}>Net Balance</Text>
                                        <Text style={[styles.cardAmountPurple, { color: balance >= 0 ? colors.brand.primary : colors.semantic.error }]}>
                                            {currency} {balance.toLocaleString()}
                                        </Text>
                                    </DashboardCard>
                                </>
                            )}
                        </View>

                        {/* Swipeable Section */}
                        <View style={styles.swipeSection}>
                            <ScrollView
                                horizontal
                                pagingEnabled
                                showsHorizontalScrollIndicator={false}
                                onScroll={handleScroll}
                                scrollEventThrottle={16}
                                decelerationRate="fast"
                                snapToInterval={width - tokens.spacing.md * 2}
                                snapToAlignment="start"
                                contentContainerStyle={{ paddingRight: tokens.spacing.lg }}
                            >
                                {/* 1. Quick Actions */}
                                <View style={styles.swipeItem}>
                                    <DashboardCard title="Quick Actions">
                                        <View style={styles.quickActionsGrid}>
                                            {quickActions.map((action, index) => (
                                                <Pressable key={index} style={styles.quickActionItem} onPress={() => navigation.navigate(action.screen)}>
                                                    <View style={styles.quickActionIcon}>{action.icon}</View>
                                                    <Text style={styles.quickActionLabel}>{action.label}</Text>
                                                </Pressable>
                                            ))}
                                            <Pressable style={styles.quickActionItem} onPress={handleExportToday} disabled={isExporting}>
                                                <View style={styles.quickActionIcon}>
                                                    {isExporting ? <ActivityIndicator size="small" color={colors.brand.primary} /> : <FileText size={24} color={colors.brand.primary} />}
                                                </View>
                                                <Text style={styles.quickActionLabel}>Report</Text>
                                            </Pressable>
                                        </View>
                                    </DashboardCard>
                                </View>

                                {/* 2. Recent Activity */}
                                <View style={styles.swipeItem}>
                                    <DashboardCard
                                        title="Recent Activity"
                                        renderHeaderRight={() => (
                                            <Pressable onPress={() => navigation.navigate('Sales')}>
                                                <Text style={styles.seeAllText}>See All</Text>
                                            </Pressable>
                                        )}
                                    >
                                        <View style={styles.activityList}>
                                            {filteredSales.slice(-3).reverse().map((sale, index) => (
                                                <View key={sale.id} style={[styles.activityItem, index === 2 && { borderBottomWidth: 0 }]}>
                                                    <View style={styles.activityIcon}>
                                                        <FileText size={20} color={colors.brand.primary} />
                                                    </View>
                                                    <View style={styles.activityMain}>
                                                        <Text style={styles.activityName} numberOfLines={1}>{sale.customerName || 'Walk-in'}</Text>
                                                        <Text style={styles.activityDate}>{sale.date}</Text>
                                                    </View>
                                                    {canViewReports && <Text style={styles.activityAmount}>{currency}{(parseFloat(sale.totalAmount as any) || 0).toLocaleString()}</Text>}
                                                </View>
                                            ))}
                                            {filteredSales.length === 0 && <Text style={styles.emptyActivity}>No recent transactions</Text>}
                                        </View>
                                    </DashboardCard>
                                </View>

                                {/* 3. Stock Alerts */}
                                <View style={styles.swipeItem}>
                                    <DashboardCard
                                        title="Stock Alerts"
                                        renderHeaderRight={() => (
                                            <Pressable onPress={() => navigation.navigate('Inventory')}>
                                                <Text style={styles.seeAllText}>Manage</Text>
                                            </Pressable>
                                        )}
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
                                            <View style={styles.emptyActivity}>
                                                <Check size={24} color={colors.semantic.success} />
                                                <Text style={{ color: colors.text.secondary }}>All stocks healthy</Text>
                                            </View>
                                        )}
                                    </DashboardCard>
                                </View>
                            </ScrollView>

                            <View style={styles.paginationDots}>
                                {[0, 1, 2].map(i => (
                                    <View key={i} style={[styles.dot, pageIndex === i ? { backgroundColor: colors.brand.primary, width: 20 } : { backgroundColor: colors.border.default }]} />
                                ))}
                            </View>
                        </View>
                    </Animated.View>
                </ScrollView>
            </View>

            <BarcodeScannerModal
                visible={isScannerVisible}
                onClose={() => setIsScannerVisible(false)}
                onScan={handleBarcodeScan}
                colors={colors}
            />

            <Modal
                visible={fyModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setFyModalVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setFyModalVisible(false)}>
                    <View style={[styles.modalContent, { backgroundColor: colors.semantic.surface, borderRadius: 16, padding: 20 }]}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: 12 }}>Select Financial Year</Text>
                        {availableFYs.map(fy => (
                            <Pressable
                                key={fy}
                                onPress={() => {
                                    setSelectedFY(fy);
                                    setFyModalVisible(false);
                                }}
                                style={{
                                    paddingVertical: 12,
                                    borderBottomWidth: 1,
                                    borderBottomColor: colors.border.default,
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <Text style={{ fontSize: 14, color: colors.text.primary, fontWeight: selectedFY === fy ? '700' : '400' }}>FY {fy}</Text>
                                {selectedFY === fy && <Text style={{ color: colors.brand.primary, fontSize: 14 }}>✓</Text>}
                            </Pressable>
                        ))}
                    </View>
                </Pressable>
            </Modal>

            <Modal
                visible={companyModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setCompanyModalVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setCompanyModalVisible(false)}>
                    <View style={[styles.modalContent, { backgroundColor: colors.semantic.surface, borderRadius: 16, padding: 20 }]}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: 12 }}>Select Active Company</Text>
                        
                        {/* Default Company Option */}
                        <Pressable
                            onPress={() => {
                                setSelectedCompanyId('default');
                                setCompanyModalVisible(false);
                            }}
                            style={{
                                paddingVertical: 12,
                                borderBottomWidth: 1,
                                borderBottomColor: colors.border.default,
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                        >
                            <Text style={{ fontSize: 14, color: colors.text.primary, fontWeight: selectedCompanyId === 'default' ? '700' : '400' }}>Default Company</Text>
                            {selectedCompanyId === 'default' && <Text style={{ color: colors.brand.primary, fontSize: 14 }}>✓</Text>}
                        </Pressable>

                        {/* List of Custom Companies */}
                        {companies.map(c => (
                            <Pressable
                                key={c.id}
                                onPress={() => {
                                    setSelectedCompanyId(c.id);
                                    setCompanyModalVisible(false);
                                }}
                                style={{
                                    paddingVertical: 12,
                                    borderBottomWidth: 1,
                                    borderBottomColor: colors.border.default,
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <Text style={{ fontSize: 14, color: colors.text.primary, fontWeight: selectedCompanyId === c.id ? '700' : '400' }}>{c.name}</Text>
                                {selectedCompanyId === c.id && <Text style={{ color: colors.brand.primary, fontSize: 14 }}>✓</Text>}
                            </Pressable>
                        ))}
                    </View>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
};

const createStyles = (colors: typeof tokens.colors, isSmallDevice: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.semantic.background },
    content: { flex: 1, paddingHorizontal: tokens.spacing.md },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { paddingVertical: tokens.spacing.md },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    greeting: { fontSize: 13, color: colors.text.secondary, fontFamily: tokens.typography.fontFamily.medium },
    title: { fontSize: 24, color: colors.brand.secondary, fontFamily: tokens.typography.fontFamily.bold },
    settingsIcon: { padding: 8, backgroundColor: colors.semantic.surface, borderRadius: 20 },
    balanceRow: { flexDirection: 'row', gap: tokens.spacing.sm, marginBottom: tokens.spacing.md },
    balanceCardHalf: { flex: 1 },
    balanceCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    balanceLabel: { fontSize: 11, fontFamily: tokens.typography.fontFamily.medium },
    balanceAmount: { fontSize: 18, fontFamily: tokens.typography.fontFamily.bold },
    balanceTag: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, marginTop: 4 },
    balanceTagText: { fontSize: 10, fontFamily: tokens.typography.fontFamily.bold },
    shortcutsContainer: {
        marginBottom: tokens.spacing.md,
    },
    shortcutHeader: {
        fontSize: 10,
        fontFamily: tokens.typography.fontFamily.medium,
        color: colors.text.muted,
        marginBottom: tokens.spacing.xs,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    shortcutsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: tokens.spacing.xs,
    },
    shortcutCard: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: tokens.spacing.md,
        borderRadius: tokens.radius.md,
        borderWidth: 1,
        borderColor: colors.border.default,
    },
    shortcutPressed: {
        opacity: 0.7,
        transform: [{ scale: 0.96 }],
    },
    shortcutIconContainer: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: tokens.spacing.xxs,
    },
    shortcutLabel: {
        fontSize: 10,
        fontFamily: tokens.typography.fontFamily.medium,
        color: colors.text.primary,
        textAlign: 'center',
        marginTop: 2,
    },
    statsRow: { flexDirection: 'row', gap: tokens.spacing.sm, marginBottom: tokens.spacing.sm },
    statCard: { flex: 1 },
    statLabel: { fontSize: 11, color: colors.text.secondary, marginBottom: 4 },
    cardAmountGreen: { fontSize: 16, color: colors.semantic.success, fontFamily: tokens.typography.fontFamily.bold },
    cardAmountRed: { fontSize: 16, color: colors.brand.primary, fontFamily: tokens.typography.fontFamily.bold },
    cardAmountPurple: { fontSize: 16, fontFamily: tokens.typography.fontFamily.bold },
    swipeSection: { marginTop: tokens.spacing.md, marginBottom: 20 },
    swipeItem: { width: tokens.spacing.lg * 15, marginRight: tokens.spacing.md }, // width placeholder, usually calculated
    quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm },
    quickActionItem: { width: '47%', backgroundColor: colors.semantic.background, padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
    quickActionIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    quickActionLabel: { fontSize: 13, color: colors.text.primary },
    seeAllText: { fontSize: 12, color: colors.brand.primary, fontWeight: '600' },
    activityList: { gap: 8 },
    activityItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border.default },
    activityIcon: { marginRight: 12 },
    activityMain: { flex: 1 },
    activityName: { fontSize: 14, color: colors.text.primary, fontWeight: '600' },
    activityDate: { fontSize: 11, color: colors.text.secondary },
    activityAmount: { fontSize: 14, fontWeight: '700' },
    emptyActivity: { textAlign: 'center', color: colors.text.muted, paddingVertical: 20 },
    lowStockList: { gap: 8 },
    lowStockItem: { flexDirection: 'row', alignItems: 'center' },
    lowStockIndicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.semantic.error, marginRight: 8 },
    lowStockName: { flex: 1, fontSize: 13 },
    lowStockQty: { fontSize: 12, color: colors.semantic.error, fontWeight: '700' },
    paginationDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border.default },
    modalOverlay: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.6)' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject },
    modalContent: { width: '100%' },
});
