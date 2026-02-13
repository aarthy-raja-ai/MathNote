import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Modal,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, ArrowDownLeft, ArrowUpRight, FileDown, Banknote, Smartphone } from 'lucide-react-native';
import { tokens, useTheme } from '../theme';
import { useApp } from '../context';
import { Sale, Expense, Credit } from '../utils/storage';
import { generateCreditReport } from '../utils/invoiceGenerator';

interface PartyLedgerProps {
    visible: boolean;
    onClose: () => void;
    partyName: string;
    partyType: 'customer' | 'vendor';
}

interface LedgerEntry {
    id: string;
    date: string;
    description: string;
    type: 'credit' | 'debit' | 'payment';
    amount: number;
    paymentMode?: 'Cash' | 'UPI';
    reference?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PartyLedger: React.FC<PartyLedgerProps> = ({ visible, onClose, partyName, partyType }) => {
    const { sales, expenses, credits, settings } = useApp();
    const { colors } = useTheme();
    const currency = settings.currency;
    const styles = useMemo(() => createStyles(colors), [colors]);

    // Gather all transactions for the party
    const ledgerEntries = useMemo(() => {
        const entries: LedgerEntry[] = [];

        // Sales to this customer
        if (partyType === 'customer') {
            sales
                .filter(s => s.customerName === partyName)
                .forEach(sale => {
                    entries.push({
                        id: sale.id,
                        date: sale.date,
                        description: `Invoice ${sale.invoiceNumber || sale.id.slice(-6)}`,
                        type: 'credit', // They owe us money
                        amount: sale.totalAmount,
                        paymentMode: sale.paymentMethod,
                        reference: sale.invoiceNumber,
                    });

                    // If partially paid at sale time
                    if (sale.paidAmount > 0 && sale.paidAmount < sale.totalAmount) {
                        entries.push({
                            id: `${sale.id}-payment`,
                            date: sale.date,
                            description: `Payment received`,
                            type: 'debit', // Money received reduces their debt
                            amount: sale.paidAmount,
                            paymentMode: sale.paymentMethod,
                        });
                    } else if (sale.paidAmount >= sale.totalAmount) {
                        entries.push({
                            id: `${sale.id}-paid`,
                            date: sale.date,
                            description: `Full payment`,
                            type: 'debit',
                            amount: sale.paidAmount,
                            paymentMode: sale.paymentMethod,
                        });
                    }
                });
        }

        // Expenses to this vendor
        if (partyType === 'vendor') {
            expenses
                .filter(e => e.vendorName === partyName)
                .forEach(expense => {
                    entries.push({
                        id: expense.id,
                        date: expense.date,
                        description: expense.category || 'Expense',
                        type: 'debit', // We paid them
                        amount: expense.amount,
                    });
                });
        }

        // Credits involving this party
        credits
            .filter(c => c.party === partyName)
            .forEach(credit => {
                // Initial credit
                entries.push({
                    id: credit.id,
                    date: credit.date,
                    description: credit.type === 'given' ? 'Credit given' : 'Credit taken',
                    type: credit.type === 'given' ? 'credit' : 'debit',
                    amount: credit.amount,
                    paymentMode: credit.paymentMode,
                });

                // Credit payments
                (credit.payments || []).forEach(payment => {
                    entries.push({
                        id: payment.id,
                        date: payment.date,
                        description: credit.type === 'given' ? 'Payment received' : 'Payment made',
                        type: credit.type === 'given' ? 'debit' : 'credit',
                        amount: payment.amount,
                        paymentMode: payment.paymentMode,
                    });
                });
            });

        // Sort by date (oldest first for running balance)
        return entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [sales, expenses, credits, partyName, partyType]);

    // Calculate running balance
    const ledgerWithBalance = useMemo(() => {
        let balance = 0;
        return ledgerEntries.map(entry => {
            if (entry.type === 'credit') {
                balance += entry.amount;
            } else {
                balance -= entry.amount;
            }
            return { ...entry, balance };
        });
    }, [ledgerEntries]);

    // Summary stats
    const totalCredit = ledgerEntries.filter(e => e.type === 'credit').reduce((sum, e) => sum + e.amount, 0);
    const totalDebit = ledgerEntries.filter(e => e.type === 'debit').reduce((sum, e) => sum + e.amount, 0);
    const finalBalance = totalCredit - totalDebit;

    const handleDownloadStatement = async () => {
        const partyCredits = credits.filter(c => c.party === partyName);
        if (partyCredits.length > 0) {
            await generateCreditReport(partyCredits[0], partyCredits, currency, settings);
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>{partyName}</Text>
                        <Text style={styles.subtitle}>
                            {partyType === 'customer' ? '👤 Customer' : '🏪 Vendor'} Statement
                        </Text>
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity style={styles.downloadBtn} onPress={handleDownloadStatement}>
                            <FileDown size={20} color={colors.brand.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <X size={24} color={colors.text.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Summary */}
                <View style={styles.summaryRow}>
                    <View style={[styles.summaryCard, { backgroundColor: colors.semantic.success + '20' }]}>
                        <Text style={styles.summaryLabel}>Total Credit</Text>
                        <Text style={[styles.summaryValue, { color: colors.semantic.success }]}>
                            {currency} {totalCredit.toLocaleString()}
                        </Text>
                    </View>
                    <View style={[styles.summaryCard, { backgroundColor: colors.brand.primary + '20' }]}>
                        <Text style={styles.summaryLabel}>Total Debit</Text>
                        <Text style={[styles.summaryValue, { color: colors.brand.primary }]}>
                            {currency} {totalDebit.toLocaleString()}
                        </Text>
                    </View>
                </View>

                {/* Balance */}
                <View style={[styles.balanceCard, finalBalance >= 0 ? styles.balancePositive : styles.balanceNegative]}>
                    <Text style={styles.balanceLabel}>
                        {finalBalance >= 0
                            ? (partyType === 'customer' ? 'They owe you' : 'Balance')
                            : (partyType === 'customer' ? 'You owe them' : 'You owe')
                        }
                    </Text>
                    <Text style={styles.balanceValue}>
                        {currency} {Math.abs(finalBalance).toLocaleString()}
                    </Text>
                </View>

                {/* Ledger Table */}
                <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Date</Text>
                    <Text style={[styles.tableHeaderText, { flex: 2 }]}>Description</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Credit</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Debit</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1.2, textAlign: 'right' }]}>Balance</Text>
                </View>

                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                    {ledgerWithBalance.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No transactions found</Text>
                        </View>
                    ) : (
                        ledgerWithBalance.map((entry, idx) => (
                            <View key={entry.id + idx} style={styles.tableRow}>
                                <View style={{ flex: 1.5 }}>
                                    <Text style={styles.cellDate}>{formatDate(entry.date)}</Text>
                                </View>
                                <View style={{ flex: 2 }}>
                                    <Text style={styles.cellDesc} numberOfLines={1}>{entry.description}</Text>
                                    {entry.paymentMode && (
                                        <View style={styles.paymentBadge}>
                                            {entry.paymentMode === 'Cash'
                                                ? <Banknote size={10} color={colors.text.muted} />
                                                : <Smartphone size={10} color={colors.text.muted} />
                                            }
                                            <Text style={styles.paymentBadgeText}>{entry.paymentMode}</Text>
                                        </View>
                                    )}
                                </View>
                                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                    {entry.type === 'credit' ? (
                                        <Text style={[styles.cellAmount, { color: colors.semantic.success }]}>
                                            {entry.amount.toLocaleString()}
                                        </Text>
                                    ) : (
                                        <Text style={styles.cellEmpty}>-</Text>
                                    )}
                                </View>
                                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                    {entry.type === 'debit' ? (
                                        <Text style={[styles.cellAmount, { color: colors.brand.primary }]}>
                                            {entry.amount.toLocaleString()}
                                        </Text>
                                    ) : (
                                        <Text style={styles.cellEmpty}>-</Text>
                                    )}
                                </View>
                                <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                                    <Text style={[
                                        styles.cellBalance,
                                        entry.balance >= 0 ? { color: colors.semantic.success } : { color: colors.brand.primary }
                                    ]}>
                                        {entry.balance >= 0 ? '' : '-'}{Math.abs(entry.balance).toLocaleString()}
                                    </Text>
                                </View>
                            </View>
                        ))
                    )}
                    <View style={{ height: 100 }} />
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
};

const createStyles = (colors: typeof tokens.colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.semantic.background },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: tokens.spacing.md,
        paddingVertical: tokens.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.default,
    },
    title: {
        fontSize: tokens.typography.sizes.xl,
        color: colors.brand.secondary,
        fontFamily: tokens.typography.fontFamily.bold,
    },
    subtitle: {
        fontSize: tokens.typography.sizes.sm,
        color: colors.text.muted,
        fontFamily: tokens.typography.fontFamily.regular,
        marginTop: 2,
    },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm },
    downloadBtn: {
        padding: tokens.spacing.sm,
        backgroundColor: colors.semantic.soft,
        borderRadius: tokens.radius.md,
    },
    closeBtn: { padding: tokens.spacing.xs },
    summaryRow: {
        flexDirection: 'row',
        gap: tokens.spacing.sm,
        paddingHorizontal: tokens.spacing.md,
        paddingVertical: tokens.spacing.md,
    },
    summaryCard: {
        flex: 1,
        padding: tokens.spacing.md,
        borderRadius: tokens.radius.md,
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: tokens.typography.sizes.xs,
        color: colors.text.secondary,
        fontFamily: tokens.typography.fontFamily.medium,
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: tokens.typography.sizes.lg,
        fontFamily: tokens.typography.fontFamily.bold,
    },
    balanceCard: {
        marginHorizontal: tokens.spacing.md,
        padding: tokens.spacing.md,
        borderRadius: tokens.radius.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: tokens.spacing.md,
    },
    balancePositive: { backgroundColor: colors.semantic.success },
    balanceNegative: { backgroundColor: colors.brand.primary },
    balanceLabel: {
        fontSize: tokens.typography.sizes.sm,
        color: colors.text.inverse,
        fontFamily: tokens.typography.fontFamily.medium,
    },
    balanceValue: {
        fontSize: tokens.typography.sizes.xl,
        color: colors.text.inverse,
        fontFamily: tokens.typography.fontFamily.bold,
    },
    tableHeader: {
        flexDirection: 'row',
        paddingHorizontal: tokens.spacing.md,
        paddingVertical: tokens.spacing.sm,
        backgroundColor: colors.semantic.soft,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.border.default,
    },
    tableHeaderText: {
        fontSize: 10,
        color: colors.text.muted,
        fontFamily: tokens.typography.fontFamily.semibold,
        textTransform: 'uppercase',
    },
    scrollView: { flex: 1, paddingHorizontal: tokens.spacing.md },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: tokens.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.default,
        alignItems: 'center',
    },
    cellDate: {
        fontSize: 11,
        color: colors.text.secondary,
        fontFamily: tokens.typography.fontFamily.medium,
    },
    cellDesc: {
        fontSize: 12,
        color: colors.text.primary,
        fontFamily: tokens.typography.fontFamily.regular,
    },
    cellAmount: {
        fontSize: 12,
        fontFamily: tokens.typography.fontFamily.semibold,
    },
    cellEmpty: {
        fontSize: 12,
        color: colors.text.muted,
        fontFamily: tokens.typography.fontFamily.regular,
    },
    cellBalance: {
        fontSize: 12,
        fontFamily: tokens.typography.fontFamily.bold,
    },
    paymentBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        marginTop: 2,
    },
    paymentBadgeText: {
        fontSize: 9,
        color: colors.text.muted,
        fontFamily: tokens.typography.fontFamily.regular,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: tokens.spacing.xl,
    },
    emptyText: {
        fontSize: tokens.typography.sizes.sm,
        color: colors.text.muted,
        fontFamily: tokens.typography.fontFamily.regular,
    },
});

export default PartyLedger;
