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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, Link, Pencil, Trash2, PlusCircle, History, Calendar } from 'lucide-react-native';
import { Card, Input } from '../components';
import { tokens, useTheme } from '../theme';
import { useApp } from '../context';
import { Credit, CreditPayment } from '../utils/storage';

export const CreditsScreen: React.FC = () => {
    const { credits, addCredit, updateCredit, deleteCredit, settings, sales, addCreditPayment } = useApp();
    const { colors } = useTheme();
    const [modalVisible, setModalVisible] = useState(false);
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [historyModalVisible, setHistoryModalVisible] = useState(false);
    const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null);
    const [editingCredit, setEditingCredit] = useState<Credit | null>(null);
    const [amount, setAmount] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [party, setParty] = useState('');
    const [type, setType] = useState<'given' | 'taken'>('given');
    const [filter, setFilter] = useState<'all' | 'given' | 'taken'>('all');
    const [dateFilter, setDateFilter] = useState<string>(''); // YYYY-MM-DD
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const today = new Date().toISOString().split('T')[0];
    const currency = settings.currency;
    const styles = useMemo(() => createStyles(colors), [colors]);

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
        if (credit.linkedSaleId) {
            Alert.alert('Linked Credit', 'This credit was auto-created from a partial payment sale. Edit the sale instead.');
            return;
        }
        setEditingCredit(credit);
        setAmount(credit.amount.toString());
        setParty(credit.party);
        setType(credit.type);
        setModalVisible(true);
    };

    const handleDelete = (credit: Credit) => {
        if (credit.linkedSaleId) {
            Alert.alert('Linked Credit', 'This credit is linked to a sale. Delete the sale to remove this credit.');
            return;
        }
        Alert.alert('Delete Credit', 'Are you sure you want to delete this credit?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteCredit(credit.id) },
        ]);
    };

    const handleToggleStatus = async (credit: Credit) => {
        const newStatus = credit.status === 'pending' ? 'paid' : 'pending';
        await updateCredit(credit.id, { status: newStatus });
    };

    const handleRecordPayment = (credit: Credit) => {
        setSelectedCredit(credit);
        setPaymentAmount('');
        setPaymentModalVisible(true);
    };

    const handleViewHistory = (credit: Credit) => {
        setSelectedCredit(credit);
        setHistoryModalVisible(true);
    };

    const handleSavePayment = async () => {
        const parsedAmount = parseFloat(paymentAmount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }
        if (selectedCredit) {
            await addCreditPayment(selectedCredit.id, {
                amount: parsedAmount,
                date: today,
            });
            setPaymentModalVisible(false);
            setSelectedCredit(null);
        }
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
        const matchesType = filter === 'all' || c.type === filter;
        const matchesDate = !dateFilter || c.date === dateFilter;
        return matchesType && matchesDate;
    });

    const pendingGiven = credits.filter((c) => c.type === 'given' && c.status === 'pending').reduce((sum, c) => sum + c.amount, 0);
    const pendingTaken = credits.filter((c) => c.type === 'taken' && c.status === 'pending').reduce((sum, c) => sum + c.amount, 0);

    // Get linked sale for a credit
    const getLinkedSale = (credit: Credit) => {
        if (!credit.linkedSaleId) return null;
        return sales.find((s) => s.id === credit.linkedSaleId);
    };

    const renderCreditItem = ({ item }: { item: Credit }) => {
        const linkedSale = getLinkedSale(item);

        return (
            <Card style={[styles.creditCard, item.status === 'paid' && styles.paidCard]}>
                <View style={styles.creditRow}>
                    <View style={[styles.typeIcon, item.type === 'given' ? styles.givenIcon : styles.takenIcon]}>
                        {item.type === 'given' ? (
                            <ArrowUpRight size={20} color={colors.semantic.success} strokeWidth={2.5} />
                        ) : (
                            <ArrowDownLeft size={20} color={colors.brand.primary} strokeWidth={2.5} />
                        )}
                    </View>
                    <View style={styles.creditInfo}>
                        <View style={styles.partyRow}>
                            <Text style={styles.partyName}>{item.party}</Text>
                            {linkedSale && (
                                <View style={styles.linkedBadge}>
                                    <Link size={10} color={colors.brand.secondary} strokeWidth={2} />
                                    <Text style={styles.linkedText}>Sale</Text>
                                </View>
                            )}
                        </View>
                        <Text style={[styles.creditAmount, item.type === 'given' ? styles.givenAmount : styles.takenAmount]}>
                            {currency} {item.amount.toLocaleString()}
                        </Text>
                        <View style={styles.paymentStatusRow}>
                            <Text style={styles.paidBadge}>Paid: {currency}{item.paidAmount?.toLocaleString() || 0}</Text>
                            <Text style={styles.dueBadge}>Due: {currency}{(item.amount - (item.paidAmount || 0)).toLocaleString()}</Text>
                        </View>
                        <Text style={styles.creditDate}>{new Date(item.date).toLocaleDateString('en-IN')}</Text>
                    </View>
                    <View style={styles.creditActions}>
                        <TouchableOpacity onPress={() => handleRecordPayment(item)} style={styles.actionBtn}>
                            <PlusCircle size={20} color={colors.semantic.success} strokeWidth={2} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleViewHistory(item)} style={styles.actionBtn}>
                            <History size={20} color={colors.brand.secondary} strokeWidth={2} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionBtn}>
                            <Pencil size={18} color={colors.text.muted} strokeWidth={2} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}>
                            <Trash2 size={18} color={colors.text.muted} strokeWidth={2} />
                        </TouchableOpacity>
                    </View>
                </View>
            </Card>

        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                <View style={styles.header}>
                    <Text style={styles.title}>Credits</Text>
                    <Text style={styles.subtitle}>Track given & taken amounts</Text>
                </View>

                <View style={styles.summaryRow}>
                    <Card style={styles.givenCard}>
                        <Text style={styles.summaryLabel}>To Receive</Text>
                        <Text style={styles.summaryAmount}>{currency} {pendingGiven.toLocaleString()}</Text>
                    </Card>
                    <Card style={styles.takenCard}>
                        <Text style={styles.summaryLabelLight}>To Pay</Text>
                        <Text style={styles.summaryAmountLight}>{currency} {pendingTaken.toLocaleString()}</Text>
                    </Card>
                </View>

                <View style={styles.filterTabs}>
                    <View style={styles.filterRow}>
                        <View style={styles.tabsContainer}>
                            {(['all', 'given', 'taken'] as const).map((f) => (
                                <TouchableOpacity key={f} style={[styles.filterTab, filter === f && styles.filterActive]} onPress={() => setFilter(f)}>
                                    <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                                        {f.charAt(0).toUpperCase() + f.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity
                            style={[styles.dateFilterBtn, dateFilter && styles.dateFilterActive]}
                            onPress={() => {
                                if (dateFilter) setDateFilter('');
                                else setDateFilter(today);
                            }}
                        >
                            <Calendar size={18} color={dateFilter ? colors.text.inverse : colors.text.secondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <FlatList
                    data={filteredCredits}
                    keyExtractor={(item) => item.id}
                    renderItem={renderCreditItem}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>🤝</Text>
                            <Text style={styles.emptyText}>No credits yet</Text>
                            <Text style={styles.emptySubtext}>Add credits given or taken</Text>
                        </View>
                    }
                />
            </Animated.View>

            <Pressable style={({ pressed }) => [styles.floatingButton, pressed && styles.floatingButtonPressed]} onPress={handleAdd}>
                <Text style={styles.floatingButtonText}>+ Add Credit</Text>
            </Pressable>

            <Modal visible={modalVisible} animationType="slide" transparent={true}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
                    <View style={styles.bottomSheet}>
                        <View style={styles.handleContainer}><View style={styles.handleBar} /></View>
                        <View style={styles.sheetContent}>
                            <Text style={styles.modalTitle}>{editingCredit ? 'Edit Credit' : 'Add Credit'}</Text>
                            <View style={styles.typeSelector}>
                                <Pressable style={[styles.typeOption, type === 'given' && styles.typeSelected]} onPress={() => setType('given')}>
                                    <ArrowUpRight size={24} color={type === 'given' ? colors.text.inverse : colors.semantic.success} strokeWidth={2} />
                                    <Text style={[styles.typeLabel, type === 'given' && styles.typeLabelSelected]}>Given</Text>
                                </Pressable>
                                <Pressable style={[styles.typeOption, type === 'taken' && styles.typeSelectedTaken]} onPress={() => setType('taken')}>
                                    <ArrowDownLeft size={24} color={type === 'taken' ? colors.text.inverse : colors.brand.primary} strokeWidth={2} />
                                    <Text style={[styles.typeLabel, type === 'taken' && styles.typeLabelSelected]}>Taken</Text>
                                </Pressable>
                            </View>
                            <Input label="Party Name" placeholder="Enter name" value={party} onChangeText={setParty} />
                            <Input label="Amount" placeholder="Enter amount" keyboardType="numeric" value={amount} onChangeText={setAmount} />
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
                </KeyboardAvoidingView>
            </Modal>
            {/* Record Payment Modal */}
            <Modal visible={paymentModalVisible} animationType="fade" transparent={true}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <Pressable style={styles.modalBackdrop} onPress={() => setPaymentModalVisible(false)} />
                    <View style={styles.smallBottomSheet}>
                        <View style={styles.sheetContent}>
                            <Text style={styles.modalTitle}>Record Payment</Text>
                            <Text style={styles.partyNameCenter}>{selectedCredit?.party}</Text>
                            <Input label="Amount Paid" placeholder="Enter amount" keyboardType="numeric" value={paymentAmount} onChangeText={setPaymentAmount} />
                            <View style={styles.modalButtons}>
                                <Pressable style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setPaymentModalVisible(false)}>
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </Pressable>
                                <Pressable style={[styles.modalBtn, styles.saveBtn]} onPress={handleSavePayment}>
                                    <Text style={styles.saveBtnText}>Save Payment</Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Payment History Modal */}
            <Modal visible={historyModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.modalBackdrop} onPress={() => setHistoryModalVisible(false)} />
                    <View style={styles.bottomSheetFull}>
                        <View style={styles.handleContainer}><View style={styles.handleBar} /></View>
                        <View style={styles.sheetContent}>
                            <Text style={styles.modalTitle}>Payment History</Text>
                            <Text style={styles.partyNameCenter}>{selectedCredit?.party}</Text>
                            <FlatList
                                data={selectedCredit?.payments || []}
                                keyExtractor={(p) => p.id}
                                renderItem={({ item }) => (
                                    <View style={styles.paymentItem}>
                                        <View>
                                            <Text style={styles.paymentAmount}>{currency}{item.amount.toLocaleString()}</Text>
                                            <Text style={styles.paymentDate}>{new Date(item.date).toLocaleDateString('en-IN')}</Text>
                                        </View>
                                        <CheckCircle size={18} color={colors.semantic.success} />
                                    </View>
                                )}
                                ListEmptyComponent={
                                    <View style={styles.emptyHistory}>
                                        <Text style={styles.emptyTextSmall}>No payments recorded yet</Text>
                                    </View>
                                }
                                style={{ maxHeight: 300, marginTop: 20 }}
                            />
                            <Pressable style={[styles.modalBtn, styles.cancelBtn, { marginTop: 20 }]} onPress={() => setHistoryModalVisible(false)}>
                                <Text style={styles.cancelBtnText}>Close</Text>
                            </Pressable>
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
    subtitle: { fontSize: tokens.typography.sizes.sm, color: colors.text.secondary, fontFamily: tokens.typography.fontFamily.regular },
    summaryRow: { flexDirection: 'row', gap: tokens.spacing.sm, marginBottom: tokens.spacing.md },
    givenCard: { flex: 1, backgroundColor: colors.semantic.success },
    takenCard: { flex: 1, backgroundColor: colors.brand.primary },
    summaryLabel: { fontSize: tokens.typography.sizes.sm, color: colors.brand.secondary, fontFamily: tokens.typography.fontFamily.regular },
    summaryLabelLight: { fontSize: tokens.typography.sizes.sm, color: colors.text.inverse, fontFamily: tokens.typography.fontFamily.regular },
    summaryAmount: { fontSize: tokens.typography.sizes.xl, color: colors.brand.secondary, fontFamily: tokens.typography.fontFamily.bold },
    summaryAmountLight: { fontSize: tokens.typography.sizes.xl, color: colors.text.inverse, fontFamily: tokens.typography.fontFamily.bold },
    filterTabs: { marginBottom: tokens.spacing.md },
    filterRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm },
    tabsContainer: { flex: 1, flexDirection: 'row', backgroundColor: colors.semantic.soft, borderRadius: tokens.radius.pill, padding: tokens.spacing.xxs },
    filterTab: { flex: 1, paddingVertical: tokens.spacing.xs, alignItems: 'center', borderRadius: tokens.radius.pill },
    filterActive: { backgroundColor: colors.brand.primary },
    filterText: { fontSize: tokens.typography.sizes.sm, color: colors.text.secondary, fontFamily: tokens.typography.fontFamily.medium },
    filterTextActive: { color: colors.text.inverse },
    dateFilterBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.semantic.soft, justifyContent: 'center', alignItems: 'center' },
    dateFilterActive: { backgroundColor: colors.brand.primary },
    creditCard: { marginBottom: tokens.spacing.sm, backgroundColor: colors.semantic.surface },
    paidCard: { opacity: 0.8 },
    creditRow: { flexDirection: 'row', alignItems: 'center' },
    typeIcon: { width: 40, height: 40, borderRadius: tokens.radius.md, justifyContent: 'center', alignItems: 'center', marginRight: tokens.spacing.sm },
    givenIcon: { backgroundColor: 'rgba(129, 178, 154, 0.15)' },
    takenIcon: { backgroundColor: 'rgba(236, 11, 67, 0.15)' },
    creditInfo: { flex: 1 },
    partyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    partyName: { fontSize: tokens.typography.sizes.md, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.semibold },
    partyNameCenter: { fontSize: tokens.typography.sizes.md, color: colors.text.secondary, textAlign: 'center', marginBottom: tokens.spacing.md, fontFamily: tokens.typography.fontFamily.medium },
    linkedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.semantic.soft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
    linkedText: { fontSize: 10, color: colors.brand.secondary, fontFamily: tokens.typography.fontFamily.medium },
    creditAmount: { fontSize: tokens.typography.sizes.lg, fontFamily: tokens.typography.fontFamily.bold },
    givenAmount: { color: colors.semantic.success },
    takenAmount: { color: colors.brand.primary },
    paymentStatusRow: { flexDirection: 'row', gap: 8, marginTop: 2, marginBottom: 4 },
    paidBadge: { fontSize: 10, color: colors.semantic.success, backgroundColor: 'rgba(129, 178, 154, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontFamily: tokens.typography.fontFamily.medium },
    dueBadge: { fontSize: 10, color: colors.brand.primary, backgroundColor: 'rgba(236, 11, 67, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontFamily: tokens.typography.fontFamily.medium },
    creditDate: { fontSize: tokens.typography.sizes.xs, color: colors.text.muted, fontFamily: tokens.typography.fontFamily.regular },
    creditActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statusBtn: { padding: tokens.spacing.xs },
    actionBtn: { padding: tokens.spacing.xs },
    emptyContainer: { alignItems: 'center', paddingVertical: tokens.spacing.xxl },
    emptyIcon: { fontSize: 48, marginBottom: tokens.spacing.md },
    emptyText: { fontSize: tokens.typography.sizes.lg, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.medium },
    emptySubtext: { fontSize: tokens.typography.sizes.sm, color: colors.text.muted, marginTop: tokens.spacing.xs, fontFamily: tokens.typography.fontFamily.regular },
    listContent: { paddingBottom: 160 },
    floatingButton: { position: 'absolute', bottom: 110, alignSelf: 'center', backgroundColor: colors.brand.primary, height: 52, minWidth: 200, borderRadius: 26, justifyContent: 'center', alignItems: 'center', paddingHorizontal: tokens.spacing.lg, ...tokens.shadow.floatingButton },
    floatingButtonPressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },
    floatingButtonText: { color: colors.text.inverse, fontSize: tokens.typography.sizes.lg, fontFamily: tokens.typography.fontFamily.semibold },
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    bottomSheet: { backgroundColor: colors.semantic.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
    bottomSheetFull: { backgroundColor: colors.semantic.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, minHeight: '50%' },
    smallBottomSheet: { backgroundColor: colors.semantic.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, width: '100%' },
    handleContainer: { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
    handleBar: { width: 40, height: 4, backgroundColor: colors.border.default, borderRadius: 2 },
    sheetContent: { padding: tokens.spacing.lg, paddingBottom: tokens.spacing.xxl },
    modalTitle: { fontSize: tokens.typography.sizes.xl, color: colors.text.primary, marginBottom: tokens.spacing.sm, textAlign: 'center', fontFamily: tokens.typography.fontFamily.bold },
    typeSelector: { flexDirection: 'row', marginBottom: tokens.spacing.md, gap: tokens.spacing.sm },
    typeOption: { flex: 1, padding: tokens.spacing.md, borderRadius: tokens.radius.md, backgroundColor: colors.semantic.soft, alignItems: 'center' },
    typeSelected: { backgroundColor: colors.semantic.success },
    typeSelectedTaken: { backgroundColor: colors.brand.primary },
    typeLabel: { fontSize: tokens.typography.sizes.sm, color: colors.text.primary, marginTop: tokens.spacing.xxs, fontFamily: tokens.typography.fontFamily.regular },
    typeLabelSelected: { color: colors.text.inverse },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: tokens.spacing.lg, gap: 12 },
    modalBtn: { flex: 1, paddingVertical: 14, borderRadius: tokens.radius.md, alignItems: 'center' },
    cancelBtn: { backgroundColor: colors.semantic.background },
    cancelBtnText: { fontSize: tokens.typography.sizes.md, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.semibold },
    saveBtn: { backgroundColor: colors.brand.primary },
    saveBtnText: { fontSize: tokens.typography.sizes.md, color: colors.text.inverse, fontFamily: tokens.typography.fontFamily.semibold },
    paymentItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.default },
    paymentAmount: { fontSize: tokens.typography.sizes.md, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.bold },
    paymentDate: { fontSize: tokens.typography.sizes.xs, color: colors.text.muted, fontFamily: tokens.typography.fontFamily.regular },
    emptyHistory: { alignItems: 'center', paddingVertical: 20 },
    emptyTextSmall: { fontSize: tokens.typography.sizes.sm, color: colors.text.muted, fontFamily: tokens.typography.fontFamily.regular },
});

export default CreditsScreen;
