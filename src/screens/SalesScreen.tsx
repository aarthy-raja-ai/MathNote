import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Animated,
    Modal,
    TouchableOpacity,
    Alert,
    Pressable,
    PanResponder,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pencil, Trash2 } from 'lucide-react-native';
import { Card, Input } from '../components';
import { tokens, useTheme } from '../theme';
import { useApp } from '../context';
import { Sale } from '../utils/storage';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.70;

type PaymentMethod = 'Cash' | 'UPI';

// Payment Method Segmented Control
interface SegmentedControlProps {
    selected: PaymentMethod;
    onChange: (method: PaymentMethod) => void;
    colors: typeof tokens.colors;
}

const PaymentMethodControl: React.FC<SegmentedControlProps> = ({ selected, onChange, colors }) => (
    <View style={segmentStyles.container}>
        <Text style={[segmentStyles.label, { color: colors.text.primary, fontFamily: tokens.typography.fontFamily.medium }]}>
            Payment Method
        </Text>
        <View style={[segmentStyles.control, { backgroundColor: colors.semantic.background }]}>
            {(['Cash', 'UPI'] as PaymentMethod[]).map((method) => (
                <Pressable
                    key={method}
                    style={[segmentStyles.button, selected === method && { backgroundColor: colors.brand.primary }]}
                    onPress={() => onChange(method)}
                >
                    <Text style={[segmentStyles.text, { color: selected === method ? colors.text.inverse : colors.brand.secondary, fontFamily: tokens.typography.fontFamily.medium }]}>
                        {method}
                    </Text>
                </Pressable>
            ))}
        </View>
    </View>
);

const segmentStyles = StyleSheet.create({
    container: { marginBottom: tokens.spacing.md },
    label: { fontSize: tokens.typography.sizes.sm, marginBottom: tokens.spacing.xs },
    control: { flexDirection: 'row', borderRadius: tokens.radius.md, padding: 4 },
    button: { flex: 1, paddingVertical: 10, borderRadius: tokens.radius.sm, alignItems: 'center' },
    text: { fontSize: tokens.typography.sizes.md },
});

export const SalesScreen: React.FC = () => {
    const { sales, addSale, updateSale, deleteSale, settings } = useApp();
    const { colors } = useTheme();
    const [modalVisible, setModalVisible] = useState(false);
    const [editingSale, setEditingSale] = useState<Sale | null>(null);

    // Form fields
    const [customerName, setCustomerName] = useState('');
    const [totalAmount, setTotalAmount] = useState('');
    const [paidAmount, setPaidAmount] = useState('');
    const [note, setNote] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');

    const slideAnim = useRef(new Animated.Value(100)).current;
    const sheetAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;

    const today = new Date().toISOString().split('T')[0];
    const currency = settings.currency;
    const styles = useMemo(() => createStyles(colors), [colors]);

    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: 0,
            tension: tokens.motion.spring.tension,
            friction: tokens.motion.spring.friction,
            useNativeDriver: true,
        }).start();
    }, [slideAnim]);

    useEffect(() => {
        if (modalVisible) {
            Animated.spring(sheetAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }).start();
        } else {
            sheetAnim.setValue(SHEET_HEIGHT);
        }
    }, [modalVisible, sheetAnim]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
            onPanResponderMove: (_, gestureState) => { if (gestureState.dy > 0) sheetAnim.setValue(gestureState.dy); },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 100 || gestureState.vy > 0.5) closeModal();
                else Animated.spring(sheetAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }).start();
            },
        })
    ).current;

    const closeModal = () => {
        Animated.timing(sheetAnim, { toValue: SHEET_HEIGHT, duration: 250, useNativeDriver: true }).start(() => setModalVisible(false));
    };

    const handleAdd = () => {
        setEditingSale(null);
        setCustomerName('');
        setTotalAmount('');
        setPaidAmount('');
        setNote('');
        setPaymentMethod('Cash');
        setModalVisible(true);
    };

    const handleEdit = (sale: Sale) => {
        setEditingSale(sale);
        setCustomerName(sale.customerName || '');
        // Handle legacy sales that only have 'amount' field
        const total = sale.totalAmount ?? sale.paidAmount ?? 0;
        const paid = sale.paidAmount ?? sale.totalAmount ?? 0;
        setTotalAmount(total.toString());
        setPaidAmount(paid.toString());
        setNote(sale.note || '');
        setPaymentMethod(sale.paymentMethod || 'Cash');
        setModalVisible(true);
    };

    const handleDelete = (id: string) => {
        Alert.alert('Delete Sale', 'This will also delete any linked credit. Continue?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteSale(id) },
        ]);
    };

    const handleSave = async () => {
        const parsedTotal = parseFloat(totalAmount);
        const parsedPaid = paidAmount ? parseFloat(paidAmount) : parsedTotal; // Default to full payment

        if (isNaN(parsedTotal) || parsedTotal <= 0) {
            Alert.alert('Error', 'Please enter a valid total amount');
            return;
        }
        if (parsedPaid > parsedTotal) {
            Alert.alert('Error', 'Paid amount cannot exceed total amount');
            return;
        }
        if (parsedPaid < parsedTotal && !customerName.trim()) {
            Alert.alert('Error', 'Customer name is required for partial payments');
            return;
        }

        if (editingSale) {
            await updateSale(editingSale.id, {
                customerName: customerName.trim(),
                totalAmount: parsedTotal,
                paidAmount: parsedPaid,
                note,
                paymentMethod
            });
        } else {
            await addSale({
                date: today,
                customerName: customerName.trim(),
                totalAmount: parsedTotal,
                paidAmount: parsedPaid,
                note,
                paymentMethod
            });
        }
        closeModal();
    };

    // Auto-fill paid amount when total changes
    const handleTotalChange = (text: string) => {
        setTotalAmount(text);
        if (!paidAmount) setPaidAmount(text);
    };

    // Helper to get sale amounts (handles legacy data)
    const getSaleAmount = (sale: Sale) => {
        const total = sale.totalAmount ?? sale.paidAmount ?? 0;
        const paid = sale.paidAmount ?? sale.totalAmount ?? 0;
        return { total, paid };
    };

    const todaySales = sales.filter((s) => s.date === today);
    const totalToday = todaySales.reduce((sum, s) => sum + (getSaleAmount(s).paid), 0);

    const renderSaleItem = ({ item }: { item: Sale }) => {
        const { total, paid } = getSaleAmount(item);
        const isPartial = paid < total && total > 0;
        const remaining = total - paid;

        return (
            <Card style={styles.saleCard}>
                <View style={styles.saleRow}>
                    {/* Left section - takes remaining space */}
                    <View style={styles.leftSection}>
                        {item.customerName ? (
                            <Text style={styles.customerName} numberOfLines={1} ellipsizeMode="tail">
                                {item.customerName}
                            </Text>
                        ) : (
                            <Text style={styles.customerName} numberOfLines={1}>Walk-in</Text>
                        )}

                        <Text style={styles.saleAmount} numberOfLines={1}>
                            {currency} {total.toLocaleString()}
                        </Text>

                        {/* Badges row */}
                        <View style={styles.badgesRow}>
                            {isPartial && (
                                <View style={styles.partialBadge}>
                                    <Text style={styles.partialText}>Partial</Text>
                                </View>
                            )}
                            {item.paymentMethod && (
                                <View style={styles.paymentBadge}>
                                    <Text style={styles.paymentBadgeText}>{item.paymentMethod}</Text>
                                </View>
                            )}
                        </View>

                        {isPartial && (
                            <Text style={styles.balanceText} numberOfLines={1}>
                                Paid: {currency}{paid} | Due: {currency}{remaining}
                            </Text>
                        )}

                        {item.note ? (
                            <Text style={styles.saleNote} numberOfLines={1} ellipsizeMode="tail">
                                {item.note}
                            </Text>
                        ) : null}
                    </View>

                    {/* Right section - fixed width for icons */}
                    <View style={styles.rightSection}>
                        <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionBtn}>
                            <Pencil size={18} color={colors.text.muted} strokeWidth={2} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
                            <Trash2 size={18} color={colors.brand.primary} strokeWidth={2} />
                        </TouchableOpacity>
                    </View>
                </View>
            </Card>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <Animated.View style={[styles.content, { transform: [{ translateY: slideAnim }] }]}>
                <View style={styles.header}>
                    <Text style={styles.title}>Sales</Text>
                    <Text style={styles.date}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
                </View>

                <Card style={styles.totalCard}>
                    <Text style={styles.totalLabel}>Today's Received</Text>
                    <Text style={styles.totalAmount}>{currency} {totalToday.toLocaleString()}</Text>
                </Card>

                <FlatList
                    data={todaySales}
                    keyExtractor={(item) => item.id}
                    renderItem={renderSaleItem}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>📊</Text>
                            <Text style={styles.emptyText}>No sales recorded today</Text>
                            <Text style={styles.emptySubtext}>Tap the button below to add your first sale</Text>
                        </View>
                    }
                />
            </Animated.View>

            <Pressable style={({ pressed }) => [styles.floatingButton, pressed && styles.floatingButtonPressed]} onPress={handleAdd}>
                <Text style={styles.floatingButtonText}>+ Add Sale</Text>
            </Pressable>

            <Modal visible={modalVisible} animationType="none" transparent={true}>
                <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <Pressable style={styles.modalBackdrop} onPress={closeModal} />
                    <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: sheetAnim }] }]}>
                        <View {...panResponder.panHandlers} style={styles.handleContainer}>
                            <View style={styles.handleBar} />
                        </View>
                        <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            <View style={styles.sheetContent}>
                                <Text style={styles.modalTitle}>{editingSale ? 'Edit Sale' : 'Add Sale'}</Text>

                                <Input
                                    label="Customer Name"
                                    placeholder="Enter customer name (optional)"
                                    value={customerName}
                                    onChangeText={setCustomerName}
                                />
                                <Input
                                    label="Total Amount"
                                    placeholder="Enter total amount"
                                    keyboardType="numeric"
                                    value={totalAmount}
                                    onChangeText={handleTotalChange}
                                />
                                <Input
                                    label="Amount Paid"
                                    placeholder="Leave empty for full payment"
                                    keyboardType="numeric"
                                    value={paidAmount}
                                    onChangeText={setPaidAmount}
                                />

                                {paidAmount && totalAmount && parseFloat(paidAmount) < parseFloat(totalAmount) && (
                                    <View style={styles.partialNote}>
                                        <Text style={styles.partialNoteText}>
                                            💡 Remaining {currency}{(parseFloat(totalAmount) - parseFloat(paidAmount)).toLocaleString()} will be added as credit
                                        </Text>
                                    </View>
                                )}

                                <PaymentMethodControl selected={paymentMethod} onChange={setPaymentMethod} colors={colors} />
                                <Input label="Note (optional)" placeholder="Enter note" value={note} onChangeText={setNote} />

                                <View style={styles.modalButtons}>
                                    <Pressable style={[styles.modalBtn, styles.cancelBtn]} onPress={closeModal}>
                                        <Text style={styles.cancelBtnText}>Cancel</Text>
                                    </Pressable>
                                    <Pressable style={[styles.modalBtn, styles.saveBtn]} onPress={handleSave}>
                                        <Text style={styles.saveBtnText}>Save</Text>
                                    </Pressable>
                                </View>
                            </View>
                        </ScrollView>
                    </Animated.View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
};

const createStyles = (colors: typeof tokens.colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.semantic.background },
    content: { flex: 1, paddingHorizontal: tokens.spacing.md },
    header: { paddingTop: tokens.spacing.md, paddingBottom: tokens.spacing.md },
    title: { fontSize: tokens.typography.sizes.xxl, color: colors.brand.secondary, fontFamily: tokens.typography.fontFamily.bold },
    date: { fontSize: tokens.typography.sizes.sm, color: colors.text.secondary, marginTop: tokens.spacing.xxs, fontFamily: tokens.typography.fontFamily.regular },
    totalCard: { backgroundColor: colors.semantic.success, marginBottom: tokens.spacing.md },
    totalLabel: { fontSize: tokens.typography.sizes.sm, color: colors.brand.secondary, fontFamily: tokens.typography.fontFamily.regular },
    totalAmount: { fontSize: tokens.typography.sizes.xxl, color: colors.brand.secondary, fontFamily: tokens.typography.fontFamily.bold },
    listContent: { paddingBottom: 160 },

    // Sale Card - Compact layout
    saleCard: { marginBottom: tokens.spacing.xs, backgroundColor: colors.semantic.surface, padding: 12 },
    saleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

    // Left section - flex to take remaining space
    leftSection: { flex: 1, minWidth: 0, gap: 2 },

    // Right section - fixed width for icons
    rightSection: { width: 64, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },

    customerName: { fontSize: 15, color: colors.brand.secondary, fontFamily: tokens.typography.fontFamily.semibold, maxWidth: '100%' },
    saleAmount: { fontSize: 16, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.bold },

    // Badges row with wrap
    badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
    partialBadge: { height: 20, paddingHorizontal: 8, borderRadius: 10, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
    partialText: { fontSize: 10, color: colors.text.inverse, fontFamily: tokens.typography.fontFamily.medium },
    paymentBadge: { height: 20, paddingHorizontal: 8, borderRadius: 10, backgroundColor: colors.semantic.soft, alignItems: 'center', justifyContent: 'center' },
    paymentBadgeText: { fontSize: 10, color: colors.brand.secondary, fontFamily: tokens.typography.fontFamily.medium },

    balanceText: { fontSize: 12, color: colors.text.muted, fontFamily: tokens.typography.fontFamily.regular },
    saleNote: { fontSize: 12, color: colors.text.secondary, fontFamily: tokens.typography.fontFamily.regular },

    actionBtn: { padding: 6 },

    emptyContainer: { alignItems: 'center', paddingVertical: tokens.spacing.xxl },
    emptyIcon: { fontSize: 48, marginBottom: tokens.spacing.md },
    emptyText: { fontSize: tokens.typography.sizes.lg, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.medium },
    emptySubtext: { fontSize: tokens.typography.sizes.sm, color: colors.text.muted, marginTop: tokens.spacing.xs, fontFamily: tokens.typography.fontFamily.regular },

    floatingButton: { position: 'absolute', bottom: 96, alignSelf: 'center', backgroundColor: colors.brand.primary, height: 56, minWidth: 220, borderRadius: 28, justifyContent: 'center', alignItems: 'center', paddingHorizontal: tokens.spacing.lg, ...tokens.shadow.floatingButton },
    floatingButtonPressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },
    floatingButtonText: { color: colors.text.inverse, fontSize: tokens.typography.sizes.lg, fontFamily: tokens.typography.fontFamily.semibold },

    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    bottomSheet: { backgroundColor: colors.semantic.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: SCREEN_HEIGHT * 0.85 },
    handleContainer: { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
    handleBar: { width: 40, height: 4, backgroundColor: colors.border.default, borderRadius: 2 },
    sheetScroll: { maxHeight: SCREEN_HEIGHT * 0.75 },
    sheetContent: { padding: tokens.spacing.lg, paddingBottom: tokens.spacing.xxl },
    modalTitle: { fontSize: tokens.typography.sizes.xl, color: colors.text.primary, marginBottom: tokens.spacing.md, textAlign: 'center', fontFamily: tokens.typography.fontFamily.bold },
    partialNote: { backgroundColor: colors.semantic.soft, padding: tokens.spacing.sm, borderRadius: tokens.radius.md, marginBottom: tokens.spacing.md },
    partialNoteText: { fontSize: tokens.typography.sizes.sm, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.regular },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: tokens.spacing.lg, gap: 12 },
    modalBtn: { flex: 1, paddingVertical: 14, borderRadius: tokens.radius.md, alignItems: 'center' },
    cancelBtn: { backgroundColor: colors.semantic.background },
    cancelBtnText: { fontSize: tokens.typography.sizes.md, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.semibold },
    saveBtn: { backgroundColor: colors.brand.primary },
    saveBtnText: { fontSize: tokens.typography.sizes.md, color: colors.text.inverse, fontFamily: tokens.typography.fontFamily.semibold },
});

export default SalesScreen;
