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
import { Sale } from '../utils/storage';

export const SalesScreen: React.FC = () => {
    const { sales, addSale, updateSale, deleteSale, settings } = useApp();
    const [modalVisible, setModalVisible] = useState(false);
    const [editingSale, setEditingSale] = useState<Sale | null>(null);
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
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
        setEditingSale(null);
        setAmount('');
        setNote('');
        setModalVisible(true);
    };

    const handleEdit = (sale: Sale) => {
        setEditingSale(sale);
        setAmount(sale.amount.toString());
        setNote(sale.note);
        setModalVisible(true);
    };

    const handleDelete = (id: string) => {
        Alert.alert('Delete Sale', 'Are you sure you want to delete this sale?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteSale(id) },
        ]);
    };

    const handleSave = async () => {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }

        if (editingSale) {
            await updateSale(editingSale.id, { amount: parsedAmount, note });
        } else {
            await addSale({ date: today, amount: parsedAmount, note });
        }
        setModalVisible(false);
    };

    const todaySales = sales.filter((s) => s.date === today);
    const totalToday = todaySales.reduce((sum, s) => sum + s.amount, 0);

    const renderSaleItem = ({ item }: { item: Sale }) => (
        <Card style={styles.saleCard}>
            <View style={styles.saleRow}>
                <View style={styles.saleInfo}>
                    <Text style={styles.saleAmount}>
                        {currency} {item.amount.toLocaleString()}
                    </Text>
                    {item.note ? <Text style={styles.saleNote}>{item.note}</Text> : null}
                </View>
                <View style={styles.saleActions}>
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

    return (
        <SafeAreaView style={styles.container}>
            <Animated.View style={[styles.content, { transform: [{ translateY: slideAnim }] }]}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Sales</Text>
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

                {/* Sales List */}
                <FlatList
                    data={todaySales}
                    keyExtractor={(item) => item.id}
                    renderItem={renderSaleItem}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>📊</Text>
                            <Text style={styles.emptyText}>No sales recorded today</Text>
                            <Text style={styles.emptySubtext}>Tap the button below to add your first sale</Text>
                        </View>
                    }
                />

                {/* Add Button */}
                <View style={styles.addBtnContainer}>
                    <Button title="+ Add Sale" onPress={handleAdd} />
                </View>
            </Animated.View>

            {/* Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {editingSale ? 'Edit Sale' : 'Add Sale'}
                        </Text>
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
        backgroundColor: tokens.colors.semantic.success,
        marginBottom: tokens.spacing.md,
    },
    totalLabel: {
        fontSize: tokens.typography.sizes.sm,
        color: tokens.colors.brand.secondary,
    },
    totalAmount: {
        fontSize: tokens.typography.sizes.xxl,
        fontWeight: tokens.typography.weight.bold,
        color: tokens.colors.brand.secondary,
    },
    saleCard: {
        marginBottom: tokens.spacing.sm,
    },
    saleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    saleInfo: {
        flex: 1,
    },
    saleAmount: {
        fontSize: tokens.typography.sizes.lg,
        fontWeight: tokens.typography.weight.semibold,
        color: tokens.colors.text.primary,
    },
    saleNote: {
        fontSize: tokens.typography.sizes.sm,
        color: tokens.colors.text.secondary,
        marginTop: tokens.spacing.xxs,
    },
    saleActions: {
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
    },
    modalTitle: {
        fontSize: tokens.typography.sizes.xl,
        fontWeight: tokens.typography.weight.bold,
        color: tokens.colors.text.primary,
        marginBottom: tokens.spacing.lg,
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

export default SalesScreen;
