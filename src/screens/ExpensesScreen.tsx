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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Input } from '../components';
import { tokens, useTheme } from '../theme';
import { useApp } from '../context';
import { Expense } from '../utils/storage';

const CATEGORIES = [
    { id: 'food', label: 'Food & Dining', icon: '🍔' },
    { id: 'transport', label: 'Transport', icon: '🚗' },
    { id: 'shopping', label: 'Shopping', icon: '🛒' },
    { id: 'utilities', label: 'Utilities', icon: '💡' },
    { id: 'rent', label: 'Rent', icon: '🏠' },
    { id: 'salary', label: 'Salary', icon: '💼' },
    { id: 'other', label: 'Other', icon: '📦' },
];

export const ExpensesScreen: React.FC = () => {
    const { expenses, addExpense, updateExpense, deleteExpense, settings } = useApp();
    const { colors } = useTheme();
    const [modalVisible, setModalVisible] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [category, setCategory] = useState('other');
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
        setModalVisible(true);
    };

    const handleEdit = (expense: Expense) => {
        setEditingExpense(expense);
        setAmount(expense.amount.toString());
        setNote(expense.note);
        setCategory(expense.category);
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
            await updateExpense(editingExpense.id, { amount: parsedAmount, note, category });
        } else {
            await addExpense({ date: today, amount: parsedAmount, note, category });
        }
        setModalVisible(false);
    };

    const todayExpenses = expenses.filter((e) => e.date === today);
    const totalToday = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

    const getCategoryInfo = (catId: string) => {
        return CATEGORIES.find((c) => c.id === catId) || CATEGORIES[CATEGORIES.length - 1];
    };

    const renderExpenseItem = ({ item }: { item: Expense }) => {
        const catInfo = getCategoryInfo(item.category);
        return (
            <Card style={styles.expenseCard}>
                <View style={styles.expenseRow}>
                    <View style={styles.categoryIcon}>
                        <Text style={styles.iconText}>{catInfo.icon}</Text>
                    </View>
                    <View style={styles.expenseInfo}>
                        <Text style={styles.expenseCategory}>{catInfo.label}</Text>
                        <Text style={styles.expenseAmount}>{currency} {item.amount.toLocaleString()}</Text>
                        {item.note ? <Text style={styles.expenseNote}>{item.note}</Text> : null}
                    </View>
                    <View style={styles.expenseActions}>
                        <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionBtn}>
                            <Text>✏️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
                            <Text>🗑️</Text>
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
                    <Text style={styles.title}>Expenses</Text>
                    <Text style={styles.date}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
                </View>

                <Card style={styles.totalCard}>
                    <Text style={styles.totalLabel}>Today's Total</Text>
                    <Text style={styles.totalAmount}>{currency} {totalToday.toLocaleString()}</Text>
                </Card>

                <FlatList
                    data={todayExpenses}
                    keyExtractor={(item) => item.id}
                    renderItem={renderExpenseItem}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>💸</Text>
                            <Text style={styles.emptyText}>No expenses recorded today</Text>
                            <Text style={styles.emptySubtext}>Tap the button below to add an expense</Text>
                        </View>
                    }
                />
            </Animated.View>

            <Pressable style={({ pressed }) => [styles.floatingButton, pressed && styles.floatingButtonPressed]} onPress={handleAdd}>
                <Text style={styles.floatingButtonText}>+ Add Expense</Text>
            </Pressable>

            <Modal visible={modalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
                    <View style={styles.bottomSheet}>
                        <View style={styles.handleContainer}><View style={styles.handleBar} /></View>
                        <View style={styles.sheetContent}>
                            <Text style={styles.modalTitle}>{editingExpense ? 'Edit Expense' : 'Add Expense'}</Text>
                            <Text style={styles.categoryLabel}>Category</Text>
                            <View style={styles.categoryGrid}>
                                {CATEGORIES.map((cat) => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[styles.categoryItem, category === cat.id && styles.categorySelected]}
                                        onPress={() => setCategory(cat.id)}
                                    >
                                        <Text style={styles.categoryItemIcon}>{cat.icon}</Text>
                                        <Text style={[styles.categoryItemLabel, category === cat.id && styles.categoryItemLabelSelected]}>{cat.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
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
                    </View>
                </View>
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
    expenseCard: { marginBottom: tokens.spacing.sm, backgroundColor: colors.semantic.surface },
    expenseRow: { flexDirection: 'row', alignItems: 'center' },
    categoryIcon: { width: 44, height: 44, borderRadius: tokens.radius.md, backgroundColor: colors.semantic.soft, justifyContent: 'center', alignItems: 'center', marginRight: tokens.spacing.sm },
    iconText: { fontSize: 22 },
    expenseInfo: { flex: 1 },
    expenseCategory: { fontSize: tokens.typography.sizes.sm, color: colors.text.secondary, fontFamily: tokens.typography.fontFamily.regular },
    expenseAmount: { fontSize: tokens.typography.sizes.lg, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.semibold },
    expenseNote: { fontSize: tokens.typography.sizes.xs, color: colors.text.muted, marginTop: tokens.spacing.xxs, fontFamily: tokens.typography.fontFamily.regular },
    expenseActions: { flexDirection: 'row' },
    actionBtn: { padding: tokens.spacing.xs },
    emptyContainer: { alignItems: 'center', paddingVertical: tokens.spacing.xxl },
    emptyIcon: { fontSize: 48, marginBottom: tokens.spacing.md },
    emptyText: { fontSize: tokens.typography.sizes.lg, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.medium },
    emptySubtext: { fontSize: tokens.typography.sizes.sm, color: colors.text.muted, marginTop: tokens.spacing.xs, fontFamily: tokens.typography.fontFamily.regular },
    listContent: { paddingBottom: 160 },
    floatingButton: { position: 'absolute', bottom: 96, alignSelf: 'center', backgroundColor: colors.brand.primary, height: 56, minWidth: 220, borderRadius: 28, justifyContent: 'center', alignItems: 'center', paddingHorizontal: tokens.spacing.lg, ...tokens.shadow.floatingButton },
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
});

export default ExpensesScreen;
