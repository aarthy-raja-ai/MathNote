import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Package, Plus } from 'lucide-react-native';
import { tokens } from '../theme';
import { Product } from '../utils/storage';

interface QuickAddGridProps {
    products: Product[];
    colors: any;
    onSelect: (product: Product) => void;
}

export const QuickAddGrid: React.FC<QuickAddGridProps> = ({ products, colors, onSelect }) => {
    // Show only first 8 products as "Quick Add"
    const quickProducts = products.slice(0, 8);

    if (quickProducts.length === 0) return null;

    return (
        <View style={styles.container}>
            <Text style={[styles.title, { color: colors.text.secondary }]}>Quick Add</Text>
            <View style={styles.grid}>
                {quickProducts.map((product) => (
                    <Pressable
                        key={product.id}
                        style={({ pressed }) => [
                            styles.item,
                            { backgroundColor: colors.semantic.surface, borderColor: colors.border.default },
                            pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }
                        ]}
                        onPress={() => onSelect(product)}
                    >
                        <View style={[styles.iconWrapper, { backgroundColor: colors.brand.primary + '10' }]}>
                            <Package size={16} color={colors.brand.primary} />
                        </View>
                        <Text style={[styles.itemName, { color: colors.text.primary }]} numberOfLines={1}>
                            {product.name}
                        </Text>
                        <Text style={[styles.itemPrice, { color: colors.brand.primary }]}>
                            {product.unitPrice.toLocaleString()}
                        </Text>
                        <View style={styles.plusIcon}>
                            <Plus size={12} color={colors.text.inverse} />
                        </View>
                    </Pressable>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: tokens.spacing.md,
    },
    title: {
        fontSize: 12,
        fontFamily: tokens.typography.fontFamily.bold,
        textTransform: 'uppercase',
        marginBottom: tokens.spacing.sm,
        letterSpacing: 0.5,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: tokens.spacing.xs,
    },
    item: {
        width: '23.5%', // 4 items per row approximately
        padding: 8,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        position: 'relative',
    },
    iconWrapper: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    itemName: {
        fontSize: 10,
        fontFamily: tokens.typography.fontFamily.medium,
        textAlign: 'center',
    },
    itemPrice: {
        fontSize: 10,
        fontFamily: tokens.typography.fontFamily.bold,
        marginTop: 2,
    },
    plusIcon: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: tokens.colors.brand.primary,
        width: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff', // Use white for contrast
    }
});
