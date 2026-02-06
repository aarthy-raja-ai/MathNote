import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Pressable,
    TextInput,
} from 'react-native';
import { Search, Package, Check, AlertTriangle } from 'lucide-react-native';
import { tokens } from '../theme';
import { Product } from '../utils/storage';

interface ProductPickerProps {
    products: Product[];
    colors: any;
    onSelect: (product: Product) => void;
    selectedProducts?: string[]; // IDs of selected products
}

export const ProductPicker: React.FC<ProductPickerProps> = ({
    products,
    colors,
    onSelect,
    selectedProducts = [],
}) => {
    const [search, setSearch] = useState('');

    const filteredProducts = products.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category?.toLowerCase().includes(search.toLowerCase())
    );

    const renderItem = ({ item }: { item: Product }) => {
        const isSelected = selectedProducts.includes(item.id);
        const isLowStock = item.stock <= (item.minStockLevel || 5);

        return (
            <Pressable
                style={[
                    styles.item,
                    { backgroundColor: colors.semantic.surface, borderColor: colors.border.default },
                    isSelected && { borderColor: colors.brand.primary, backgroundColor: colors.brand.primary + '05' }
                ]}
                onPress={() => onSelect(item)}
            >
                <View style={styles.itemContent}>
                    <View style={[styles.iconWrapper, { backgroundColor: colors.semantic.soft }]}>
                        <Package size={18} color={colors.text.secondary} />
                    </View>
                    <View style={styles.itemInfo}>
                        <Text style={[styles.itemName, { color: colors.text.primary }]}>{item.name}</Text>
                        <View style={styles.metaRow}>
                            <Text style={[styles.itemMeta, { color: isLowStock ? colors.brand.primary : colors.text.muted }]}>
                                {item.stock} in stock • {item.category || 'General'}
                            </Text>
                            {isLowStock && (
                                <View style={styles.lowStockRow}>
                                    <AlertTriangle size={12} color={colors.brand.primary} style={styles.alertIcon} />
                                    <Text style={styles.lowStockText}>Low Stock</Text>
                                </View>
                            )}
                        </View>
                    </View>
                    <View style={styles.priceInfo}>
                        <Text style={[styles.itemPrice, { color: colors.brand.primary }]}>
                            {item.unitPrice.toLocaleString()}
                        </Text>
                        {isSelected && <Check size={16} color={colors.brand.primary} strokeWidth={3} />}
                    </View>
                </View>
            </Pressable>
        );
    };

    return (
        <View style={styles.container}>
            <View style={[styles.searchBar, { backgroundColor: colors.semantic.soft }]}>
                <Search size={18} color={colors.text.muted} />
                <TextInput
                    style={[styles.searchInput, { color: colors.text.primary }]}
                    placeholder="Search products..."
                    placeholderTextColor={colors.text.muted}
                    value={search}
                    onChangeText={setSearch}
                />
            </View>
            <FlatList
                data={filteredProducts}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={[styles.emptyText, { color: colors.text.muted }]}>
                            {search ? 'No matches' : 'No products'}
                        </Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { marginBottom: tokens.spacing.md },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: tokens.spacing.md,
        height: 44,
        borderRadius: 12,
        marginBottom: tokens.spacing.sm,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        fontFamily: tokens.typography.fontFamily.regular,
    },
    list: { paddingRight: tokens.spacing.lg },
    item: {
        padding: 12,
        borderRadius: 16,
        borderWidth: 1.5,
        marginRight: tokens.spacing.sm,
        width: 180,
    },
    itemContent: { flexDirection: 'row', alignItems: 'center' },
    iconWrapper: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    itemInfo: { flex: 1 },
    itemName: { fontSize: 13, fontFamily: tokens.typography.fontFamily.bold },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    itemMeta: { fontSize: 10, fontFamily: tokens.typography.fontFamily.regular },
    alertIcon: { marginLeft: 4 },
    lowStockRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 6,
        backgroundColor: tokens.colors.brand.primary + '15',
        paddingHorizontal: 4,
        borderRadius: 4,
    },
    lowStockText: {
        fontSize: 8,
        fontFamily: tokens.typography.fontFamily.bold,
        color: tokens.colors.brand.primary,
        marginLeft: 2,
    },
    priceInfo: { alignItems: 'flex-end', marginLeft: 4 },
    itemPrice: { fontSize: 14, fontFamily: tokens.typography.fontFamily.bold },
    empty: { padding: 20, alignItems: 'center' },
    emptyText: { fontSize: 13, fontFamily: tokens.typography.fontFamily.regular },
});
