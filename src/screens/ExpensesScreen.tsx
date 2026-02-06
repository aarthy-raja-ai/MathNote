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
    KeyboardAvoidingView,
    Platform,
    TextInput,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Utensils, Car, ShoppingCart, Lightbulb, Home, Briefcase, Package, Pencil, Trash2, X, Wallet, Boxes, Fuel, Phone, Heart, GraduationCap, Wrench, ChevronDown, ChevronUp, Scan } from 'lucide-react-native';
import { Card, Input, DateFilter, filterByDateRange, getFilterLabel, ContactPicker } from '../components';
import { OCRScanner } from './OCRScanner';
import { parseReceiptText } from '../utils/nlpParser';
import type { DateFilterType } from '../components';
import { tokens, useTheme } from '../theme';
import { useApp } from '../context';
import { Expense, Contact } from '../utils/storage';

// Business Categories
const BUSINESS_CATEGORIES = [
    { id: 'stock', label: 'Stock/Inventory', Icon: Boxes },
    { id: 'salary', label: 'Salary', Icon: Briefcase },
    { id: 'utilities', label: 'Utilities', Icon: Lightbulb },
    { id: 'rent', label: 'Rent', Icon: Home },
    { id: 'maintenance', label: 'Maintenance', Icon: Wrench },
];

// Personal Categories  
const PERSONAL_CATEGORIES = [
    { id: 'food', label: 'Food & Dining', Icon: Utensils },
    { id: 'transport', label: 'Transport', Icon: Car },
    { id: 'fuel', label: 'Fuel', Icon: Fuel },
    { id: 'shopping', label: 'Shopping', Icon: ShoppingCart },
    { id: 'phone', label: 'Phone/Internet', Icon: Phone },
    { id: 'health', label: 'Health', Icon: Heart },
    { id: 'education', label: 'Education', Icon: GraduationCap },
    { id: 'other', label: 'Other', Icon: Package },
];

const ALL_CATEGORIES = [...BUSINESS_CATEGORIES, ...PERSONAL_CATEGORIES];

export const ExpensesScreen: React.FC = () => {
    const { expenses, addExpense, updateExpense, deleteExpense, settings, contacts } = useApp();
    const { colors } = useTheme();
    const [modalVisible, setModalVisible] = useState(false);
    const [datePickerVisible, setDatePickerVisible] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [category, setCategory] = useState('other');
    const [vendorName, setVendorName] = useState('');
    const [vendorId, setVendorId] = useState('');
    const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [dateInputValue, setDateInputValue] = useState('');
    const [isOCRVisible, setIsOCRVisible] = useState(false);
    const slideAnim = useRef(new Animated.Value(100)).current;

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

    const handleAdd = () => {
        setEditingExpense(null);
        setAmount('');
        setNote('');
        setCategory('other');
        setVendorName('');
        setVendorId('');
        setModalVisible(true);
    };

    const handleEdit = (expense: Expense) => {
        setEditingExpense(expense);
        setAmount(expense.amount.toString());
        setNote(expense.note);
        setCategory(expense.category);
        setVendorName(expense.vendorName || '');
        setVendorId(expense.vendorId || '');
        setModalVisible(true);
    };

    const handleDelete = (id: string) => {
        Alert.alert('Delete Expense', 'Are you sure you want to delete this expense?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteExpense(id) },
        ]);
    };

    const handleSave = async () => {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }

        if (editingExpense) {
            await updateExpense(editingExpense.id, { amount: parsedAmount, note, category, vendorName, vendorId });
        } else {
            await addExpense({ date: selectedDate || today, amount: parsedAmount, note, category, vendorName, vendorId });
        }
        setModalVisible(false);
    };

    const handleOCRScan = (text: string) => {
        setIsOCRVisible(false);
        const parsed = parseReceiptText(text);

        setAmount(parsed.amount?.toString() || '');
        setCategory(parsed.category || 'other');
        setNote(parsed.note || '');
        if (parsed.date) {
            setSelectedDate(parsed.date);
        }
        setModalVisible(true);
    };

    const handleFilterChange = (filter: DateFilterType) => {
        setDateFilter(filter);
        setSelectedDate(null); // Clear specific date when changing filter
    };

    const handleCalendarPress = () => {
        setDateInputValue(selectedDate || today);
        setDatePickerVisible(true);
    };

    const handleDateSelect = () => {
        // Validate date format (YYYY-MM-DD)
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

    // Filter expenses based on selected filter and date
    const filteredExpenses = filterByDateRange(expenses, dateFilter, selectedDate)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalFiltered = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

    const getCategoryInfo = (catId: string) => {
        return ALL_CATEGORIES.find((c) => c.id === catId) || ALL_CATEGORIES[ALL_CATEGORIES.length - 1];
    };

    // Group expenses by category for summary
    const categoryBreakdown = useMemo(() => {
        const breakdown: { [key: string]: number } = {};
        filteredExpenses.forEach((expense) => {
            if (!breakdown[expense.category]) {
                breakdown[expense.category] = 0;
            }
            breakdown[expense.category] += expense.amount;
        });
        return Object.entries(breakdown)
            .map(([catId, amount]) => ({
                ...getCategoryInfo(catId),
                amount,
            }))
            .sort((a, b) => b.amount - a.amount);
    }, [filteredExpenses]);

    const renderExpenseItem = ({ item }: { item: Expense }) => {
        const catInfo = getCategoryInfo(item.category);
        const isToday = item.date === today;

        // Build subtitle parts
        const subtitleParts: string[] = [];
        if (item.note) subtitleParts.push(item.note);
        if (!isToday) subtitleParts.push(new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));

        return (
            <Pressable
                style={styles.listItem}
                onPress={() => handleEdit(item)}
                onLongPress={() => handleDelete(item.id)}
            >
                {/* Row 1: Category + Amount */}
                <View style={styles.listRow}>
                    <View style={styles.categoryIcon}>
                        <catInfo.Icon size={20} color={colors.text.primary} strokeWidth={2} />
                    </View>
                    <View style={styles.listInfo}>
                        <Text style={styles.listName} numberOfLines={1} ellipsizeMode="tail">
                            {catInfo.label}
                        </Text>
                        <Text style={styles.listAmount}>
                            {currency} {item.amount.toLocaleString()}
                        </Text>
                    </View>
                </View>

                {/* Vendor name if present */}
                {item.vendorName ? (
                    <Text style={styles.vendorLabel}>{item.vendorName}</Text>
                ) : null}

                {/* Row 2: Note, date */}
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
                    <Text style={styles.title}>Expenses</Text>
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
                    <Text style={styles.totalLabel}>{getFilterLabel(dateFilter, selectedDate)} Total</Text>
                    <Text style={styles.totalAmount}>{currency} {totalFiltered.toLocaleString()}</Text>
                </Card>

                <FlatList
                    data={filteredExpenses}
                    keyExtractor={(item) => item.id}
                    renderItem={renderExpenseItem}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Wallet size={48} color={colors.text.muted} strokeWidth={1.5} />
                            <Text style={styles.emptyText}>No expenses found</Text>
                            <Text style={styles.emptySubtext}>
                                {dateFilter === 'today' ? 'Tap the button below to add an expense' : 'Try a different date range'}
                            </Text>
                        </View>
                    }
                />
            </Animated.View>

            <View style={styles.buttonContainer}>
                <Pressable
                    style={({ pressed }) => [styles.scanButton, pressed && styles.floatingButtonPressed]}
                    onPress={() => setIsOCRVisible(true)}
                >
                    <Scan color={colors.text.inverse} size={20} />
                </Pressable>
                <Pressable
                    style={({ pressed }) => [styles.floatingButton, pressed && styles.floatingButtonPressed]}
                    onPress={handleAdd}
                >
                    <Text style={styles.floatingButtonText}>+ Add Expense</Text>
                </Pressable>
            </View>

            {/* OCR Scanner Modal */}
            <Modal visible={isOCRVisible} animationType="slide" transparent={false}>
                <OCRScanner
                    colors={colors}
                    onClose={() => setIsOCRVisible(false)}
                    onScan={handleOCRScan}
                />
            </Modal>

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

            <Modal visible={modalVisible} animationType="slide" transparent={true}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
                    <View style={styles.bottomSheet}>
                        <View style={styles.handleContainer}><View style={styles.handleBar} /></View>
                        <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
                            <View style={styles.sheetContent}>
                                <Text style={styles.modalTitle}>{editingExpense ? 'Edit Expense' : 'Add Expense'}</Text>

                                {/* Business Categories */}
                                <Text style={styles.categoryGroupLabel}>📦 Business</Text>
                                <View style={styles.categoryGrid}>
                                    {BUSINESS_CATEGORIES.map((cat) => (
                                        <TouchableOpacity
                                            key={cat.id}
                                            style={[styles.categoryItem, category === cat.id && styles.categorySelected]}
                                            onPress={() => setCategory(cat.id)}
                                        >
                                            <cat.Icon size={18} color={category === cat.id ? colors.text.inverse : colors.text.primary} strokeWidth={2} />
                                            <Text style={[styles.categoryItemLabel, category === cat.id && styles.categoryItemLabelSelected]} numberOfLines={1}>{cat.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Personal Categories */}
                                <Text style={styles.categoryGroupLabel}>🏠 Personal</Text>
                                <View style={styles.categoryGrid}>
                                    {PERSONAL_CATEGORIES.map((cat) => (
                                        <TouchableOpacity
                                            key={cat.id}
                                            style={[styles.categoryItem, category === cat.id && styles.categorySelected]}
                                            onPress={() => setCategory(cat.id)}
                                        >
                                            <cat.Icon size={18} color={category === cat.id ? colors.text.inverse : colors.text.primary} strokeWidth={2} />
                                            <Text style={[styles.categoryItemLabel, category === cat.id && styles.categoryItemLabelSelected]} numberOfLines={1}>{cat.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <Text style={styles.categoryGroupLabel}>🤝 Vendor/Contact</Text>
                                <ContactPicker
                                    contacts={contacts}
                                    colors={colors}
                                    filterType="Vendor"
                                    onSelect={(contact: Contact) => {
                                        setVendorName(contact.name);
                                        setVendorId(contact.id);
                                    }}
                                />

                                <Input
                                    label="Vendor Name (Manual)"
                                    placeholder="Enter vendor name"
                                    value={vendorName}
                                    onChangeText={setVendorName}
                                />

                                <Input label="Amount" placeholder="Enter amount" keyboardType="numeric" value={amount} onChangeText={setAmount} />
                                <Input label="Note (optional)" placeholder="Enter note" value={note} onChangeText={setNote} />
                                <View style={styles.modalButtons}>
                                    <Pressable style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setModalVisible(false)}>
                                        <Text style={styles.cancelBtnText}>Cancel</Text>
                                    </Pressable>
                                    <Pressable style={[styles.modalBtn, styles.saveBtn]} onPress={handleSave}>
                                        <Text style={styles.saveBtnText}>Save</Text>
                                    </Pressable>
                                </View>
                            </View>
                        </ScrollView>
                    </View>
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
    totalCard: { backgroundColor: colors.brand.primary, marginBottom: tokens.spacing.md },
    totalLabel: { fontSize: tokens.typography.sizes.sm, color: colors.text.inverse, fontFamily: tokens.typography.fontFamily.regular },
    totalAmount: { fontSize: tokens.typography.sizes.xxl, color: colors.text.inverse, fontFamily: tokens.typography.fontFamily.bold },
    // Compact List Item Styles (matching Sales screen)
    listItem: {
        paddingVertical: 10,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.default,
    },
    listRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    categoryIcon: { width: 40, height: 40, borderRadius: tokens.radius.md, backgroundColor: colors.semantic.soft, justifyContent: 'center', alignItems: 'center', marginRight: tokens.spacing.sm },
    listInfo: {
        flex: 1,
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
    listAmount: {
        fontSize: 14,
        color: colors.brand.secondary,
        fontFamily: tokens.typography.fontFamily.bold,
    },
    listSubtitle: {
        fontSize: 12,
        color: colors.text.muted,
        fontFamily: tokens.typography.fontFamily.regular,
        marginTop: 2,
        marginLeft: 52, // Align with text after icon
    },
    emptyContainer: { alignItems: 'center', paddingVertical: tokens.spacing.xxl },
    emptyIcon: { fontSize: 48, marginBottom: tokens.spacing.md },
    emptyText: { fontSize: tokens.typography.sizes.lg, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.medium },
    emptySubtext: { fontSize: tokens.typography.sizes.sm, color: colors.text.muted, marginTop: tokens.spacing.xs, fontFamily: tokens.typography.fontFamily.regular },
    listContent: { paddingBottom: 160 },
    buttonContainer: {
        position: 'absolute',
        bottom: 110,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: tokens.spacing.md,
    },
    floatingButton: {
        backgroundColor: colors.brand.primary,
        height: 52,
        flex: 1,
        maxWidth: 240,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: tokens.spacing.lg,
        ...tokens.shadow.floatingButton,
    },
    scanButton: {
        backgroundColor: colors.brand.secondary,
        height: 52,
        width: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        ...tokens.shadow.floatingButton,
    },
    floatingButtonPressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },
    floatingButtonText: { color: colors.text.inverse, fontSize: tokens.typography.sizes.lg, fontFamily: tokens.typography.fontFamily.semibold },
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    bottomSheet: { backgroundColor: colors.semantic.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%' },
    handleContainer: { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
    handleBar: { width: 40, height: 4, backgroundColor: colors.border.default, borderRadius: 2 },
    sheetContent: { padding: tokens.spacing.lg, paddingBottom: tokens.spacing.xxl },
    modalTitle: { fontSize: tokens.typography.sizes.xl, color: colors.text.primary, marginBottom: tokens.spacing.md, textAlign: 'center', fontFamily: tokens.typography.fontFamily.bold },
    categoryLabel: { fontSize: tokens.typography.sizes.sm, color: colors.text.primary, marginBottom: tokens.spacing.xs, fontFamily: tokens.typography.fontFamily.medium },
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: tokens.spacing.md },
    categoryItem: { width: '31%', padding: tokens.spacing.xs, marginRight: '2%', marginBottom: tokens.spacing.xs, borderRadius: tokens.radius.sm, backgroundColor: colors.semantic.soft, alignItems: 'center' },
    categorySelected: { backgroundColor: colors.brand.primary },
    categoryItemIcon: { fontSize: 20 },
    categoryItemLabel: { fontSize: tokens.typography.sizes.xs, color: colors.text.primary, textAlign: 'center', fontFamily: tokens.typography.fontFamily.regular },
    categoryItemLabelSelected: { color: colors.text.inverse },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: tokens.spacing.lg, gap: 12 },
    modalBtn: { flex: 1, paddingVertical: 14, borderRadius: tokens.radius.md, alignItems: 'center' },
    cancelBtn: { backgroundColor: colors.semantic.background },
    cancelBtnText: { fontSize: tokens.typography.sizes.md, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.semibold },
    saveBtn: { backgroundColor: colors.brand.primary },
    saveBtnText: { fontSize: tokens.typography.sizes.md, color: colors.text.inverse, fontFamily: tokens.typography.fontFamily.semibold },
    expenseDate: { fontSize: tokens.typography.sizes.xs, color: colors.brand.primary, marginTop: 2, fontFamily: tokens.typography.fontFamily.medium },
    vendorLabel: {
        fontSize: 12,
        color: colors.brand.primary,
        fontFamily: tokens.typography.fontFamily.medium,
        marginLeft: 52,
        marginTop: -2,
        marginBottom: 2,
    },
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

export default ExpensesScreen;
