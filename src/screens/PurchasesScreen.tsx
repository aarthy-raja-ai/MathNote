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
    PanResponder,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Pencil, Trash2, ShoppingCart, Package, Plus } from 'lucide-react-native';
import { Card, Input, DateFilter, filterByDateRange, getFilterLabel, ContactPicker, ProductPicker } from '../components';
import type { DateFilterType } from '../components';
import { tokens, useTheme } from '../theme';
import { useApp, useAuth } from '../context';
import { Purchase, Product, SaleItem } from '../utils/storage';
import { evaluateMath } from '../utils/mathEvaluator';
import { getFinancialYear } from '../utils/fyHelpers';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.70;

type PaymentMethod = 'Cash' | 'UPI';

interface SegmentedControlProps {
    selected: PaymentMethod;
    onChange: (method: PaymentMethod) => void;
    colors: typeof tokens.colors;
}

const PaymentMethodControl: React.FC<SegmentedControlProps> = ({ selected, onChange, colors }) => (
    <View style={segmentStyles.container}>
        <Text style={[segmentStyles.label, { color: colors.text.primary, fontFamily: tokens.typography.fontFamily.medium }]}>
            Payment Method
        </Text>
        <View style={[segmentStyles.control, { backgroundColor: colors.semantic.background }]}>
            {(['Cash', 'UPI'] as PaymentMethod[]).map((method) => (
                <Pressable
                    key={method}
                    style={[segmentStyles.button, selected === method && { backgroundColor: colors.brand.primary }]}
                    onPress={() => onChange(method)}
                >
                    <Text style={[segmentStyles.text, { color: selected === method ? colors.text.inverse : colors.brand.secondary, fontFamily: tokens.typography.fontFamily.medium }]}>
                        {method}
                    </Text>
                </Pressable>
            ))}
        </View>
    </View>
);

const segmentStyles = StyleSheet.create({
    container: { marginBottom: tokens.spacing.md },
    label: { fontSize: tokens.typography.sizes.sm, marginBottom: tokens.spacing.xs },
    control: { flexDirection: 'row', borderRadius: tokens.radius.md, padding: 4 },
    button: { flex: 1, paddingVertical: 10, borderRadius: tokens.radius.sm, alignItems: 'center' },
    text: { fontSize: tokens.typography.sizes.md },
});

export const PurchasesScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { purchases, addPurchase, updatePurchase, deletePurchase, settings, contacts, products, selectedFY, selectedCompanyId } = useApp();
    const { canDelete } = useAuth();
    const { colors } = useTheme();
    const [modalVisible, setModalVisible] = useState(false);
    const [datePickerVisible, setDatePickerVisible] = useState(false);
    const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);

    const companyContacts = useMemo(() => contacts.filter(c => (c.companyId || 'default') === selectedCompanyId), [contacts, selectedCompanyId]);
    const companyProducts = useMemo(() => products.filter(p => (p.companyId || 'default') === selectedCompanyId), [products, selectedCompanyId]);

    // Form fields
    const [vendorName, setVendorName] = useState('');
    const [totalAmount, setTotalAmount] = useState('');
    const [paidAmount, setPaidAmount] = useState('');
    const [note, setNote] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
    const [selectedItems, setSelectedItems] = useState<SaleItem[]>([]);
    const [discountPercent, setDiscountPercent] = useState('');
    const [discountType, setDiscountType] = useState<'percent' | 'flat'>('percent');
    const [gstRate, setGstRate] = useState<number>(settings.gstRate || 0);

    // Date filter state
    const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [dateInputValue, setDateInputValue] = useState('');

    const slideAnim = useRef(new Animated.Value(100)).current;
    const sheetAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;

    const today = new Date().toISOString().split('T')[0];
    const currency = settings.currency;
    const styles = useMemo(() => createStyles(colors), [colors]);

    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: 0,
            tension: tokens.motion.spring.tension,
            friction: tokens.motion.spring.friction,
            useNativeDriver: true,
        }).start();
    }, [slideAnim]);

    useEffect(() => {
        if (modalVisible) {
            Animated.spring(sheetAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }).start();
        } else {
            sheetAnim.setValue(SHEET_HEIGHT);
        }
    }, [modalVisible, sheetAnim]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
            onPanResponderMove: (_, gestureState) => { if (gestureState.dy > 0) sheetAnim.setValue(gestureState.dy); },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 100 || gestureState.vy > 0.5) closeModal();
                else Animated.spring(sheetAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }).start();
            },
        })
    ).current;

    const closeModal = () => {
        Animated.timing(sheetAnim, { toValue: SHEET_HEIGHT, duration: 250, useNativeDriver: true }).start(() => setModalVisible(false));
    };

    const handleAdd = () => {
        setEditingPurchase(null);
        setVendorName('');
        setTotalAmount('');
        setPaidAmount('');
        setNote('');
        setPaymentMethod('Cash');
        setSelectedItems([]);
        setDiscountPercent('');
        setDiscountType('percent');
        setGstRate(settings.gstRate || 0);
        setModalVisible(true);
    };

    const handleEdit = (purchase: Purchase) => {
        setEditingPurchase(purchase);
        setVendorName(purchase.vendorName || '');
        const subtotal = purchase.subtotal || purchase.totalAmount || 0;
        const paid = purchase.paidAmount ?? purchase.totalAmount ?? 0;
        setTotalAmount(subtotal.toString());
        setPaidAmount(paid.toString());
        setNote(purchase.note || '');
        setPaymentMethod(purchase.paymentMethod || 'Cash');
        setSelectedItems(purchase.items || []);

        const savedType = purchase.discountType || 'percent';
        setDiscountType(savedType);
        if (purchase.discountTotal && purchase.discountTotal > 0) {
            if (savedType === 'flat') {
                setDiscountPercent(purchase.discountTotal.toString());
            } else if (purchase.subtotal && purchase.subtotal > 0) {
                const discountPct = (purchase.discountTotal / purchase.subtotal) * 100;
                setDiscountPercent(discountPct.toString());
            } else {
                setDiscountPercent('');
            }
            setDiscountPercent('');
        }
        setGstRate(purchase.gstRate ?? settings.gstRate ?? 0);
        setModalVisible(true);
    };

    const handleProductSelect = (product: Product) => {
        const existingIndex = selectedItems.findIndex(item => item.productId === product.id);
        if (existingIndex > -1) {
            // Increment quantity if already exists
            const newItems = [...selectedItems];
            newItems[existingIndex].quantity += 1;
            setSelectedItems(newItems);
            const newTotal = newItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
            setTotalAmount(newTotal.toString());
        } else {
            const newItem: SaleItem = {
                productId: product.id,
                productName: product.name,
                quantity: 1,
                unitPrice: product.costPrice || product.unitPrice,
                costPrice: product.costPrice,
            };
            const newItems = [...selectedItems, newItem];
            setSelectedItems(newItems);
            const newTotal = newItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
            setTotalAmount(newTotal.toString());
        }
    };

    const updateItemPrice = (productId: string, priceText: string) => {
        const price = parseFloat(priceText) || 0;
        const newItems = selectedItems.map(item => {
            if (item.productId === productId) {
                return { ...item, unitPrice: price };
            }
            return item;
        });
        setSelectedItems(newItems);
        const newTotal = newItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
        setTotalAmount(newTotal.toString());
    };

    const updateItemName = (productId: string, newName: string) => {
        const newItems = selectedItems.map(item => {
            if (item.productId === productId) {
                return { ...item, productName: newName };
            }
            return item;
        });
        setSelectedItems(newItems);
    };

    const deleteItem = (productId: string) => {
        const newItems = selectedItems.filter(item => item.productId !== productId);
        setSelectedItems(newItems);
        const newTotal = newItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
        setTotalAmount(newTotal > 0 ? newTotal.toString() : '');
    };

    const updateItemQuantity = (productId: string, delta: number) => {
        const newItems = selectedItems.map(item => {
            if (item.productId === productId) {
                return { ...item, quantity: Math.max(1, item.quantity + delta) };
            }
            return item;
        });
        setSelectedItems(newItems);
        const newTotal = newItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
        setTotalAmount(newTotal.toString());
    };

    const handleDelete = (id: string) => {
        if (!canDelete) {
            Alert.alert('Access Denied', 'You do not have permission to delete purchase records.');
            return;
        }
        Alert.alert('Delete Purchase', 'This will rollback stock increments. Continue?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deletePurchase(id) },
        ]);
    };

    const handleSave = async () => {
        let parsedSubtotal = parseFloat(totalAmount);
        if (isNaN(parsedSubtotal)) {
            const mathResult = evaluateMath(totalAmount);
            if (mathResult !== null) parsedSubtotal = mathResult;
        }

        if (isNaN(parsedSubtotal) || parsedSubtotal <= 0) {
            Alert.alert('Error', 'Please enter a valid total amount');
            return;
        }

        const discountVal = parseFloat(discountPercent) || 0;
        const discountAmt = discountType === 'flat' ? discountVal : parsedSubtotal * discountVal / 100;
        const taxable = parsedSubtotal - discountAmt;
        const taxTotal = settings.gstEnabled ? (taxable * gstRate / 100) : 0;
        const cgst = settings.gstType === 'intra' ? taxTotal / 2 : 0;
        const sgst = settings.gstType === 'intra' ? taxTotal / 2 : 0;
        const igst = settings.gstType === 'inter' ? taxTotal : 0;

        const finalTotal = taxable + taxTotal;
        const parsedPaid = paidAmount ? parseFloat(paidAmount) : finalTotal;

        const purchaseData = {
            vendorName: vendorName.trim() || 'General Vendor',
            totalAmount: finalTotal,
            paidAmount: parsedPaid,
            note,
            paymentMethod,
            items: selectedItems,
            subtotal: parsedSubtotal,
            discountTotal: discountAmt,
            discountType,
            gstRate,
            taxTotal,
            cgst,
            sgst,
            igst,
        };

        if (editingPurchase) {
            await updatePurchase(editingPurchase.id, purchaseData);
        } else {
            await addPurchase({
                date: today,
                ...purchaseData,
            });
        }

        Alert.alert('Success', editingPurchase ? 'Purchase updated!' : 'Purchase saved!', [
            { text: 'OK', onPress: () => closeModal() }
        ]);
    };

    const handleTotalChange = (text: string) => {
        setTotalAmount(text);
        if (!paidAmount) setPaidAmount(text);
    };

    const handleFilterChange = (filter: DateFilterType) => {
        setDateFilter(filter);
        setSelectedDate(null);
    };

    const handleCalendarPress = () => {
        setDateInputValue(selectedDate || today);
        setDatePickerVisible(true);
    };

    const handleDateSelect = () => {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (dateRegex.test(dateInputValue)) {
            setSelectedDate(dateInputValue);
            setDatePickerVisible(false);
        } else {
            Alert.alert('Invalid Date', 'Please enter date in YYYY-MM-DD format');
        }
    };

    const clearSelectedDate = () => {
        setSelectedDate(null);
        setDatePickerVisible(false);
    };

    const fyFilteredPurchases = useMemo(() => {
        return purchases.filter(p => getFinancialYear(p.date) === selectedFY && (p.companyId || 'default') === selectedCompanyId);
    }, [purchases, selectedFY, selectedCompanyId]);

    // Filter purchases based on selected filter and date
    const filteredPurchases = useMemo(() => {
        return filterByDateRange(fyFilteredPurchases, dateFilter, selectedDate)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [fyFilteredPurchases, dateFilter, selectedDate]);

    const totalFiltered = useMemo(() => {
        return filteredPurchases.reduce((sum, p) => sum + (p.paidAmount || p.totalAmount), 0);
    }, [filteredPurchases]);

    const renderPurchaseItem = ({ item }: { item: Purchase }) => {
        const isToday = item.date === today;
        const subtitleParts: string[] = [];
        subtitleParts.push(item.paymentMethod);
        if (!isToday) subtitleParts.push(new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
        if (item.note) subtitleParts.push(item.note);

        return (
            <Pressable
                style={styles.listItem}
                onPress={() => handleEdit(item)}
                onLongPress={() => handleDelete(item.id)}
            >
                <View style={styles.listRow}>
                    <Text style={styles.listName} numberOfLines={1}>
                        {item.vendorName}
                    </Text>
                    <View style={styles.amountRow}>
                        <Text style={styles.listAmount}>
                            {currency} {(item.totalAmount || 0).toLocaleString()}
                        </Text>
                    </View>
                </View>
                {subtitleParts.length > 0 && (
                    <Text style={styles.listSubtitle} numberOfLines={1}>
                        {subtitleParts.join(' • ')}
                    </Text>
                )}
            </Pressable>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <Animated.View style={[styles.content, { transform: [{ translateY: slideAnim }] }]}>
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <View>
                            <Text style={styles.title}>Purchases</Text>
                            <Text style={styles.date}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
                        </View>
                        <TouchableOpacity style={styles.headerAddBtn} onPress={handleAdd}>
                            <Plus size={24} color={colors.brand.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <DateFilter
                    selected={dateFilter}
                    onFilterChange={handleFilterChange}
                    onCalendarPress={handleCalendarPress}
                    selectedDate={selectedDate}
                    colors={colors}
                />

                <Card style={styles.totalCard}>
                    <Text style={styles.totalLabel}>{getFilterLabel(dateFilter, selectedDate)} Payments</Text>
                    <Text style={styles.totalAmount}>{currency} {totalFiltered.toLocaleString()}</Text>
                </Card>

                <FlatList
                    data={filteredPurchases}
                    keyExtractor={(item) => item.id}
                    renderItem={renderPurchaseItem}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconContainer}>
                                <ShoppingCart size={48} color={colors.brand.primary} strokeWidth={1.5} />
                            </View>
                            <Text style={styles.emptyText}>No purchases found</Text>
                            <Text style={styles.emptySubtext}>
                                {dateFilter === 'today' ? 'Tap the button below to add a purchase' : 'Try a different date range'}
                            </Text>
                        </View>
                    }
                />
            </Animated.View>

            <Pressable style={({ pressed }) => [styles.floatingButton, pressed && styles.floatingButtonPressed]} onPress={handleAdd}>
                <Text style={styles.floatingButtonText}>+ Add Purchase</Text>
            </Pressable>

            {/* Date Picker Modal */}
            <Modal visible={datePickerVisible} animationType="fade" transparent={true}>
                <View style={styles.datePickerOverlay}>
                    <View style={styles.datePickerCard}>
                        <Text style={styles.datePickerTitle}>Select Date</Text>
                        <TextInput
                            style={styles.datePickerInput}
                            value={dateInputValue}
                            onChangeText={setDateInputValue}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={colors.text.muted}
                            keyboardType="numbers-and-punctuation"
                        />
                        <View style={styles.datePickerButtons}>
                            <Pressable style={styles.datePickerClearBtn} onPress={clearSelectedDate}>
                                <Text style={styles.datePickerClearText}>Clear</Text>
                            </Pressable>
                            <View style={styles.datePickerActions}>
                                <Pressable style={styles.datePickerCancelBtn} onPress={() => setDatePickerVisible(false)}>
                                    <Text style={styles.datePickerCancelText}>Cancel</Text>
                                </Pressable>
                                <Pressable style={styles.datePickerSelectBtn} onPress={handleDateSelect}>
                                    <Text style={styles.datePickerSelectText}>Select</Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={modalVisible} animationType="none" transparent={true}>
                <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <Pressable style={styles.modalBackdrop} onPress={closeModal} />
                    <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: sheetAnim }] }]}>
                        <View {...panResponder.panHandlers} style={styles.handleContainer}>
                            <View style={styles.handleBar} />
                        </View>
                        <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            <View style={styles.sheetContent}>
                                <Text style={styles.modalTitle}>{editingPurchase ? 'Edit Purchase' : 'Add Purchase'}</Text>

                                <Text style={[styles.sectionLabel, { color: colors.text.secondary }]}>Select Vendor</Text>
                                <ContactPicker
                                    contacts={companyContacts}
                                    colors={colors}
                                    filterType="Vendor"
                                    onSelect={(contact) => setVendorName(contact.name)}
                                />

                                <Input
                                    label="Vendor Name"
                                    placeholder="Enter vendor name"
                                    value={vendorName}
                                    onChangeText={setVendorName}
                                />

                                <Text style={[styles.sectionLabel, { color: colors.text.secondary }]}>Inventory Items</Text>
                                <ProductPicker
                                    products={companyProducts}
                                    colors={colors}
                                    selectedProducts={selectedItems.map(i => i.productId)}
                                    onSelect={handleProductSelect}
                                />

                                {selectedItems.length > 0 && (
                                    <View style={styles.selectedItemsList}>
                                        <View style={styles.tableHeader}>
                                            <Text style={[styles.tableHeaderText, { flex: 2 }]}>Item</Text>
                                            <Text style={[styles.tableHeaderText, { flex: 1.2, textAlign: 'center' }]}>Price</Text>
                                            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Qty</Text>
                                            <Text style={[styles.tableHeaderText, { flex: 1.2, textAlign: 'right' }]}>Total</Text>
                                            <Text style={[styles.tableHeaderText, { width: 30, textAlign: 'right' }]}></Text>
                                        </View>
                                        {selectedItems.map((item) => (
                                            <View key={item.productId} style={[styles.selectedItemRow, { borderBottomColor: colors.border.default }]}>
                                                <View style={{ flex: 2 }}>
                                                    {item.productId.startsWith('custom-') ? (
                                                        <TextInput
                                                            style={[styles.selectedItemName, { color: colors.text.primary, borderBottomWidth: 1, borderBottomColor: colors.border.default, padding: 0 }]}
                                                            value={item.productName}
                                                            onChangeText={(text) => updateItemName(item.productId, text)}
                                                            placeholder="Item Name"
                                                        />
                                                    ) : (
                                                        <Text style={[styles.selectedItemName, { color: colors.text.primary }]} numberOfLines={2}>{item.productName}</Text>
                                                    )}
                                                </View>

                                                <View style={{ flex: 1.2, alignItems: 'center' }}>
                                                    <View style={styles.priceInputContainer}>
                                                        <Text style={{ fontSize: 10, color: colors.text.muted }}>{currency}</Text>
                                                        <TextInput
                                                            style={[styles.priceInput, { color: colors.text.primary }]}
                                                            keyboardType="numeric"
                                                            value={item.unitPrice.toString()}
                                                            onChangeText={(text) => updateItemPrice(item.productId, text)}
                                                        />
                                                    </View>
                                                </View>

                                                <View style={{ flex: 1, alignItems: 'center' }}>
                                                    <View style={styles.quantityControlsTabular}>
                                                        <TouchableOpacity onPress={() => updateItemQuantity(item.productId, -1)}>
                                                            <Text style={[styles.qtyBtnTabular, { color: colors.brand.primary }]}>-</Text>
                                                        </TouchableOpacity>
                                                        <Text style={[styles.qtyValueTabular, { color: colors.text.primary }]}>{item.quantity}</Text>
                                                        <TouchableOpacity onPress={() => updateItemQuantity(item.productId, 1)}>
                                                            <Text style={[styles.qtyBtnTabular, { color: colors.brand.primary }]}>+</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>

                                                <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                                                    <Text style={[styles.rowTotalText, { color: colors.text.primary }]}>
                                                        {currency}{((item.unitPrice || 0) * (item.quantity || 0)).toLocaleString()}
                                                    </Text>
                                                </View>

                                                <View style={{ width: 30, alignItems: 'flex-end' }}>
                                                    <TouchableOpacity onPress={() => deleteItem(item.productId)} style={styles.deleteRowBtn}>
                                                        <Trash2 size={16} color={colors.semantic.error} />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={[styles.addGenericBtn, { borderColor: colors.brand.primary }]}
                                    onPress={() => {
                                        const id = `custom-${Date.now()}`;
                                        const newItem: SaleItem = {
                                            productId: id,
                                            productName: 'Custom Item',
                                            quantity: 1,
                                            unitPrice: 0,
                                        };
                                        const newItems = [...selectedItems, newItem];
                                        setSelectedItems(newItems);
                                    }}
                                >
                                    <Text style={[styles.addGenericText, { color: colors.brand.primary }]}>+ Add Custom Row</Text>
                                </TouchableOpacity>

                                <Input
                                    label="Subtotal"
                                    placeholder="Enter purchase amount"
                                    keyboardType="numeric"
                                    value={totalAmount}
                                    onChangeText={handleTotalChange}
                                />

                                <View>
                                    <Text style={[styles.sectionLabel, { color: colors.text.secondary, marginBottom: 6 }]}>Discount</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <View style={{ flexDirection: 'row', backgroundColor: colors.semantic.background, borderRadius: tokens.radius.md, padding: 3 }}>
                                            <Pressable
                                                style={[{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: tokens.radius.sm, alignItems: 'center' }, discountType === 'percent' && { backgroundColor: colors.brand.primary }]}
                                                onPress={() => setDiscountType('percent')}
                                            >
                                                <Text style={{ fontSize: 14, fontFamily: tokens.typography.fontFamily.medium, color: discountType === 'percent' ? colors.text.inverse : colors.text.primary }}>%</Text>
                                            </Pressable>
                                            <Pressable
                                                style={[{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: tokens.radius.sm, alignItems: 'center' }, discountType === 'flat' && { backgroundColor: colors.brand.primary }]}
                                                onPress={() => setDiscountType('flat')}
                                            >
                                                <Text style={{ fontSize: 14, fontFamily: tokens.typography.fontFamily.medium, color: discountType === 'flat' ? colors.text.inverse : colors.text.primary }}>{currency}</Text>
                                            </Pressable>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Input
                                                placeholder={discountType === 'percent' ? 'Discount %' : `Flat amount (${currency})`}
                                                keyboardType="numeric"
                                                value={discountPercent}
                                                onChangeText={setDiscountPercent}
                                            />
                                        </View>
                                    </View>
                                </View>

                                {settings.gstEnabled && (
                                    <View style={{ marginBottom: tokens.spacing.md }}>
                                        <Text style={[styles.sectionLabel, { color: colors.text.secondary }]}>GST Rate (%)</Text>
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            {[0, 5, 12, 18, 28].map((rate) => (
                                                <TouchableOpacity
                                                    key={rate}
                                                    style={[
                                                        styles.qtyBtn,
                                                        {
                                                            backgroundColor: gstRate === rate ? colors.brand.primary : colors.semantic.soft,
                                                            width: 48,
                                                            height: 40,
                                                            borderRadius: tokens.radius.sm
                                                        }
                                                    ]}
                                                    onPress={() => setGstRate(rate)}
                                                >
                                                    <Text style={{
                                                        color: gstRate === rate ? colors.text.inverse : colors.text.primary,
                                                        fontFamily: tokens.typography.fontFamily.medium,
                                                        fontSize: 12
                                                    }}>{rate}%</Text>
                                                </TouchableOpacity>
                                            ))}
                                            <TextInput
                                                style={[
                                                    styles.qtyBtn,
                                                    {
                                                        backgroundColor: ![0, 5, 12, 18, 28].includes(gstRate) ? colors.brand.primary : colors.semantic.soft,
                                                        width: 60,
                                                        height: 40,
                                                        borderRadius: tokens.radius.sm,
                                                        textAlign: 'center',
                                                        color: ![0, 5, 12, 18, 28].includes(gstRate) ? colors.text.inverse : colors.text.primary,
                                                        fontSize: 12
                                                    }
                                                ]}
                                                keyboardType="numeric"
                                                placeholder="Custom"
                                                onChangeText={(text) => {
                                                    const val = parseFloat(text);
                                                    if (!isNaN(val)) setGstRate(val);
                                                }}
                                                value={![0, 5, 12, 18, 28].includes(gstRate) ? gstRate.toString() : ''}
                                            />
                                        </View>
                                    </View>
                                )}

                                {totalAmount && parseFloat(totalAmount) > 0 && (
                                    <View style={[styles.priceBreakdown, { backgroundColor: colors.semantic.soft }]}>
                                        <View style={styles.breakdownRow}>
                                            <Text style={[styles.breakdownLabel, { color: colors.text.secondary }]}>Subtotal</Text>
                                            <Text style={[styles.breakdownValue, { color: colors.text.primary }]}>
                                                {currency}{parseFloat(totalAmount).toLocaleString()}
                                            </Text>
                                        </View>
                                        {discountPercent && parseFloat(discountPercent) > 0 && (() => {
                                            const sub = parseFloat(totalAmount) || 0;
                                            const dVal = parseFloat(discountPercent) || 0;
                                            const dAmt = discountType === 'flat' ? dVal : sub * dVal / 100;
                                            return (
                                                <View style={styles.breakdownRow}>
                                                    <Text style={[styles.breakdownLabel, { color: '#28a745' }]}>Discount</Text>
                                                    <Text style={[styles.breakdownValue, { color: '#28a745' }]}>
                                                        -{currency}{dAmt.toLocaleString()}
                                                    </Text>
                                                </View>
                                            );
                                        })()}
                                        {settings.gstEnabled && (() => {
                                            const sub = parseFloat(totalAmount) || 0;
                                            const dVal = parseFloat(discountPercent) || 0;
                                            const dAmt = discountType === 'flat' ? dVal : sub * dVal / 100;
                                            const taxable = sub - dAmt;
                                            const rate = gstRate;
                                            if (rate <= 0) return null;

                                            if (settings.gstType === 'inter') {
                                                const igst = taxable * rate / 100;
                                                return (
                                                    <View style={styles.breakdownRow}>
                                                        <Text style={[styles.breakdownLabel, { color: colors.text.secondary }]}>IGST ({rate}%)</Text>
                                                        <Text style={[styles.breakdownValue, { color: colors.text.primary }]}>
                                                            +{currency}{igst.toLocaleString()}
                                                        </Text>
                                                    </View>
                                                );
                                            } else {
                                                const halfRate = rate / 2;
                                                const cgst = (taxable * rate / 100) / 2;
                                                return (
                                                    <>
                                                        <View style={styles.breakdownRow}>
                                                            <Text style={[styles.breakdownLabel, { color: colors.text.secondary }]}>CGST ({halfRate}%)</Text>
                                                            <Text style={[styles.breakdownValue, { color: colors.text.primary }]}>
                                                                +{currency}{cgst.toLocaleString()}
                                                            </Text>
                                                        </View>
                                                        <View style={styles.breakdownRow}>
                                                            <Text style={[styles.breakdownLabel, { color: colors.text.secondary }]}>SGST ({halfRate}%)</Text>
                                                            <Text style={[styles.breakdownValue, { color: colors.text.primary }]}>
                                                                +{currency}{cgst.toLocaleString()}
                                                            </Text>
                                                        </View>
                                                    </>
                                                );
                                            }
                                        })()}
                                        <View style={[styles.breakdownRow, styles.grandTotalRow]}>
                                            <Text style={[styles.breakdownLabel, { color: colors.text.primary, fontWeight: 'bold' }]}>Total Payable</Text>
                                            <Text style={[styles.breakdownValue, { color: colors.brand.primary, fontWeight: 'bold' }]}>
                                                {currency}{(() => {
                                                    const sub = parseFloat(totalAmount) || 0;
                                                    const dVal = parseFloat(discountPercent) || 0;
                                                    const dAmt = discountType === 'flat' ? dVal : sub * dVal / 100;
                                                    const taxable = sub - dAmt;
                                                    const taxAmt = settings.gstEnabled ? taxable * gstRate / 100 : 0;
                                                    return (taxable + taxAmt).toLocaleString();
                                                })()}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                <Input
                                    label="Amount Paid"
                                    placeholder="Amount handed over"
                                    keyboardType="numeric"
                                    value={paidAmount}
                                    onChangeText={setPaidAmount}
                                />

                                <PaymentMethodControl selected={paymentMethod} onChange={setPaymentMethod} colors={colors} />
                                <Input label="Note" placeholder="Enter note" value={note} onChangeText={setNote} />

                                <View style={styles.modalButtons}>
                                    <Pressable style={[styles.modalBtn, styles.cancelBtn]} onPress={closeModal}>
                                        <Text style={styles.cancelBtnText}>Cancel</Text>
                                    </Pressable>
                                    <Pressable style={[styles.modalBtn, styles.saveBtn]} onPress={handleSave}>
                                        <Text style={styles.saveBtnText}>Save</Text>
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

const createStyles = (colors: typeof tokens.colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.semantic.background },
    content: { flex: 1, paddingHorizontal: tokens.spacing.md },
    header: { paddingTop: tokens.spacing.md, paddingBottom: tokens.spacing.md },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerAddBtn: { padding: tokens.spacing.xs, backgroundColor: colors.semantic.surface, borderRadius: tokens.radius.pill, borderWidth: 1, borderColor: colors.border.default },
    title: { fontSize: tokens.typography.sizes.xxl, color: colors.brand.secondary, fontFamily: tokens.typography.fontFamily.bold },
    date: { fontSize: tokens.typography.sizes.sm, color: colors.text.secondary, marginTop: tokens.spacing.xxs, fontFamily: tokens.typography.fontFamily.medium },
    totalCard: { backgroundColor: colors.semantic.error, marginBottom: tokens.spacing.md, padding: tokens.spacing.md },
    totalLabel: { fontSize: tokens.typography.sizes.sm, color: colors.text.inverse, opacity: 0.9, fontFamily: tokens.typography.fontFamily.medium },
    totalAmount: { fontSize: tokens.typography.sizes.xxl, color: colors.text.inverse, fontFamily: tokens.typography.fontFamily.bold },
    listContent: { paddingBottom: 100 },
    listItem: { paddingVertical: tokens.spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border.default },
    listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    listName: { flex: 1, fontSize: tokens.typography.sizes.md, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.semibold },
    amountRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.xs },
    listAmount: { fontSize: tokens.typography.sizes.md, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.bold },
    listSubtitle: { fontSize: tokens.typography.sizes.xs, color: colors.text.secondary, marginTop: 4 },
    floatingButton: { position: 'absolute', bottom: 30, right: 20, backgroundColor: colors.brand.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30, ...tokens.shadow.floatingButton },
    floatingButtonPressed: { opacity: 0.8, transform: [{ scale: tokens.motion.scale.pressIn }] },
    floatingButtonText: { color: colors.text.inverse, fontSize: tokens.typography.sizes.md, fontFamily: tokens.typography.fontFamily.bold },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyIconContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.semantic.soft, alignItems: 'center', justifyContent: 'center', marginBottom: tokens.spacing.md },
    emptyText: { fontSize: 18, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.bold },
    emptySubtext: { fontSize: 14, color: colors.text.muted, textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    bottomSheet: { backgroundColor: colors.semantic.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: SHEET_HEIGHT },
    handleContainer: { height: 30, alignItems: 'center', justifyContent: 'center' },
    handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border.default },
    sheetScroll: { flex: 1 },
    sheetContent: { padding: tokens.spacing.md, paddingBottom: 50 },
    modalTitle: { fontSize: 20, fontFamily: tokens.typography.fontFamily.bold, color: colors.text.primary, marginBottom: tokens.spacing.md },
    sectionLabel: { fontSize: 14, fontFamily: tokens.typography.fontFamily.semibold, marginTop: tokens.spacing.md, marginBottom: tokens.spacing.xs },
    // Multi-item styles
    selectedItemsList: { marginBottom: tokens.spacing.md },
    tableHeader: {
        flexDirection: 'row',
        paddingHorizontal: 8,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.default,
        marginBottom: 8
    },
    tableHeaderText: {
        fontSize: 10,
        color: colors.text.muted,
        fontFamily: tokens.typography.fontFamily.bold,
        textTransform: 'uppercase'
    },
    selectedItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    selectedItemName: { fontSize: 13, fontFamily: tokens.typography.fontFamily.medium },
    priceInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.semantic.background,
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: colors.border.default
    },
    priceInput: {
        fontSize: 12,
        fontFamily: tokens.typography.fontFamily.bold,
        marginLeft: 2,
        minWidth: 40,
        textAlign: 'right',
        padding: 0
    },
    quantityControlsTabular: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.semantic.soft,
        borderRadius: 6,
        paddingVertical: 2
    },
    qtyBtnTabular: {
        fontSize: 16,
        fontWeight: 'bold',
        paddingHorizontal: 8
    },
    qtyValueTabular: {
        fontSize: 12,
        minWidth: 20,
        textAlign: 'center',
        fontFamily: tokens.typography.fontFamily.bold
    },
    deleteRowBtn: {
        padding: 6,
    },
    rowTotalText: {
        fontSize: 12,
        fontFamily: tokens.typography.fontFamily.bold,
    },
    addGenericBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: tokens.radius.md,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        marginBottom: tokens.spacing.lg
    },
    addGenericText: {
        fontSize: 14,
        fontFamily: tokens.typography.fontFamily.semibold
    },
    quantityControls: { flexDirection: 'row', alignItems: 'center' },
    qtyBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 15 },
    qtyValue: { fontSize: 16, fontFamily: tokens.typography.fontFamily.bold, minWidth: 20, textAlign: 'center' },
    priceBreakdown: { padding: 16, borderRadius: tokens.radius.md, marginTop: tokens.spacing.md, marginBottom: tokens.spacing.md },
    breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    breakdownLabel: { fontSize: 14, fontFamily: tokens.typography.fontFamily.regular },
    breakdownValue: { fontSize: 14, fontFamily: tokens.typography.fontFamily.medium },
    grandTotalRow: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border.default },
    modalButtons: { flexDirection: 'row', gap: 12, marginTop: tokens.spacing.xl },
    modalBtn: { flex: 1, paddingVertical: 14, borderRadius: tokens.radius.md, alignItems: 'center' },
    cancelBtn: { backgroundColor: colors.semantic.soft },
    cancelBtnText: { color: colors.text.primary, fontFamily: tokens.typography.fontFamily.bold },
    saveBtn: { backgroundColor: colors.brand.primary },
    saveBtnText: { color: colors.text.inverse, fontFamily: tokens.typography.fontFamily.bold },
    datePickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    datePickerCard: { backgroundColor: colors.semantic.surface, borderRadius: 20, padding: 20 },
    datePickerTitle: { fontSize: 18, fontFamily: tokens.typography.fontFamily.bold, color: colors.text.primary, marginBottom: 15 },
    datePickerInput: { borderBottomWidth: 1, borderBottomColor: colors.brand.primary, paddingVertical: 10, fontSize: 16, color: colors.text.primary, marginBottom: 20 },
    datePickerButtons: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    datePickerClearBtn: { padding: 10 },
    datePickerClearText: { color: colors.semantic.error, fontFamily: tokens.typography.fontFamily.medium },
    datePickerActions: { flexDirection: 'row', gap: 15 },
    datePickerCancelBtn: { padding: 10 },
    datePickerCancelText: { color: colors.text.muted, fontFamily: tokens.typography.fontFamily.medium },
    datePickerSelectBtn: { backgroundColor: colors.brand.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
    datePickerSelectText: { color: colors.text.inverse, fontFamily: tokens.typography.fontFamily.bold },
});
