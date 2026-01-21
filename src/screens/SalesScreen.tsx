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
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pencil, Trash2, Share2, FileText } from 'lucide-react-native';
import { Card, Input, DateFilter, filterByDateRange, getFilterLabel } from '../components';
import type { DateFilterType } from '../components';
import { tokens, useTheme } from '../theme';
import { useApp } from '../context';
import { Sale } from '../utils/storage';
import { generateInvoicePDF } from '../utils/invoiceGenerator';
import { evaluateMath } from '../utils/mathEvaluator';

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
    const [datePickerVisible, setDatePickerVisible] = useState(false);
    const [editingSale, setEditingSale] = useState<Sale | null>(null);

    // Form fields
    const [customerName, setCustomerName] = useState('');
    const [totalAmount, setTotalAmount] = useState('');
    const [paidAmount, setPaidAmount] = useState('');
    const [note, setNote] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');

    // Date filter state
    const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [dateInputValue, setDateInputValue] = useState('');

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
        let parsedTotal = parseFloat(totalAmount);

        // If parsing fails, try math evaluation
        if (isNaN(parsedTotal)) {
            const mathResult = evaluateMath(totalAmount);
            if (mathResult !== null) parsedTotal = mathResult;
        }

        const parsedPaid = paidAmount ? parseFloat(paidAmount) : parsedTotal;

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

    // Date filter handlers
    const handleFilterChange = (filter: DateFilterType) => {
        setDateFilter(filter);
        setSelectedDate(null);
    };

    const handleCalendarPress = () => {
        setDateInputValue(selectedDate || today);
        setDatePickerVisible(true);
    };

    const handleDateSelect = () => {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (dateRegex.test(dateInputValue)) {
            setSelectedDate(dateInputValue);
            setDatePickerVisible(false);
        } else {
            Alert.alert('Invalid Date', 'Please enter date in YYYY-MM-DD format');
        }
    };

    const clearSelectedDate = () => {
        setSelectedDate(null);
        setDatePickerVisible(false);
    };

    // Helper to get sale amounts (handles legacy data)
    const getSaleAmount = (sale: Sale) => {
        const total = sale.totalAmount ?? sale.paidAmount ?? 0;
        const paid = sale.paidAmount ?? sale.totalAmount ?? 0;
        return { total, paid };
    };

    // Filter sales based on selected filter and date
    const filteredSales = filterByDateRange(sales, dateFilter, selectedDate)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const totalFiltered = filteredSales.reduce((sum, s) => sum + (getSaleAmount(s).paid), 0);

    const renderSaleItem = ({ item }: { item: Sale }) => {
        const { total, paid } = getSaleAmount(item);
        const isPartial = paid < total && total > 0;
        const remaining = total - paid;
        const isToday = item.date === today;

        // Build subtitle parts
        const subtitleParts: string[] = [];
        if (item.paymentMethod) subtitleParts.push(item.paymentMethod);
        if (isPartial) subtitleParts.push(`Due: ${currency}${remaining}`);
        if (!isToday) subtitleParts.push(new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
        if (item.note) subtitleParts.push(item.note);

        return (
            <Pressable
                style={styles.listItem}
                onPress={() => handleEdit(item)}
                onLongPress={() => handleDelete(item.id)}
            >
                {/* Row 1: Customer name + Amount */}
                <View style={styles.listRow}>
                    <Text style={styles.listName} numberOfLines={1} ellipsizeMode="tail">
                        {item.customerName || 'Walk-in'}
                    </Text>
                    <View style={styles.amountRow}>
                        {isPartial && <View style={styles.partialDot} />}
                        <Text style={styles.listAmount}>
                            {currency} {total.toLocaleString()}
                        </Text>
                        <Pressable
                            onPress={() => generateInvoicePDF(item, settings)}
                            style={styles.shareButton}
                        >
                            <Share2 size={18} color={colors.brand.primary} />
                        </Pressable>
                    </View>
                </View>

                {/* Row 2: Payment method, due amount, date, note */}
                {subtitleParts.length > 0 && (
                    <Text style={styles.listSubtitle} numberOfLines={1} ellipsizeMode="tail">
                        {subtitleParts.join(' • ')}
                    </Text>
                )}
            </Pressable>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <Animated.View style={[styles.content, { transform: [{ translateY: slideAnim }] }]}>
                <View style={styles.header}>
                    <Text style={styles.title}>Sales</Text>
                    <Text style={styles.date}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
                </View>

                <DateFilter
                    selected={dateFilter}
                    onFilterChange={handleFilterChange}
                    onCalendarPress={handleCalendarPress}
                    selectedDate={selectedDate}
                    colors={colors}
                />

                <Card style={styles.totalCard}>
                    <Text style={styles.totalLabel}>{getFilterLabel(dateFilter, selectedDate)} Received</Text>
                    <Text style={styles.totalAmount}>{currency} {totalFiltered.toLocaleString()}</Text>
                </Card>

                <FlatList
                    data={filteredSales}
                    keyExtractor={(item) => item.id}
                    renderItem={renderSaleItem}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>📊</Text>
                            <Text style={styles.emptyText}>No sales found</Text>
                            <Text style={styles.emptySubtext}>
                                {dateFilter === 'today' ? 'Tap the button below to add your first sale' : 'Try a different date range'}
                            </Text>
                        </View>
                    }
                />
            </Animated.View>

            <Pressable style={({ pressed }) => [styles.floatingButton, pressed && styles.floatingButtonPressed]} onPress={handleAdd}>
                <Text style={styles.floatingButtonText}>+ Add Sale</Text>
            </Pressable>

            {/* Date Picker Modal */}
            <Modal visible={datePickerVisible} animationType="fade" transparent={true}>
                <View style={styles.datePickerOverlay}>
                    <View style={styles.datePickerCard}>
                        <Text style={styles.datePickerTitle}>Select Date</Text>
                        <Text style={styles.datePickerHint}>Enter date in YYYY-MM-DD format</Text>
                        <TextInput
                            style={styles.datePickerInput}
                            value={dateInputValue}
                            onChangeText={setDateInputValue}
                            placeholder="2024-01-15"
                            placeholderTextColor={colors.text.muted}
                            keyboardType="numbers-and-punctuation"
                        />
                        <View style={styles.datePickerButtons}>
                            <Pressable style={styles.datePickerClearBtn} onPress={clearSelectedDate}>
                                <Text style={styles.datePickerClearText}>Clear</Text>
                            </Pressable>
                            <View style={styles.datePickerActions}>
                                <Pressable style={styles.datePickerCancelBtn} onPress={() => setDatePickerVisible(false)}>
                                    <Text style={styles.datePickerCancelText}>Cancel</Text>
                                </Pressable>
                                <Pressable style={styles.datePickerSelectBtn} onPress={handleDateSelect}>
                                    <Text style={styles.datePickerSelectText}>Select</Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

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
    listContent: { paddingBottom: 180 },

    // Compact List Item
    listItem: {
        paddingVertical: 10,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.default,
    },
    listRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    listName: {
        flex: 1,
        fontSize: 14,
        color: colors.text.primary,
        fontFamily: tokens.typography.fontFamily.medium,
        marginRight: 8,
    },
    amountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    partialDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.brand.primary,
    },
    listAmount: {
        fontSize: 14,
        color: colors.brand.secondary,
        fontFamily: tokens.typography.fontFamily.bold,
    },
    shareButton: {
        padding: 5,
        marginLeft: 4,
    },
    listSubtitle: {
        fontSize: 12,
        color: colors.text.muted,
        fontFamily: tokens.typography.fontFamily.regular,
        marginTop: 2,
    },

    emptyContainer: { alignItems: 'center', paddingVertical: tokens.spacing.xxl },
    emptyIcon: { fontSize: 48, marginBottom: tokens.spacing.md },
    emptyText: { fontSize: tokens.typography.sizes.lg, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.medium },
    emptySubtext: { fontSize: tokens.typography.sizes.sm, color: colors.text.muted, marginTop: tokens.spacing.xs, fontFamily: tokens.typography.fontFamily.regular },

    floatingButton: { position: 'absolute', bottom: 110, alignSelf: 'center', backgroundColor: colors.brand.primary, height: 52, minWidth: 200, borderRadius: 26, justifyContent: 'center', alignItems: 'center', paddingHorizontal: tokens.spacing.lg, ...tokens.shadow.floatingButton },
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
    // Date Picker Modal Styles
    datePickerOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    datePickerCard: { backgroundColor: colors.semantic.surface, borderRadius: tokens.radius.lg, padding: tokens.spacing.lg, width: '85%', maxWidth: 340 },
    datePickerTitle: { fontSize: tokens.typography.sizes.lg, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.bold, textAlign: 'center', marginBottom: tokens.spacing.xs },
    datePickerHint: { fontSize: tokens.typography.sizes.xs, color: colors.text.muted, textAlign: 'center', marginBottom: tokens.spacing.md, fontFamily: tokens.typography.fontFamily.regular },
    datePickerInput: { backgroundColor: colors.semantic.background, borderRadius: tokens.radius.md, padding: tokens.spacing.md, fontSize: tokens.typography.sizes.md, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.medium, textAlign: 'center', marginBottom: tokens.spacing.md },
    datePickerButtons: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    datePickerClearBtn: { paddingVertical: tokens.spacing.sm, paddingHorizontal: tokens.spacing.md },
    datePickerClearText: { fontSize: tokens.typography.sizes.sm, color: colors.brand.primary, fontFamily: tokens.typography.fontFamily.medium },
    datePickerActions: { flexDirection: 'row', gap: tokens.spacing.sm },
    datePickerCancelBtn: { paddingVertical: tokens.spacing.sm, paddingHorizontal: tokens.spacing.md, backgroundColor: colors.semantic.background, borderRadius: tokens.radius.md },
    datePickerCancelText: { fontSize: tokens.typography.sizes.sm, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.medium },
    datePickerSelectBtn: { paddingVertical: tokens.spacing.sm, paddingHorizontal: tokens.spacing.lg, backgroundColor: colors.brand.primary, borderRadius: tokens.radius.md },
    datePickerSelectText: { fontSize: tokens.typography.sizes.sm, color: colors.text.inverse, fontFamily: tokens.typography.fontFamily.semibold },
});

export default SalesScreen;
