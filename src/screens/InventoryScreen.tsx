import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Pressable,
    Modal,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    Animated,
    Dimensions,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    Package,
    Search,
    X,
    Plus,
    Edit2,
    Trash2,
    AlertTriangle,
    ArrowUp,
    ArrowDown,
    Tag,
    ShoppingBag,
    Calculator
} from 'lucide-react-native';
import { tokens, useTheme } from '../theme';
import { useApp } from '../context';
import { Card, Input } from '../components';
import { Product } from '../utils/storage';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const InventoryScreen: React.FC = () => {
    const { products, addProduct, updateProduct, deleteProduct, settings } = useApp();
    const { colors } = useTheme();
    const [search, setSearch] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [stock, setStock] = useState('');
    const [unitPrice, setUnitPrice] = useState('');
    const [costPrice, setCostPrice] = useState('');
    const [category, setCategory] = useState('');
    const [minStockLevel, setMinStockLevel] = useState('');

    const sheetAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    const filteredProducts = useMemo(() => {
        return products
            .filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.category?.toLowerCase().includes(search.toLowerCase()))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [products, search]);

    const stats = useMemo(() => {
        const totalItems = products.length;
        const lowStock = products.filter(p => p.stock <= (p.minStockLevel || 5)).length;
        const totalValue = products.reduce((sum, p) => sum + (p.stock * p.unitPrice), 0);
        return { totalItems, lowStock, totalValue };
    }, [products]);

    const openModal = (product?: Product) => {
        if (product) {
            setEditingProduct(product);
            setName(product.name);
            setStock(product.stock.toString());
            setUnitPrice(product.unitPrice.toString());
            setCostPrice(product.costPrice?.toString() || '');
            setCategory(product.category || '');
            setMinStockLevel(product.minStockLevel?.toString() || '5');
        } else {
            setEditingProduct(null);
            setName('');
            setStock('');
            setUnitPrice('');
            setCostPrice('');
            setCategory('');
            setMinStockLevel('5');
        }
        setModalVisible(true);
        Animated.spring(sheetAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
        }).start();
    };

    const closeModal = () => {
        Animated.timing(sheetAnim, {
            toValue: SCREEN_HEIGHT,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setModalVisible(false);
        });
    };

    const handleSave = async () => {
        if (!name.trim() || !stock.trim() || !unitPrice.trim()) {
            Alert.alert('Required Fields', 'Please enter product name, stock, and unit price.');
            return;
        }

        const productData = {
            name: name.trim(),
            stock: parseInt(stock),
            unitPrice: parseFloat(unitPrice),
            costPrice: costPrice ? parseFloat(costPrice) : undefined,
            category: category.trim() || 'General',
            minStockLevel: minStockLevel ? parseInt(minStockLevel) : undefined,
        };

        if (editingProduct) {
            await updateProduct(editingProduct.id, productData);
        } else {
            await addProduct(productData);
        }
        closeModal();
    };

    const handleDelete = (id: string, productName: string) => {
        Alert.alert(
            'Delete Product',
            `Are you sure you want to delete "${productName}"? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteProduct(id) },
            ]
        );
    };

    const renderProductItem = ({ item }: { item: Product }) => {
        const isLowStock = item.stock <= (item.minStockLevel || 5);

        return (
            <Card style={styles.productCard}>
                <View style={styles.productHeader}>
                    <View style={styles.productInfo}>
                        <View style={styles.nameRow}>
                            <Text style={[styles.productName, { color: colors.text.primary }]}>{item.name}</Text>
                            {isLowStock && (
                                <View style={styles.lowStockBadge}>
                                    <AlertTriangle size={12} color={colors.semantic.warning} />
                                    <Text style={[styles.lowStockText, { color: colors.semantic.warning }]}>Low Stock</Text>
                                </View>
                            )}
                        </View>
                        <Text style={[styles.productCategory, { color: colors.text.muted }]}>
                            {item.category || 'General'}
                        </Text>
                    </View>
                    <View style={styles.priceInfo}>
                        <Text style={[styles.priceValue, { color: colors.brand.primary }]}>
                            {settings.currency}{item.unitPrice.toLocaleString()}
                        </Text>
                        <Text style={[styles.unitLabel, { color: colors.text.muted }]}>per unit</Text>
                    </View>
                </View>

                <View style={[styles.stockWrapper, { backgroundColor: colors.semantic.soft }]}>
                    <View style={styles.stockColumn}>
                        <Text style={[styles.stockLabel, { color: colors.text.muted }]}>In Stock</Text>
                        <Text style={[styles.stockValue, { color: isLowStock ? colors.semantic.error : colors.text.primary }]}>
                            {item.stock}
                        </Text>
                    </View>
                    <View style={styles.stockColumn}>
                        <Text style={[styles.stockLabel, { color: colors.text.muted }]}>Value</Text>
                        <Text style={[styles.stockValue, { color: colors.text.primary }]}>
                            {settings.currency}{(item.stock * item.unitPrice).toLocaleString()}
                        </Text>
                    </View>
                    <View style={styles.actionColumn}>
                        <Pressable onPress={() => openModal(item)} style={styles.itemActionBtn}>
                            <Edit2 size={18} color={colors.brand.secondary} />
                        </Pressable>
                        <Pressable onPress={() => handleDelete(item.id, item.name)} style={styles.itemActionBtn}>
                            <Trash2 size={18} color={colors.semantic.error} />
                        </Pressable>
                    </View>
                </View>
            </Card>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.semantic.background }]}>
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                <View style={styles.header}>
                    <View>
                        <Text style={[styles.title, { color: colors.brand.secondary }]}>Inventory</Text>
                        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>Manage products and stock</Text>
                    </View>
                    <View style={[styles.iconWrapper, { backgroundColor: colors.brand.primary + '15' }]}>
                        <Package color={colors.brand.primary} size={28} />
                    </View>
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <Card style={styles.statCard}>
                        <Text style={[styles.statLabel, { color: colors.text.muted }]}>Total Items</Text>
                        <Text style={[styles.statValue, { color: colors.text.primary }]}>{stats.totalItems}</Text>
                    </Card>
                    <Card style={[styles.statCard, stats.lowStock > 0 && { borderLeftWidth: 3, borderLeftColor: colors.semantic.warning }]}>
                        <Text style={[styles.statLabel, { color: colors.text.muted }]}>Low Stock</Text>
                        <Text style={[styles.statValue, { color: stats.lowStock > 0 ? colors.semantic.warning : colors.text.primary }]}>
                            {stats.lowStock}
                        </Text>
                    </Card>
                    <Card style={styles.statCard}>
                        <Text style={[styles.statLabel, { color: colors.text.muted }]}>Total Value</Text>
                        <Text style={[styles.statValue, { color: colors.brand.primary, fontSize: 16 }]}>
                            {settings.currency}{stats.totalValue.toLocaleString()}
                        </Text>
                    </Card>
                </View>

                {/* Search Bar */}
                <View style={[styles.searchContainer, { backgroundColor: colors.semantic.soft }]}>
                    <Search size={20} color={colors.text.muted} strokeWidth={2} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text.primary }]}
                        placeholder="Search products..."
                        placeholderTextColor={colors.text.muted}
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search ? (
                        <Pressable onPress={() => setSearch('')}>
                            <X size={20} color={colors.text.muted} />
                        </Pressable>
                    ) : null}
                </View>

                <FlatList
                    data={filteredProducts}
                    renderItem={renderProductItem}
                    keyExtractor={item => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <ShoppingBag size={64} color={colors.text.muted} strokeWidth={1} />
                            <Text style={[styles.emptyText, { color: colors.text.primary }]}>No products found</Text>
                            <Text style={[styles.emptySubtext, { color: colors.text.muted }]}>
                                {search ? 'Try a different search term' : 'Add products to start tracking your inventory'}
                            </Text>
                            {!search && (
                                <Pressable style={[styles.emptyActionBtn, { backgroundColor: colors.brand.primary }]} onPress={() => openModal()}>
                                    <Text style={styles.emptyActionText}>Add Your First Product</Text>
                                </Pressable>
                            )}
                        </View>
                    }
                />
            </Animated.View>

            <Pressable style={({ pressed }) => [styles.floatingButton, { backgroundColor: colors.brand.primary }, pressed && styles.floatingButtonPressed]} onPress={() => openModal()}>
                <Plus color={colors.text.inverse} size={24} strokeWidth={3} />
                <Text style={[styles.floatingButtonText, { color: colors.text.inverse }]}>New Product</Text>
            </Pressable>

            {/* Product Modal */}
            <Modal visible={modalVisible} transparent animationType="none">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
                    <Pressable style={styles.modalBackdrop} onPress={closeModal} />
                    <Animated.View style={[styles.bottomSheet, { backgroundColor: colors.semantic.surface, transform: [{ translateY: sheetAnim }] }]}>
                        <View style={styles.handleContainer}>
                            <View style={[styles.handleBar, { backgroundColor: colors.border.default }]} />
                        </View>
                        <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            <View style={styles.sheetContent}>
                                <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                                    {editingProduct ? 'Edit Product' : 'Add New Product'}
                                </Text>

                                <Input label="Product Name" placeholder="e.g. Wireless Mouse" value={name} onChangeText={setName} />
                                <View style={styles.formRow}>
                                    <View style={{ flex: 1 }}>
                                        <Input label="Stock" placeholder="0" keyboardType="numeric" value={stock} onChangeText={setStock} />
                                    </View>
                                    <View style={{ width: tokens.spacing.md }} />
                                    <View style={{ flex: 1 }}>
                                        <Input label="Min Stock Level" placeholder="5" keyboardType="numeric" value={minStockLevel} onChangeText={setMinStockLevel} />
                                    </View>
                                </View>

                                <View style={styles.formRow}>
                                    <View style={{ flex: 1 }}>
                                        <Input label="Unit Price" placeholder="0.00" keyboardType="numeric" value={unitPrice} onChangeText={setUnitPrice} />
                                    </View>
                                    <View style={{ width: tokens.spacing.md }} />
                                    <View style={{ flex: 1 }}>
                                        <Input label="Cost Price" placeholder="0.00" keyboardType="numeric" value={costPrice} onChangeText={setCostPrice} />
                                    </View>
                                </View>

                                <Input label="Category" placeholder="e.g. Electronics" value={category} onChangeText={setCategory} />

                                <View style={styles.modalButtons}>
                                    <Pressable style={[styles.modalBtn, styles.cancelBtn, { backgroundColor: colors.semantic.soft }]} onPress={closeModal}>
                                        <Text style={[styles.cancelBtnText, { color: colors.text.primary }]}>Cancel</Text>
                                    </Pressable>
                                    <Pressable style={[styles.modalBtn, styles.saveBtn, { backgroundColor: colors.brand.primary }]} onPress={handleSave}>
                                        <Text style={[styles.saveBtnText, { color: colors.text.inverse }]}>Save Product</Text>
                                    </Pressable>
                                </View>
                            </View>
                        </ScrollView>
                    </Animated.View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1, paddingHorizontal: tokens.spacing.lg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: tokens.spacing.lg },
    title: { fontSize: 28, fontFamily: tokens.typography.fontFamily.bold },
    subtitle: { fontSize: 14, fontFamily: tokens.typography.fontFamily.regular, marginTop: 4 },
    iconWrapper: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    statsRow: { flexDirection: 'row', gap: tokens.spacing.sm, marginBottom: tokens.spacing.lg },
    statCard: { flex: 1, padding: tokens.spacing.md, alignItems: 'center' },
    statLabel: { fontSize: 10, fontFamily: tokens.typography.fontFamily.medium, textTransform: 'uppercase', marginBottom: 4 },
    statValue: { fontSize: 20, fontFamily: tokens.typography.fontFamily.bold },
    searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: tokens.spacing.md, height: 50, borderRadius: 12, marginBottom: tokens.spacing.lg },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 16, fontFamily: tokens.typography.fontFamily.regular, height: '100%' },
    listContent: { paddingBottom: 100 },
    productCard: { marginBottom: tokens.spacing.md, padding: tokens.spacing.md },
    productHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    productInfo: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    productName: { fontSize: 16, fontFamily: tokens.typography.fontFamily.bold },
    productCategory: { fontSize: 12, fontFamily: tokens.typography.fontFamily.regular, marginTop: 2 },
    lowStockBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255, 178, 0, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    lowStockText: { fontSize: 10, fontFamily: tokens.typography.fontFamily.bold },
    priceInfo: { alignItems: 'flex-end' },
    priceValue: { fontSize: 18, fontFamily: tokens.typography.fontFamily.bold },
    unitLabel: { fontSize: 10, fontFamily: tokens.typography.fontFamily.regular },
    stockWrapper: { flexDirection: 'row', padding: 12, borderRadius: 10 },
    stockColumn: { flex: 1 },
    stockLabel: { fontSize: 10, fontFamily: tokens.typography.fontFamily.medium, marginBottom: 2 },
    stockValue: { fontSize: 14, fontFamily: tokens.typography.fontFamily.bold },
    actionColumn: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    itemActionBtn: { padding: 4 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    emptyText: { fontSize: 18, fontFamily: tokens.typography.fontFamily.bold, marginTop: 16 },
    emptySubtext: { fontSize: 14, fontFamily: tokens.typography.fontFamily.regular, textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },
    emptyActionBtn: { marginTop: 24, paddingVertical: 12, paddingHorizontal: 24, borderRadius: tokens.radius.pill },
    emptyActionText: { color: '#fff', fontSize: 14, fontFamily: tokens.typography.fontFamily.bold },
    floatingButton: { position: 'absolute', bottom: 110, alignSelf: 'center', height: 52, paddingHorizontal: 24, borderRadius: 26, flexDirection: 'row', alignItems: 'center', ...tokens.shadow.floatingButton },
    floatingButtonPressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },
    floatingButtonText: { marginLeft: 8, fontSize: 16, fontFamily: tokens.typography.fontFamily.bold },
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    bottomSheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: SCREEN_HEIGHT * 0.85 },
    handleContainer: { alignItems: 'center', paddingVertical: 16 },
    handleBar: { width: 44, height: 4, borderRadius: 2 },
    sheetScroll: { paddingHorizontal: tokens.spacing.xl },
    sheetContent: { paddingBottom: 40 },
    modalTitle: { fontSize: 22, fontFamily: tokens.typography.fontFamily.bold, marginBottom: 24, textAlign: 'center' },
    formRow: { flexDirection: 'row' },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 32, gap: 12 },
    modalBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
    cancelBtn: {},
    cancelBtnText: { fontSize: 16, fontFamily: tokens.typography.fontFamily.bold },
    saveBtn: {},
    saveBtnText: { fontSize: 16, fontFamily: tokens.typography.fontFamily.bold },
});

