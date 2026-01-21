import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Pressable, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TrendingUp, Receipt, Handshake, Sparkles, Send, X, Check, Settings as SettingsIcon } from 'lucide-react-native';
import { tokens, useTheme } from '../theme';
import { useApp } from '../context';
import { parseMagicNote, ParsedTransaction } from '../utils/nlpParser';
import { Modal, TextInput, KeyboardAvoidingView, Alert } from 'react-native';

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

    // Magic Note State
    const [magicNote, setMagicNote] = React.useState('');
    const [parsedData, setParsedData] = React.useState<ParsedTransaction | null>(null);
    const [showPreview, setShowPreview] = React.useState(false);
    const [isProcessing, setIsProcessing] = React.useState(false);

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

    const { addSale, addExpense, addCredit } = useApp();

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

    const handleMagicSubmit = () => {
        if (!magicNote.trim()) return;

        const parsed = parseMagicNote(magicNote);
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
