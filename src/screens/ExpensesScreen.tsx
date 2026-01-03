import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Animated,
    Modal,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button, Input } from '../components';
import { tokens } from '../theme';
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
    const [modalVisible, setModalVisible] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [category, setCategory] = useState('other');
    const slideAnim = useRef(new Animated.Value(100)).current;

    const today = new Date().toISOString().split('T')[0];
    const currency = settings.currency;

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
                        <Text style={styles.expenseAmount}>
                            {currency} {item.amount.toLocaleString()}
                        </Text>
                        {item.note ? <Text style={styles.expenseNote}>{item.note}</Text> : null}
                    </View>
                    <View style={styles.expenseActions}>
                        <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionBtn}>
                            <Text style={styles.editBtn}>✏️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
                            <Text style={styles.deleteBtn}>🗑️</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Card>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <Animated.View style={[styles.content, { transform: [{ translateY: slideAnim }] }]}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Expenses</Text>
                    <Text style={styles.date}>{new Date().toLocaleDateString('en-IN', {
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                    })}</Text>
                </View>

                {/* Today's Total */}
                <Card style={styles.totalCard}>
                    <Text style={styles.totalLabel}>Today's Total</Text>
                    <Text style={styles.totalAmount}>
                        {currency} {totalToday.toLocaleString()}
                    </Text>
                </Card>

                {/* Expenses List */}
                <FlatList
                    data={todayExpenses}
                    keyExtractor={(item) => item.id}
                    renderItem={renderExpenseItem}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>💸</Text>
                            <Text style={styles.emptyText}>No expenses recorded today</Text>
                            <Text style={styles.emptySubtext}>Tap the button below to add an expense</Text>
                        </View>
                    }
                />

                {/* Add Button */}
                <View style={styles.addBtnContainer}>
                    <Button title="+ Add Expense" onPress={handleAdd} />
                </View>
            </Animated.View>

            {/* Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {editingExpense ? 'Edit Expense' : 'Add Expense'}
                        </Text>

                        {/* Category Selector */}
                        <Text style={styles.categoryLabel}>Category</Text>
                        <View style={styles.categoryGrid}>
                            {CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.categoryItem,
                                        category === cat.id && styles.categorySelected,
                                    ]}
                                    onPress={() => setCategory(cat.id)}
                                >
                                    <Text style={styles.categoryItemIcon}>{cat.icon}</Text>
                                    <Text style={styles.categoryItemLabel}>{cat.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Input
                            label="Amount"
                            placeholder="Enter amount"
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={setAmount}
                        />
                        <Input
                            label="Note (optional)"
                            placeholder="Enter note"
                            value={note}
                            onChangeText={setNote}
                        />
                        <View style={styles.modalButtons}>
                            <Button
                                title="Cancel"
                                variant="secondary"
                                onPress={() => setModalVisible(false)}
                                style={styles.modalBtn}
                            />
                            <Button
                                title="Save"
                                onPress={handleSave}
                                style={styles.modalBtn}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: tokens.colors.semantic.background,
    },
    content: {
        flex: 1,
        paddingHorizontal: tokens.spacing.md,
    },
    header: {
        paddingTop: tokens.spacing.md,
        paddingBottom: tokens.spacing.md,
    },
    title: {
        fontSize: tokens.typography.sizes.xxl,
        fontWeight: tokens.typography.weight.bold,
        color: tokens.colors.brand.secondary,
    },
    date: {
        fontSize: tokens.typography.sizes.sm,
        color: tokens.colors.text.secondary,
        marginTop: tokens.spacing.xxs,
    },
    totalCard: {
        backgroundColor: tokens.colors.brand.primary,
        marginBottom: tokens.spacing.md,
    },
    totalLabel: {
        fontSize: tokens.typography.sizes.sm,
        color: tokens.colors.text.inverse,
    },
    totalAmount: {
        fontSize: tokens.typography.sizes.xxl,
        fontWeight: tokens.typography.weight.bold,
        color: tokens.colors.text.inverse,
    },
    expenseCard: {
        marginBottom: tokens.spacing.sm,
    },
    expenseRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    categoryIcon: {
        width: 44,
        height: 44,
        borderRadius: tokens.radius.md,
        backgroundColor: tokens.colors.semantic.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: tokens.spacing.sm,
    },
    iconText: {
        fontSize: 22,
    },
    expenseInfo: {
        flex: 1,
    },
    expenseCategory: {
        fontSize: tokens.typography.sizes.sm,
        color: tokens.colors.text.secondary,
    },
    expenseAmount: {
        fontSize: tokens.typography.sizes.lg,
        fontWeight: tokens.typography.weight.semibold,
        color: tokens.colors.text.primary,
    },
    expenseNote: {
        fontSize: tokens.typography.sizes.xs,
        color: tokens.colors.text.muted,
        marginTop: tokens.spacing.xxs,
    },
    expenseActions: {
        flexDirection: 'row',
    },
    actionBtn: {
        padding: tokens.spacing.xs,
    },
    editBtn: {
        fontSize: 18,
    },
    deleteBtn: {
        fontSize: 18,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: tokens.spacing.xxl,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: tokens.spacing.md,
    },
    emptyText: {
        fontSize: tokens.typography.sizes.lg,
        fontWeight: tokens.typography.weight.medium,
        color: tokens.colors.text.primary,
    },
    emptySubtext: {
        fontSize: tokens.typography.sizes.sm,
        color: tokens.colors.text.muted,
        marginTop: tokens.spacing.xs,
    },
    addBtnContainer: {
        paddingVertical: tokens.spacing.md,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: tokens.colors.semantic.surface,
        borderTopLeftRadius: tokens.radius.lg,
        borderTopRightRadius: tokens.radius.lg,
        padding: tokens.spacing.lg,
        paddingBottom: tokens.spacing.xxl,
        maxHeight: '85%',
    },
    modalTitle: {
        fontSize: tokens.typography.sizes.xl,
        fontWeight: tokens.typography.weight.bold,
        color: tokens.colors.text.primary,
        marginBottom: tokens.spacing.md,
        textAlign: 'center',
    },
    categoryLabel: {
        fontSize: tokens.typography.sizes.sm,
        fontWeight: tokens.typography.weight.medium,
        color: tokens.colors.text.primary,
        marginBottom: tokens.spacing.xs,
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: tokens.spacing.md,
    },
    categoryItem: {
        width: '31%',
        padding: tokens.spacing.xs,
        marginRight: '2%',
        marginBottom: tokens.spacing.xs,
        borderRadius: tokens.radius.sm,
        backgroundColor: tokens.colors.semantic.soft,
        alignItems: 'center',
    },
    categorySelected: {
        backgroundColor: tokens.colors.brand.primary,
    },
    categoryItemIcon: {
        fontSize: 20,
    },
    categoryItemLabel: {
        fontSize: tokens.typography.sizes.xs,
        color: tokens.colors.text.primary,
        textAlign: 'center',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: tokens.spacing.md,
    },
    modalBtn: {
        flex: 1,
        marginHorizontal: tokens.spacing.xs,
    },
});

export default ExpensesScreen;
