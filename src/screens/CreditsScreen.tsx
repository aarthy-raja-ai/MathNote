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
import { Credit } from '../utils/storage';

export const CreditsScreen: React.FC = () => {
    const { credits, addCredit, updateCredit, deleteCredit, settings } = useApp();
    const [modalVisible, setModalVisible] = useState(false);
    const [editingCredit, setEditingCredit] = useState<Credit | null>(null);
    const [amount, setAmount] = useState('');
    const [party, setParty] = useState('');
    const [type, setType] = useState<'given' | 'taken'>('given');
    const [filter, setFilter] = useState<'all' | 'given' | 'taken'>('all');
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const today = new Date().toISOString().split('T')[0];
    const currency = settings.currency;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: tokens.motion.duration.slow,
            useNativeDriver: true,
        }).start();
    }, [fadeAnim]);

    const handleAdd = () => {
        setEditingCredit(null);
        setAmount('');
        setParty('');
        setType('given');
        setModalVisible(true);
    };

    const handleEdit = (credit: Credit) => {
        setEditingCredit(credit);
        setAmount(credit.amount.toString());
        setParty(credit.party);
        setType(credit.type);
        setModalVisible(true);
    };

    const handleDelete = (id: string) => {
        Alert.alert('Delete Credit', 'Are you sure you want to delete this credit?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteCredit(id) },
        ]);
    };

    const handleToggleStatus = async (credit: Credit) => {
        const newStatus = credit.status === 'pending' ? 'paid' : 'pending';
        await updateCredit(credit.id, { status: newStatus });
    };

    const handleSave = async () => {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }
        if (!party.trim()) {
            Alert.alert('Error', 'Please enter a party name');
            return;
        }

        if (editingCredit) {
            await updateCredit(editingCredit.id, { amount: parsedAmount, party, type });
        } else {
            await addCredit({ date: today, amount: parsedAmount, party, type, status: 'pending' });
        }
        setModalVisible(false);
    };

    const filteredCredits = credits.filter((c) => {
        if (filter === 'all') return true;
        return c.type === filter;
    });

    const pendingGiven = credits
        .filter((c) => c.type === 'given' && c.status === 'pending')
        .reduce((sum, c) => sum + c.amount, 0);

    const pendingTaken = credits
        .filter((c) => c.type === 'taken' && c.status === 'pending')
        .reduce((sum, c) => sum + c.amount, 0);

    const renderCreditItem = ({ item }: { item: Credit }) => (
        <Card style={[styles.creditCard, item.status === 'paid' && styles.paidCard]}>
            <View style={styles.creditRow}>
                <View style={styles.typeIcon}>
                    <Text style={styles.iconText}>{item.type === 'given' ? '📤' : '📥'}</Text>
                </View>
                <View style={styles.creditInfo}>
                    <Text style={styles.partyName}>{item.party}</Text>
                    <Text style={[
                        styles.creditAmount,
                        item.type === 'given' ? styles.givenAmount : styles.takenAmount,
                    ]}>
                        {currency} {item.amount.toLocaleString()}
                    </Text>
                    <Text style={styles.creditDate}>
                        {new Date(item.date).toLocaleDateString('en-IN')}
                    </Text>
                </View>
                <View style={styles.creditActions}>
                    <TouchableOpacity
                        onPress={() => handleToggleStatus(item)}
                        style={[styles.statusBtn, item.status === 'paid' && styles.statusPaid]}
                    >
                        <Text style={styles.statusText}>
                            {item.status === 'pending' ? '⏳' : '✅'}
                        </Text>
                    </TouchableOpacity>
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

    return (
        <SafeAreaView style={styles.container}>
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Credits</Text>
                    <Text style={styles.subtitle}>Track given & taken amounts</Text>
                </View>

                {/* Summary Cards */}
                <View style={styles.summaryRow}>
                    <Card style={styles.givenCard}>
                        <Text style={styles.summaryLabel}>To Receive</Text>
                        <Text style={styles.summaryAmount}>
                            {currency} {pendingGiven.toLocaleString()}
                        </Text>
                    </Card>
                    <Card style={styles.takenCard}>
                        <Text style={styles.summaryLabel}>To Pay</Text>
                        <Text style={styles.summaryAmount}>
                            {currency} {pendingTaken.toLocaleString()}
                        </Text>
                    </Card>
                </View>

                {/* Filter Tabs */}
                <View style={styles.filterTabs}>
                    {(['all', 'given', 'taken'] as const).map((f) => (
                        <TouchableOpacity
                            key={f}
                            style={[styles.filterTab, filter === f && styles.filterActive]}
                            onPress={() => setFilter(f)}
                        >
                            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Credits List */}
                <FlatList
                    data={filteredCredits}
                    keyExtractor={(item) => item.id}
                    renderItem={renderCreditItem}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>🤝</Text>
                            <Text style={styles.emptyText}>No credits yet</Text>
                            <Text style={styles.emptySubtext}>Add credits given or taken</Text>
                        </View>
                    }
                />

                {/* Add Button */}
                <View style={styles.addBtnContainer}>
                    <Button title="+ Add Credit" onPress={handleAdd} />
                </View>
            </Animated.View>

            {/* Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {editingCredit ? 'Edit Credit' : 'Add Credit'}
                        </Text>

                        {/* Type Selector */}
                        <View style={styles.typeSelector}>
                            <TouchableOpacity
                                style={[styles.typeOption, type === 'given' && styles.typeSelected]}
                                onPress={() => setType('given')}
                            >
                                <Text style={styles.typeIcon}>📤</Text>
                                <Text style={styles.typeLabel}>Given</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.typeOption, type === 'taken' && styles.typeSelected]}
                                onPress={() => setType('taken')}
                            >
                                <Text style={styles.typeIcon}>📥</Text>
                                <Text style={styles.typeLabel}>Taken</Text>
                            </TouchableOpacity>
                        </View>

                        <Input
                            label="Party Name"
                            placeholder="Enter name"
                            value={party}
                            onChangeText={setParty}
                        />
                        <Input
                            label="Amount"
                            placeholder="Enter amount"
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={setAmount}
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
    subtitle: {
        fontSize: tokens.typography.sizes.sm,
        color: tokens.colors.text.secondary,
    },
    summaryRow: {
        flexDirection: 'row',
        gap: tokens.spacing.sm,
        marginBottom: tokens.spacing.md,
    },
    givenCard: {
        flex: 1,
        backgroundColor: tokens.colors.semantic.success,
    },
    takenCard: {
        flex: 1,
        backgroundColor: tokens.colors.brand.primary,
    },
    summaryLabel: {
        fontSize: tokens.typography.sizes.sm,
        color: tokens.colors.brand.secondary,
    },
    summaryAmount: {
        fontSize: tokens.typography.sizes.xl,
        fontWeight: tokens.typography.weight.bold,
        color: tokens.colors.brand.secondary,
    },
    filterTabs: {
        flexDirection: 'row',
        marginBottom: tokens.spacing.md,
        backgroundColor: tokens.colors.semantic.soft,
        borderRadius: tokens.radius.pill,
        padding: tokens.spacing.xxs,
    },
    filterTab: {
        flex: 1,
        paddingVertical: tokens.spacing.xs,
        alignItems: 'center',
        borderRadius: tokens.radius.pill,
    },
    filterActive: {
        backgroundColor: tokens.colors.brand.primary,
    },
    filterText: {
        fontSize: tokens.typography.sizes.sm,
        color: tokens.colors.text.secondary,
        fontWeight: tokens.typography.weight.medium,
    },
    filterTextActive: {
        color: tokens.colors.text.inverse,
    },
    creditCard: {
        marginBottom: tokens.spacing.sm,
    },
    paidCard: {
        opacity: 0.6,
    },
    creditRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    typeIcon: {
        width: 40,
        height: 40,
        borderRadius: tokens.radius.md,
        backgroundColor: tokens.colors.semantic.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: tokens.spacing.sm,
    },
    iconText: {
        fontSize: 20,
    },
    creditInfo: {
        flex: 1,
    },
    partyName: {
        fontSize: tokens.typography.sizes.md,
        fontWeight: tokens.typography.weight.semibold,
        color: tokens.colors.text.primary,
    },
    creditAmount: {
        fontSize: tokens.typography.sizes.lg,
        fontWeight: tokens.typography.weight.bold,
    },
    givenAmount: {
        color: tokens.colors.semantic.success,
    },
    takenAmount: {
        color: tokens.colors.brand.primary,
    },
    creditDate: {
        fontSize: tokens.typography.sizes.xs,
        color: tokens.colors.text.muted,
    },
    creditActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusBtn: {
        padding: tokens.spacing.xs,
    },
    statusPaid: {
        opacity: 0.5,
    },
    statusText: {
        fontSize: 18,
    },
    actionBtn: {
        padding: tokens.spacing.xs,
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
    typeSelector: {
        flexDirection: 'row',
        marginBottom: tokens.spacing.md,
        gap: tokens.spacing.sm,
    },
    typeOption: {
        flex: 1,
        padding: tokens.spacing.md,
        borderRadius: tokens.radius.md,
        backgroundColor: tokens.colors.semantic.soft,
        alignItems: 'center',
    },
    typeSelected: {
        backgroundColor: tokens.colors.brand.primary,
    },
    typeLabel: {
        fontSize: tokens.typography.sizes.sm,
        color: tokens.colors.text.primary,
        marginTop: tokens.spacing.xxs,
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

export default CreditsScreen;
