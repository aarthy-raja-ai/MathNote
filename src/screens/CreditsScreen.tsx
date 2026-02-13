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
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, Link, Pencil, Trash2, PlusCircle, History, Calendar, Banknote, Smartphone, Handshake, MessageCircle, Search, X, FileDown, FileText } from 'lucide-react-native';
import { Card, Input, DateFilter, filterByDateRange, getFilterLabel, ContactPicker, PartyLedger } from '../components';
import type { DateFilterType } from '../components';
import { tokens, useTheme } from '../theme';
import { useApp } from '../context';
import { Credit, CreditPayment } from '../utils/storage';
import { generateCreditReport } from '../utils/invoiceGenerator';

export const CreditsScreen: React.FC = () => {
    const { credits, addCredit, updateCredit, deleteCredit, settings, sales, addCreditPayment, contacts } = useApp();
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
    const [searchQuery, setSearchQuery] = useState('');
    const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI'>('Cash');
    const [paymentPaymentMode, setPaymentPaymentMode] = useState<'Cash' | 'UPI'>('Cash');
    const [ledgerVisible, setLedgerVisible] = useState(false);
    const [ledgerParty, setLedgerParty] = useState<{ name: string; type: 'customer' | 'vendor' }>({ name: '', type: 'customer' });
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
        setPaymentMode('Cash');
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
        setPaymentMode(credit.paymentMode || 'Cash');
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
        setPaymentPaymentMode('Cash');
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
                paymentMode: paymentPaymentMode,
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
            await updateCredit(editingCredit.id, { amount: parsedAmount, party, type, paymentMode });
        } else {
            await addCredit({ date: today, amount: parsedAmount, party, type, status: 'pending', paymentMode });
        }
        setModalVisible(false);
    };

    const handleWhatsAppReminder = (credit: Credit) => {
        const dueAmount = credit.amount - (credit.paidAmount || 0);
        const message = `Hello ${credit.party}, this is a friendly reminder from MathNote regarding your pending balance of ${currency}${dueAmount.toLocaleString()}. Please let us know if you have any questions. Thank you!`;
        const url = `whatsapp://send?text=${encodeURIComponent(message)}`;

        Linking.canOpenURL(url).then(supported => {
            if (supported) {
                Linking.openURL(url);
            } else {
                Alert.alert('Error', 'WhatsApp is not installed on your device');
            }
        });
    };

    // WhatsApp handler

    // Filter credits by search query
    const filteredCredits = useMemo(() => {
        return credits
            .filter(c => {
                const matchesSearch = c.party.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    c.amount.toString().includes(searchQuery);
                return matchesSearch;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [credits, searchQuery]);

    // Calculate pending amounts from grouped credits net balances
    // Note: pendingGiven and pendingTaken are moved after groupedCredits definition

    // Group credits by party name
    interface GroupedParty {
        party: string;
        credits: Credit[];
        totalGiven: number;
        totalTaken: number;
        dueGiven: number;
        dueTaken: number;
        netBalance: number;
        latestDate: string;
    }

    const groupedCredits = useMemo(() => {
        const groups: { [key: string]: GroupedParty } = {};

        filteredCredits.forEach((credit) => {
            const partyKey = credit.party.toLowerCase().trim();
            if (!groups[partyKey]) {
                groups[partyKey] = {
                    party: credit.party,
                    credits: [],
                    totalGiven: 0,
                    totalTaken: 0,
                    dueGiven: 0,
                    dueTaken: 0,
                    netBalance: 0,
                    latestDate: credit.date,
                };
            }

            groups[partyKey].credits.push(credit);
            const dueAmount = credit.amount - (credit.paidAmount || 0);

            if (credit.type === 'given') {
                groups[partyKey].totalGiven += credit.amount;
                if (credit.status === 'pending') {
                    groups[partyKey].dueGiven += dueAmount;
                }
            } else {
                groups[partyKey].totalTaken += credit.amount;
                if (credit.status === 'pending') {
                    groups[partyKey].dueTaken += dueAmount;
                }
            }

            // Update latest date
            if (new Date(credit.date) > new Date(groups[partyKey].latestDate)) {
                groups[partyKey].latestDate = credit.date;
            }
        });

        // Calculate net balance (positive = they owe you, negative = you owe them)
        Object.values(groups).forEach((group) => {
            group.netBalance = group.dueGiven - group.dueTaken;
        });

        // Sort by latest date
        return Object.values(groups).sort((a, b) =>
            new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime()
        );
    }, [filteredCredits]);

    // Calculate pending amounts from grouped credits net balances
    const pendingGiven = useMemo(() => groupedCredits.filter(g => g.netBalance > 0).reduce((sum, g) => sum + g.netBalance, 0), [groupedCredits]);
    const pendingTaken = useMemo(() => groupedCredits.filter(g => g.netBalance < 0).reduce((sum, g) => sum + Math.abs(g.netBalance), 0), [groupedCredits]);

    // Get linked sale for a credit
    const getLinkedSale = (credit: Credit) => {
        if (!credit.linkedSaleId) return null;
        return sales.find((s) => s.id === credit.linkedSaleId);
    };

    // State for expanded parties
    const [expandedParties, setExpandedParties] = useState<Set<string>>(new Set());

    const togglePartyExpand = (party: string) => {
        setExpandedParties(prev => {
            const next = new Set(prev);
            if (next.has(party)) {
                next.delete(party);
            } else {
                next.add(party);
            }
            return next;
        });
    };

    // Generate PDF report for a party
    const handleDownloadReport = (group: GroupedParty) => {
        generateCreditReport(group.party, group.credits, settings);
    };

    const handleViewStatement = (group: any) => {
        const hasGiven = group.credits.some((c: Credit) => c.type === 'given');
        setLedgerParty({ name: group.party, type: hasGiven ? 'customer' : 'vendor' });
        setLedgerVisible(true);
    };

    const renderCreditItem = (item: Credit, isSubItem: boolean = false) => {
        const linkedSale = getLinkedSale(item);
        const isToday = item.date === today;
        const dueAmount = item.amount - (item.paidAmount || 0);

        // Build subtitle parts
        const subtitleParts: string[] = [];
        subtitleParts.push(item.type === 'given' ? 'Customer' : 'Vendor');
        if (item.paymentMode) subtitleParts.push(item.paymentMode);
        subtitleParts.push(`Due: ${currency}${dueAmount.toLocaleString()}`);
        if (!isToday) subtitleParts.push(new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));

        return (
            <Pressable
                key={item.id}
                style={[styles.subListItem, item.status === 'paid' && styles.paidItem]}
                onPress={() => handleEdit(item)}
                onLongPress={() => handleDelete(item)}
            >
                {/* Row 1: Type icon + Amount */}
                <View style={styles.listRow}>
                    <View style={[styles.typeIcon, item.type === 'given' ? styles.givenIcon : styles.takenIcon]}>
                        {item.type === 'given' ? (
                            <ArrowUpRight size={14} color={colors.semantic.success} strokeWidth={2.5} />
                        ) : (
                            <ArrowDownLeft size={14} color={colors.brand.primary} strokeWidth={2.5} />
                        )}
                    </View>
                    <Text style={styles.subItemAmount}>
                        {currency} {item.amount.toLocaleString()}
                    </Text>
                    <View style={styles.amountRow}>
                        {linkedSale && <Link size={10} color={colors.brand.secondary} strokeWidth={2} />}
                        <Text style={[styles.subItemDue, item.type === 'given' ? styles.givenAmount : styles.takenAmount]}>
                            Due: {currency}{dueAmount.toLocaleString()}
                        </Text>
                    </View>
                </View>

                {/* Row 2: Subtitle */}
                <Text style={styles.subItemSubtitle} numberOfLines={1} ellipsizeMode="tail">
                    {subtitleParts.join(' • ')}
                </Text>

                {/* Row 3: Action Buttons */}
                {item.status === 'pending' && (
                    <View style={styles.subActionRow}>
                        <Pressable
                            style={styles.smallActionBtn}
                            onPress={() => handleRecordPayment(item)}
                        >
                            <Banknote size={12} color={colors.semantic.success} />
                            <Text style={styles.smallActionBtnText}>Pay</Text>
                        </Pressable>
                        <Pressable
                            style={styles.smallActionBtn}
                            onPress={() => handleViewHistory(item)}
                        >
                            <History size={12} color={colors.brand.secondary} />
                            <Text style={[styles.smallActionBtnText, { color: colors.brand.secondary }]}>History</Text>
                        </Pressable>
                        {item.type === 'given' && (
                            <Pressable
                                style={[styles.smallActionBtn, { backgroundColor: '#E7FFEB' }]}
                                onPress={() => handleWhatsAppReminder(item)}
                            >
                                <MessageCircle size={12} color="#25D366" />
                                <Text style={[styles.smallActionBtnText, { color: '#25D366' }]}>Remind</Text>
                            </Pressable>
                        )}
                    </View>
                )}
            </Pressable>
        );
    };

    interface GroupedPartyType {
        party: string;
        credits: Credit[];
        totalGiven: number;
        totalTaken: number;
        dueGiven: number;
        dueTaken: number;
        netBalance: number;
        latestDate: string;
    }

    const renderGroupedParty = ({ item }: { item: GroupedPartyType }) => {
        const isExpanded = expandedParties.has(item.party);
        const hasGiven = item.dueGiven > 0;
        const hasTaken = item.dueTaken > 0;

        return (
            <View style={styles.groupCard}>
                {/* Party Header - Tappable */}
                <Pressable
                    style={styles.groupHeader}
                    onPress={() => togglePartyExpand(item.party)}
                >
                    <View style={styles.groupHeaderLeft}>
                        <View style={[
                            styles.groupIcon,
                            item.netBalance > 0 ? styles.givenIcon : item.netBalance < 0 ? styles.takenIcon : styles.neutralIcon
                        ]}>
                            {item.netBalance > 0 ? (
                                <ArrowUpRight size={20} color={colors.semantic.success} strokeWidth={2.5} />
                            ) : item.netBalance < 0 ? (
                                <ArrowDownLeft size={20} color={colors.brand.primary} strokeWidth={2.5} />
                            ) : (
                                <CheckCircle size={20} color={colors.text.muted} strokeWidth={2} />
                            )}
                        </View>
                        <View>
                            <Text style={styles.groupPartyName}>{item.party}</Text>
                            <Text style={styles.groupTransactionCount}>
                                {item.credits.length} transaction{item.credits.length > 1 ? 's' : ''}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.groupHeaderRight}>
                        {item.netBalance !== 0 && (
                            <View style={[
                                styles.netBalanceBadge,
                                item.netBalance > 0 ? styles.netPositive : styles.netNegative
                            ]}>
                                <Text style={[
                                    styles.netBalanceText,
                                    item.netBalance > 0 ? styles.netPositiveText : styles.netNegativeText
                                ]}>
                                    {item.netBalance > 0 ? 'To Receive' : 'To Pay'}
                                </Text>
                                <Text style={[
                                    styles.netBalanceAmount,
                                    item.netBalance > 0 ? styles.netPositiveText : styles.netNegativeText
                                ]}>
                                    {currency} {Math.abs(item.netBalance).toLocaleString()}
                                </Text>
                            </View>
                        )}
                        {item.netBalance === 0 && (
                            <View style={styles.settledBadge}>
                                <Text style={styles.settledText}>Settled</Text>
                            </View>
                        )}
                    </View>
                </Pressable>

                {/* Summary Row */}
                <View style={styles.groupSummaryRow}>
                    {hasGiven && (
                        <View style={styles.summaryChip}>
                            <ArrowUpRight size={12} color={colors.semantic.success} />
                            <Text style={styles.summaryChipText}>Given: {currency}{item.dueGiven.toLocaleString()}</Text>
                        </View>
                    )}
                    {hasTaken && (
                        <View style={styles.summaryChip}>
                            <ArrowDownLeft size={12} color={colors.brand.primary} />
                            <Text style={styles.summaryChipTextTaken}>Taken: {currency}{item.dueTaken.toLocaleString()}</Text>
                        </View>
                    )}
                    {/* Download Report Button */}
                    <Pressable
                        style={styles.reportButton}
                        onPress={() => handleDownloadReport(item)}
                    >
                        <FileDown size={14} color={colors.brand.secondary} />
                        <Text style={styles.reportButtonText}>Report</Text>
                    </Pressable>
                    {/* View Statement Button */}
                    <Pressable
                        style={styles.statementButton}
                        onPress={() => handleViewStatement(item)}
                    >
                        <FileText size={14} color={colors.text.inverse} />
                        <Text style={styles.statementButtonText}>Statement</Text>
                    </Pressable>
                </View>

                {/* Expanded Credits List */}
                {isExpanded && (
                    <View style={styles.expandedCredits}>
                        {item.credits.map((credit) => renderCreditItem(credit, true))}
                    </View>
                )}

                {/* Expand/Collapse indicator */}
                <Pressable
                    style={styles.expandButton}
                    onPress={() => togglePartyExpand(item.party)}
                >
                    <Text style={styles.expandButtonText}>
                        {isExpanded ? 'Hide Details' : 'Show Details'}
                    </Text>
                </Pressable>
            </View>
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
                        <Text style={styles.summaryLabelLight}>Total To Receive</Text>
                        <Text style={styles.summaryAmountLight}>{currency} {pendingGiven.toLocaleString()}</Text>
                    </Card>
                    <Card style={styles.takenCard}>
                        <Text style={styles.summaryLabelLight}>Total To Pay</Text>
                        <Text style={styles.summaryAmountLight}>{currency} {pendingTaken.toLocaleString()}</Text>
                    </Card>
                </View>

                <View style={[styles.searchContainer, { backgroundColor: colors.semantic.soft }]}>
                    <Search size={20} color={colors.text.muted} strokeWidth={2} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text.primary }]}
                        placeholder="Search by party name or amount..."
                        placeholderTextColor={colors.text.muted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery ? (
                        <Pressable onPress={() => setSearchQuery('')}>
                            <X size={20} color={colors.text.muted} strokeWidth={2} />
                        </Pressable>
                    ) : null}
                </View>



                <FlatList
                    data={groupedCredits}
                    keyExtractor={(item) => item.party}
                    renderItem={renderGroupedParty}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Handshake size={48} color={colors.text.muted} strokeWidth={1.5} />
                            <Text style={styles.emptyText}>No credits found</Text>
                            <Text style={styles.emptySubtext}>
                                {searchQuery ? 'Try a different search term' : 'Add credits given or taken to get started'}
                            </Text>
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

                            <Text style={[styles.sectionLabel, { color: colors.text.secondary }]}>Select {type === 'given' ? 'Customer' : 'Vendor'}</Text>
                            <ContactPicker
                                contacts={contacts}
                                colors={colors}
                                filterType={type === 'given' ? 'Customer' : 'Vendor'}
                                onSelect={(contact) => setParty(contact.name)}
                            />

                            <Input label={type === 'given' ? 'Customer Name' : 'Vendor Name'} placeholder="Enter name" value={party} onChangeText={setParty} />
                            <Input label="Amount" placeholder="Enter amount" keyboardType="numeric" value={amount} onChangeText={setAmount} />
                            <Text style={styles.paymentModeLabel}>Payment Mode</Text>
                            <View style={styles.paymentModeRow}>
                                <Pressable style={[styles.paymentModeOption, paymentMode === 'Cash' && styles.paymentModeSelected]} onPress={() => setPaymentMode('Cash')}>
                                    <Banknote size={18} color={paymentMode === 'Cash' ? colors.text.inverse : colors.text.secondary} />
                                    <Text style={[styles.paymentModeOptionText, paymentMode === 'Cash' && styles.paymentModeOptionTextSelected]}>Cash</Text>
                                </Pressable>
                                <Pressable style={[styles.paymentModeOption, paymentMode === 'UPI' && styles.paymentModeSelected]} onPress={() => setPaymentMode('UPI')}>
                                    <Smartphone size={18} color={paymentMode === 'UPI' ? colors.text.inverse : colors.text.secondary} />
                                    <Text style={[styles.paymentModeOptionText, paymentMode === 'UPI' && styles.paymentModeOptionTextSelected]}>UPI</Text>
                                </Pressable>
                            </View>
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
                            <Text style={styles.paymentModeLabel}>Payment Mode</Text>
                            <View style={styles.paymentModeRow}>
                                <Pressable style={[styles.paymentModeOption, paymentPaymentMode === 'Cash' && styles.paymentModeSelected]} onPress={() => setPaymentPaymentMode('Cash')}>
                                    <Banknote size={18} color={paymentPaymentMode === 'Cash' ? colors.text.inverse : colors.text.secondary} />
                                    <Text style={[styles.paymentModeOptionText, paymentPaymentMode === 'Cash' && styles.paymentModeOptionTextSelected]}>Cash</Text>
                                </Pressable>
                                <Pressable style={[styles.paymentModeOption, paymentPaymentMode === 'UPI' && styles.paymentModeSelected]} onPress={() => setPaymentPaymentMode('UPI')}>
                                    <Smartphone size={18} color={paymentPaymentMode === 'UPI' ? colors.text.inverse : colors.text.secondary} />
                                    <Text style={[styles.paymentModeOptionText, paymentPaymentMode === 'UPI' && styles.paymentModeOptionTextSelected]}>UPI</Text>
                                </Pressable>
                            </View>
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
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                                <Text style={styles.paymentDate}>{new Date(item.date).toLocaleDateString('en-IN')}</Text>
                                                {item.paymentMode && (
                                                    <View style={[styles.paymentModeBadge, item.paymentMode === 'UPI' && styles.upiBadge]}>
                                                        {item.paymentMode === 'Cash' ? (
                                                            <Banknote size={10} color={colors.semantic.success} />
                                                        ) : (
                                                            <Smartphone size={10} color={colors.brand.secondary} />
                                                        )}
                                                        <Text style={[styles.paymentModeText, item.paymentMode === 'UPI' && styles.upiText]}>{item.paymentMode}</Text>
                                                    </View>
                                                )}
                                            </View>
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
        </SafeAreaView >
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
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: tokens.spacing.md,
        height: 52,
        borderRadius: tokens.radius.md,
        marginBottom: tokens.spacing.md,
        borderWidth: 1,
        borderColor: colors.border.default,
    },
    searchInput: {
        flex: 1,
        marginLeft: tokens.spacing.sm,
        fontSize: 16,
        fontFamily: tokens.typography.fontFamily.regular,
        height: '100%',
    },
    filterTabs: { marginBottom: tokens.spacing.md },
    creditCard: { marginBottom: tokens.spacing.sm, backgroundColor: colors.semantic.surface },
    paidCard: { opacity: 0.8 },
    creditRow: { flexDirection: 'row', alignItems: 'center' },
    typeIcon: { width: 36, height: 36, borderRadius: tokens.radius.md, justifyContent: 'center', alignItems: 'center', marginRight: tokens.spacing.sm },
    givenIcon: { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
    takenIcon: { backgroundColor: 'rgba(99, 102, 241, 0.15)' },
    // Compact list item styles (matching Sales screen)
    listItem: {
        paddingVertical: 10,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.default,
    },
    paidItem: { opacity: 0.6 },
    listRow: {
        flexDirection: 'row',
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
    listAmount: {
        fontSize: 14,
        fontFamily: tokens.typography.fontFamily.bold,
    },
    listSubtitle: {
        fontSize: 12,
        color: colors.text.muted,
        fontFamily: tokens.typography.fontFamily.regular,
        marginTop: 2,
        marginLeft: 48, // Align with text after icon
    },
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
    actionRow: {
        flexDirection: 'row',
        gap: tokens.spacing.md,
        marginTop: tokens.spacing.xs,
        marginLeft: 48
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: tokens.spacing.xs,
        paddingHorizontal: tokens.spacing.sm,
        backgroundColor: colors.semantic.soft,
        borderRadius: tokens.radius.sm
    },
    actionBtnText: {
        fontSize: tokens.typography.sizes.xs,
        color: colors.semantic.success,
        fontFamily: tokens.typography.fontFamily.medium
    },
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
    sectionLabel: { fontSize: 10, fontFamily: tokens.typography.fontFamily.medium, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: tokens.spacing.md },
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
    // Payment mode styles
    partyTypeLabel: { fontSize: tokens.typography.sizes.xs, color: colors.text.muted, fontFamily: tokens.typography.fontFamily.medium, textTransform: 'uppercase' as const },
    paymentModeBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(129, 178, 154, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
    upiBadge: { backgroundColor: 'rgba(44, 73, 107, 0.1)' },
    paymentModeText: { fontSize: 10, color: colors.semantic.success, fontFamily: tokens.typography.fontFamily.medium },
    upiText: { color: colors.brand.secondary },
    paymentModeLabel: { fontSize: tokens.typography.sizes.sm, color: colors.text.secondary, marginBottom: tokens.spacing.xs, marginTop: tokens.spacing.sm, fontFamily: tokens.typography.fontFamily.medium },
    paymentModeRow: { flexDirection: 'row', gap: tokens.spacing.sm, marginBottom: tokens.spacing.sm },
    paymentModeOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: tokens.spacing.sm, backgroundColor: colors.semantic.soft, borderRadius: tokens.radius.md },
    paymentModeSelected: { backgroundColor: colors.brand.primary },
    paymentModeOptionText: { fontSize: tokens.typography.sizes.sm, color: colors.text.secondary, fontFamily: tokens.typography.fontFamily.medium },
    paymentModeOptionTextSelected: { color: colors.text.inverse },
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

    // Grouped Party Card Styles
    groupCard: {
        backgroundColor: colors.semantic.surface,
        borderRadius: tokens.radius.lg,
        marginBottom: tokens.spacing.sm,
        padding: tokens.spacing.md,
        ...tokens.shadow.card,
    },
    groupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    groupHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    groupHeaderRight: {
        alignItems: 'flex-end',
    },
    groupIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: tokens.spacing.sm,
    },
    neutralIcon: {
        backgroundColor: colors.semantic.soft,
    },
    groupPartyName: {
        fontSize: tokens.typography.sizes.md,
        color: colors.text.primary,
        fontFamily: tokens.typography.fontFamily.semibold,
    },
    groupTransactionCount: {
        fontSize: tokens.typography.sizes.xs,
        color: colors.text.muted,
        fontFamily: tokens.typography.fontFamily.regular,
        marginTop: 2,
    },
    netBalanceBadge: {
        paddingHorizontal: tokens.spacing.sm,
        paddingVertical: tokens.spacing.xs,
        borderRadius: tokens.radius.md,
        alignItems: 'flex-end',
    },
    netPositive: {
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
    },
    netNegative: {
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
    },
    netBalanceText: {
        fontSize: 10,
        fontFamily: tokens.typography.fontFamily.medium,
    },
    netBalanceAmount: {
        fontSize: tokens.typography.sizes.md,
        fontFamily: tokens.typography.fontFamily.bold,
    },
    netPositiveText: {
        color: colors.semantic.success,
    },
    netNegativeText: {
        color: colors.brand.primary,
    },
    settledBadge: {
        backgroundColor: colors.semantic.soft,
        paddingHorizontal: tokens.spacing.sm,
        paddingVertical: tokens.spacing.xs,
        borderRadius: tokens.radius.md,
    },
    settledText: {
        fontSize: tokens.typography.sizes.xs,
        color: colors.text.muted,
        fontFamily: tokens.typography.fontFamily.medium,
    },
    groupSummaryRow: {
        flexDirection: 'row',
        gap: tokens.spacing.sm,
        marginTop: tokens.spacing.sm,
        marginLeft: 52, // Align with text after icon
    },
    summaryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(129, 178, 154, 0.1)',
        paddingHorizontal: tokens.spacing.xs,
        paddingVertical: 4,
        borderRadius: tokens.radius.sm,
    },
    summaryChipText: {
        fontSize: 11,
        color: colors.semantic.success,
        fontFamily: tokens.typography.fontFamily.medium,
    },
    summaryChipTextTaken: {
        fontSize: 11,
        color: colors.brand.primary,
        fontFamily: tokens.typography.fontFamily.medium,
    },
    expandedCredits: {
        marginTop: tokens.spacing.sm,
        marginLeft: 52,
        borderTopWidth: 1,
        borderTopColor: colors.border.default,
        paddingTop: tokens.spacing.sm,
    },
    expandButton: {
        alignItems: 'center',
        paddingTop: tokens.spacing.sm,
        marginTop: tokens.spacing.xs,
    },
    expandButtonText: {
        fontSize: tokens.typography.sizes.xs,
        color: colors.brand.secondary,
        fontFamily: tokens.typography.fontFamily.medium,
    },

    // Sub-item styles for individual credits within a group
    subListItem: {
        paddingVertical: tokens.spacing.xs,
        paddingHorizontal: tokens.spacing.xs,
        marginBottom: tokens.spacing.xs,
        backgroundColor: colors.semantic.background,
        borderRadius: tokens.radius.sm,
    },
    subItemAmount: {
        flex: 1,
        fontSize: 13,
        color: colors.text.primary,
        fontFamily: tokens.typography.fontFamily.medium,
    },
    subItemDue: {
        fontSize: 12,
        fontFamily: tokens.typography.fontFamily.semibold,
    },
    subItemSubtitle: {
        fontSize: 10,
        color: colors.text.muted,
        fontFamily: tokens.typography.fontFamily.regular,
        marginTop: 2,
        marginLeft: 44,
    },
    subActionRow: {
        flexDirection: 'row',
        gap: tokens.spacing.xs,
        marginTop: tokens.spacing.xs,
        marginLeft: 44,
    },
    smallActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingVertical: 4,
        paddingHorizontal: tokens.spacing.xs,
        backgroundColor: colors.semantic.soft,
        borderRadius: tokens.radius.sm,
    },
    smallActionBtnText: {
        fontSize: 10,
        color: colors.semantic.success,
        fontFamily: tokens.typography.fontFamily.medium,
    },
    // Report button styles
    reportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 4,
        paddingHorizontal: tokens.spacing.sm,
        backgroundColor: colors.semantic.soft,
        borderRadius: tokens.radius.sm,
        marginLeft: 'auto',
    },
    reportButtonText: {
        fontSize: 11,
        color: colors.brand.secondary,
        fontFamily: tokens.typography.fontFamily.medium,
    },
});

export default CreditsScreen;
