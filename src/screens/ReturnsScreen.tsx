import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Pressable,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trash2 } from 'lucide-react-native';
import { Card } from '../components';
import { tokens, useTheme } from '../theme';
import { useApp } from '../context';
import { SaleReturn } from '../utils/storage';

export const ReturnsScreen: React.FC = () => {
    const { returns, deleteReturn, settings } = useApp();
    const { colors } = useTheme();
    const currency = settings.currency;
    const styles = useMemo(() => createStyles(colors), [colors]);

    const handleDelete = (id: string) => {
        Alert.alert('Delete Return Entry', 'This will remove the return record. It will NOT rollback the inventory or balance. Continue?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteReturn(id) },
        ]);
    };

    const renderReturnItem = ({ item }: { item: SaleReturn }) => {
        return (
            <Card style={styles.listItem}>
                <View style={styles.listRow}>
                    <View style={styles.infoCol}>
                        <Text style={styles.partyName}>{item.party}</Text>
                        <Text style={styles.dateText}>{new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                    </View>
                    <View style={styles.amountCol}>
                        <Text style={styles.amountText}>{currency} {item.amount.toLocaleString()}</Text>
                        <Pressable onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                            <Trash2 size={18} color={colors.semantic.error} />
                        </Pressable>
                    </View>
                </View>
                {item.note && <Text style={styles.noteText}>{item.note}</Text>}
                {item.items && item.items.length > 0 && (
                    <View style={styles.itemsList}>
                        {item.items.map((it, idx) => (
                            <Text key={idx} style={styles.itemDetail}>
                                • {it.productName} ({it.quantity})
                            </Text>
                        ))}
                    </View>
                )}
            </Card>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>Sales Returns</Text>
                    <Text style={styles.subtitle}>History of returned items</Text>
                </View>

                <FlatList
                    data={[...returns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())}
                    keyExtractor={(item) => item.id}
                    renderItem={renderReturnItem}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>🔄</Text>
                            <Text style={styles.emptyText}>No returns yet</Text>
                        </View>
                    }
                />
            </View>
        </SafeAreaView>
    );
};

const createStyles = (colors: typeof tokens.colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.semantic.background },
    content: { flex: 1, paddingHorizontal: tokens.spacing.md },
    header: { paddingTop: tokens.spacing.md, paddingBottom: tokens.spacing.md },
    title: { fontSize: tokens.typography.sizes.xxl, color: colors.brand.secondary, fontFamily: tokens.typography.fontFamily.bold },
    subtitle: { fontSize: tokens.typography.sizes.sm, color: colors.text.secondary, fontFamily: tokens.typography.fontFamily.regular },
    listContent: { paddingBottom: 40 },
    listItem: { marginBottom: tokens.spacing.sm, padding: tokens.spacing.md },
    listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    infoCol: { flex: 1 },
    partyName: { fontSize: tokens.typography.sizes.md, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.bold },
    dateText: { fontSize: tokens.typography.sizes.xs, color: colors.text.muted, marginTop: 2 },
    amountCol: { alignItems: 'flex-end', flexDirection: 'row', gap: 10 },
    amountText: { fontSize: tokens.typography.sizes.md, color: colors.semantic.error, fontFamily: tokens.typography.fontFamily.bold },
    deleteBtn: { padding: 4 },
    noteText: { fontSize: tokens.typography.sizes.xs, color: colors.text.secondary, marginTop: 8, fontStyle: 'italic' },
    itemsList: { marginTop: 8, borderTopWidth: 1, borderTopColor: colors.border.default, paddingTop: 4 },
    itemDetail: { fontSize: 11, color: colors.text.muted, marginTop: 2 },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyIcon: { fontSize: 48, marginBottom: 10 },
    emptyText: { fontSize: 16, color: colors.text.muted, fontFamily: tokens.typography.fontFamily.medium },
});

export default ReturnsScreen;
