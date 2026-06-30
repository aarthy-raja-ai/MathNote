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
import { useNavigation, useRoute } from '@react-navigation/native';
import { Pencil, Trash2, Share2, FileText, RotateCcw, TrendingUp, Percent, Zap, ZapOff } from 'lucide-react-native';
import { Card, Input, DateFilter, filterByDateRange, getFilterLabel, ContactPicker, ProductPicker, QuickAddGrid } from '../components';
import type { DateFilterType } from '../components';
import { tokens, useTheme } from '../theme';
import { useApp, useAuth } from '../context';
import { Sale, Product, SaleItem } from '../utils/storage';
import { evaluateMath } from '../utils/mathEvaluator';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.70;

type PaymentMethod = 'Cash' | 'UPI';

// Payment Method Segmented Control
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

export const SalesScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { sales, addSale, updateSale, deleteSale, addReturn, settings, updateSettings, contacts, products, returns } = useApp();
    const { canDelete } = useAuth();
    const { colors } = useTheme();
    const [modalVisible, setModalVisible] = useState(false);
    const [datePickerVisible, setDatePickerVisible] = useState(false);
    const [editingSale, setEditingSale] = useState<Sale | null>(null);
    const [expressMode, setExpressMode] = useState(false);

    // Form fields
    const [customerName, setCustomerName] = useState('');
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
        if (route?.params?.productId) {
            const prodId = route.params.productId;
            if (navigation) {
                navigation.setParams({ productId: undefined });
            }

            const product = products.find(p => p.id === prodId);
            if (product) {
                setEditingSale(null);
                setCustomerName(expressMode ? 'Walk-in' : '');
                setNote('');
                setPaymentMethod('Cash');
                setDiscountPercent('');
                setDiscountType('percent');
                setGstRate(settings.gstRate || 0);

                const newItem: SaleItem = {
                    productId: product.id,
                    productName: product.name,
                    quantity: 1,
                    unitPrice: product.unitPrice,
                    costPrice: product.costPrice,
                };
                setSelectedItems([newItem]);
                setTotalAmount(product.unitPrice.toString());
                setPaidAmount(product.unitPrice.toString());
                setModalVisible(true);
            }
        }
    }, [route?.params]);

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
        setEditingSale(null);
        setCustomerName(expressMode ? 'Walk-in' : '');
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

    const handleEdit = (sale: Sale) => {
        setEditingSale(sale);
        setCustomerName(sale.customerName || '');
        // Use subtotal if available (new format), otherwise use totalAmount
        const subtotal = sale.subtotal || sale.totalAmount || 0;
        const paid = sale.paidAmount ?? sale.totalAmount ?? 0;
        setTotalAmount(subtotal.toString());
        setPaidAmount(paid.toString());
        setNote(sale.note || '');
        setPaymentMethod(sale.paymentMethod || 'Cash');
        setSelectedItems(sale.items || []);
        // Restore discount
        const savedType = sale.discountType || 'percent';
        setDiscountType(savedType);
        if (sale.discountTotal && sale.discountTotal > 0) {
            if (savedType === 'flat') {
                setDiscountPercent(sale.discountTotal.toString());
            } else if (sale.subtotal && sale.subtotal > 0) {
                const discountPct = (sale.discountTotal / sale.subtotal) * 100;
                setDiscountPercent(discountPct.toString());
            } else {
                setDiscountPercent('');
            }
        } else {
            setDiscountPercent('');
        }
        setGstRate(sale.gstRate ?? settings.gstRate ?? 0);
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
                brand: product.brand,
                quantity: 1,
                unitPrice: product.unitPrice,
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
            Alert.alert('Access Denied', 'You do not have permission to delete sales records.');
            return;
        }
        Alert.alert('Delete Sale', 'This will also delete any linked credit. Continue?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteSale(id) },
        ]);
    };

    const handleReturn = (sale: Sale) => {
        const { total, paid } = getSaleAmount(sale);

        // Check if already returned
        const isReturned = returns.some(r => r.saleId === sale.id);
        if (isReturned) {
            Alert.alert('Already Returned', 'This sale has already been returned.');
            return;
        }

        Alert.alert(
            'Return Sale',
            `Are you sure you want to return this sale? Total amount: ${currency}${total.toLocaleString()}\n\nThis will restore product stock and update balance.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Return Sale',
                    style: 'destructive',
                    onPress: () => addReturn({
                        saleId: sale.id,
                        date: today,
                        amount: paid, // Money refunded (deducted from balance)
                        note: `Return of sale (${currency}${total} total) to ${sale.customerName || 'Walk-in'} on ${sale.date}`,
                    })
                },
            ]
        );
    };

    const handleSave = async () => {
        let parsedSubtotal = parseFloat(totalAmount);

        // If parsing fails, try math evaluation
        if (isNaN(parsedSubtotal)) {
            const mathResult = evaluateMath(totalAmount);
            if (mathResult !== null) parsedSubtotal = mathResult;
        }

        if (isNaN(parsedSubtotal) || parsedSubtotal <= 0) {
            Alert.alert('Error', 'Please enter a valid total amount');
            return;
        }

        // Calculate billing amounts
        const discountVal = parseFloat(discountPercent) || 0;
        const discountAmt = discountType === 'flat' ? discountVal : parsedSubtotal * discountVal / 100;
        const taxableAmount = parsedSubtotal - discountAmt;

        // Find contact to check their state and other details
        const contact = contacts.find(c => c.name.trim().toLowerCase() === customerName.trim().toLowerCase());
        const customerState = contact?.state || '';
        const businessState = settings.businessState || '';

        let taxTotal = 0, cgst = 0, sgst = 0, igst = 0;
        if (settings.gstEnabled) {
            const rate = settings.gstRate || 18;
            let isInter = settings.gstType === 'inter';
            if (businessState && customerState) {
                isInter = customerState !== businessState;
            }

            if (isInter) {
                igst = taxableAmount * rate / 100;
                taxTotal = igst;
            } else {
                cgst = taxableAmount * (rate / 2) / 100;
                sgst = cgst;
                taxTotal = cgst + sgst;
            }
        }

        const grandTotal = taxableAmount + taxTotal;
        const parsedPaid = paidAmount ? parseFloat(paidAmount) : grandTotal;

        if (parsedPaid > grandTotal) {
            Alert.alert('Error', 'Paid amount cannot exceed total amount');
            return;
        }
        if (parsedPaid < grandTotal && !customerName.trim()) {
            Alert.alert('Error', 'Customer name is required for partial payments');
            return;
        }

        // Generate invoice number for new sales
        let invoiceNumber: string | undefined;
        if (!editingSale) {
            const prefix = settings.invoicePrefix || 'INV';
            const nextNum = (settings.lastInvoiceNumber || 0) + 1;
            invoiceNumber = `${prefix}-${nextNum.toString().padStart(4, '0')}`;
        }

        const saleData = {
            customerName: customerName.trim() || 'General Customer',
            customerState: contact?.state || undefined,
            customerAddress: contact?.address || undefined,
            customerPhone: contact?.phone || undefined,
            customerGSTIN: contact?.gstin || undefined,
            totalAmount: grandTotal,
            paidAmount: parsedPaid,
            note,
            paymentMethod,
            items: selectedItems,
            // Billing details
            subtotal: parsedSubtotal,
            discountTotal: discountAmt,
            discountType,
            gstRate,
            taxTotal,
            cgst: cgst || undefined,
            sgst: sgst || undefined,
            igst: igst || undefined,
            invoiceNumber: editingSale ? editingSale.invoiceNumber : invoiceNumber,
        };

        if (editingSale) {
            await updateSale(editingSale.id, saleData);
        } else {
            await addSale({
                date: today,
                ...saleData,
            });
            // Increment invoice number counter
            await updateSettings({ lastInvoiceNumber: (settings.lastInvoiceNumber || 0) + 1 });
        }

        if (expressMode && !editingSale) {
            // In express mode, just close and show a small feedback if possible, or just reset
            closeModal();
            return;
        }

        // Show success message and close modal
        Alert.alert('Success', editingSale ? 'Sale updated successfully!' : 'Invoice saved successfully!', [
            { text: 'OK', onPress: () => closeModal() }
        ]);
    };

    // Auto-fill paid amount when total changes
    const handleTotalChange = (text: string) => {
        setTotalAmount(text);
        if (!paidAmount) setPaidAmount(text);
    };

    // Date filter handlers
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

    // Helper to get sale amounts (handles legacy data)
    const getSaleAmount = (sale: Sale) => {
        const total = sale.totalAmount ?? sale.paidAmount ?? 0;
        const paid = sale.paidAmount ?? sale.totalAmount ?? 0;
        return { total, paid };
    };

    // Navigate to invoice preview
    const handleSharePress = (sale: Sale) => {
        navigation.navigate('InvoicePreview', { sale });
    };

    // Filter sales based on selected filter and date
    const filteredSales = filterByDateRange(sales, dateFilter, selectedDate)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const totalFiltered = filteredSales.reduce((sum, s) => sum + (getSaleAmount(s).paid), 0);

    const renderSaleItem = ({ item }: { item: Sale }) => {
        const { total, paid } = getSaleAmount(item);
        const isPartial = paid < total && total > 0;
        const remaining = total - paid;
        const isToday = item.date === today;

        // Build subtitle parts
        const subtitleParts: string[] = [];
        if (item.invoiceNumber) subtitleParts.push(item.invoiceNumber);
        if (item.paymentMethod) subtitleParts.push(item.paymentMethod);
        if (isPartial) subtitleParts.push(`Due: ${currency}${remaining}`);
        if (!isToday) subtitleParts.push(new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
        if (item.note) subtitleParts.push(item.note);

        return (
            <Pressable
                style={styles.listItem}
                onPress={() => handleEdit(item)}
                onLongPress={() => handleDelete(item.id)}
            >
                {/* Row 1: Customer name + Amount */}
                <View style={styles.listRow}>
                    <Text style={styles.listName} numberOfLines={1} ellipsizeMode="tail">
                        {item.customerName || 'Walk-in'}
                    </Text>
                    <View style={styles.amountRow}>
                        {isPartial && <View style={styles.partialDot} />}
                        <Text style={styles.listAmount}>
                            {currency} {total.toLocaleString()}
                        </Text>
                        <Pressable
                            onPress={() => handleSharePress(item)}
                            style={styles.shareButton}
                        >
                            <Share2 size={18} color={colors.brand.primary} />
                        </Pressable>
                        <Pressable
                            onPress={() => handleReturn(item)}
                            style={styles.shareButton}
                        >
                            <RotateCcw size={18} color={colors.semantic.error} />
                        </Pressable>
                    </View>
                </View>

                {/* Row 2: Payment method, due amount, date, note */}
                {subtitleParts.length > 0 && (
                    <Text style={styles.listSubtitle} numberOfLines={1} ellipsizeMode="tail">
                        {subtitleParts.join(' • ')}
                    </Text>
                )}
            </Pressable>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <Animated.View style={[styles.content, { transform: [{ translateY: slideAnim }] }]}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.title}>Sales</Text>
                        <Text style={styles.date}>{getFilterLabel(dateFilter, selectedDate)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <Pressable
                            style={[styles.headerAddBtn, { backgroundColor: expressMode ? colors.brand.primary + '20' : colors.semantic.surface }]}
                            onPress={() => setExpressMode(!expressMode)}
                        >
                            {expressMode ? <Zap size={20} color={colors.brand.primary} /> : <ZapOff size={20} color={colors.text.secondary} />}
                        </Pressable>
                        <Pressable style={styles.headerAddBtn} onPress={handleAdd}>
                            <TrendingUp size={20} color={colors.brand.primary} />
                        </Pressable>
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
                    <Text style={styles.totalLabel}>{getFilterLabel(dateFilter, selectedDate)} Received</Text>
                    <Text style={styles.totalAmount}>{currency} {totalFiltered.toLocaleString()}</Text>
                </Card>

                <FlatList
                    data={filteredSales}
                    keyExtractor={(item) => item.id}
                    renderItem={renderSaleItem}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconContainer}>
                                <TrendingUp size={48} color={colors.brand.primary} strokeWidth={1.5} />
                            </View>
                            <Text style={styles.emptyText}>No sales found</Text>
                            <Text style={styles.emptySubtext}>
                                {dateFilter === 'today' ? 'Tap the button below to add your first sale' : 'Try a different date range'}
                            </Text>
                        </View>
                    }
                />
            </Animated.View>

            <Pressable style={({ pressed }) => [styles.floatingButton, pressed && styles.floatingButtonPressed]} onPress={handleAdd}>
                <Text style={styles.floatingButtonText}>+ Add Sale</Text>
            </Pressable>

            {/* Date Picker Modal */}
            <Modal visible={datePickerVisible} animationType="fade" transparent={true}>
                <View style={styles.datePickerOverlay}>
                    <View style={styles.datePickerCard}>
                        <Text style={styles.datePickerTitle}>Select Date</Text>
                        <Text style={styles.datePickerHint}>Enter date in YYYY-MM-DD format</Text>
                        <TextInput
                            style={styles.datePickerInput}
                            value={dateInputValue}
                            onChangeText={setDateInputValue}
                            placeholder="2024-01-15"
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
                                <Text style={styles.modalTitle}>{editingSale ? 'Edit Sale' : 'Add Sale'}</Text>

                                <Text style={[styles.sectionLabel, { color: colors.text.secondary }]}>Select Customer</Text>
                                <ContactPicker
                                    contacts={contacts}
                                    colors={colors}
                                    filterType="Customer"
                                    onSelect={(contact) => setCustomerName(contact.name)}
                                />

                                {/* Recent Customers Quick Select */}
                                {(() => {
                                    const recentCustomers = Array.from(new Set(
                                        sales
                                            .filter(s => s.customerName && s.customerName.trim())
                                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                            .map(s => s.customerName!.trim())
                                    )).slice(0, 5);

                                    if (recentCustomers.length === 0) return null;

                                    return (
                                        <View style={styles.recentCustomersContainer}>
                                            <Text style={[styles.recentLabel, { color: colors.text.muted }]}>Recent:</Text>
                                            <ScrollView
                                                horizontal
                                                showsHorizontalScrollIndicator={false}
                                                contentContainerStyle={styles.recentChipsRow}
                                            >
                                                {recentCustomers.map((name) => (
                                                    <Pressable
                                                        key={name}
                                                        style={[
                                                            styles.recentChip,
                                                            { backgroundColor: customerName === name ? colors.brand.primary : colors.semantic.soft }
                                                        ]}
                                                        onPress={() => setCustomerName(name)}
                                                    >
                                                        <Text style={[
                                                            styles.recentChipText,
                                                            { color: customerName === name ? colors.text.inverse : colors.text.primary }
                                                        ]}>
                                                            {name}
                                                        </Text>
                                                    </Pressable>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    );
                                })()}

                                <Input
                                    label="Customer Name"
                                    placeholder="Enter customer name (optional)"
                                    value={customerName}
                                    onChangeText={setCustomerName}
                                />

                                <Text style={[styles.sectionLabel, { color: colors.text.secondary }]}>Inventory Items</Text>
                                {expressMode && (
                                    <QuickAddGrid
                                        products={products}
                                        colors={colors}
                                        onSelect={handleProductSelect}
                                    />
                                )}

                                <ProductPicker
                                    products={products}
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
                                                        {currency}{(item.unitPrice * item.quantity).toLocaleString()}
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
                                    label="Total Amount"
                                    placeholder="Enter total amount"
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

                                {/* Price Breakdown */}
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
                                            const dLabel = discountType === 'flat' ? `Discount (${currency}${dVal})` : `Discount (${discountPercent}%)`;
                                            return (
                                                <View style={styles.breakdownRow}>
                                                    <Text style={[styles.breakdownLabel, { color: '#28a745' }]}>{dLabel}</Text>
                                                    <Text style={[styles.breakdownValue, { color: '#28a745' }]}>
                                                        -{currency}{dAmt.toLocaleString()}
                                                    </Text>
                                                </View>
                                            );
                                        })()}
                                        {settings.gstEnabled && (() => {
                                            const subtotal = parseFloat(totalAmount) || 0;
                                            const dv = parseFloat(discountPercent) || 0;
                                            const discountAmt = discountPercent ? (discountType === 'flat' ? dv : subtotal * dv / 100) : 0;
                                            const taxable = subtotal - discountAmt;
                                            const rate = gstRate;
                                            if (rate <= 0) return null;

                                            if (settings.gstType === 'inter') {
                                                const igst = taxable * rate / 100;
                                                return (
                                                    <View style={styles.breakdownRow}>
                                                        <Text style={[styles.breakdownLabel, { color: colors.text.muted }]}>IGST ({rate}%)</Text>
                                                        <Text style={[styles.breakdownValue, { color: colors.text.secondary }]}>
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
                                                            <Text style={[styles.breakdownLabel, { color: colors.text.muted }]}>CGST ({halfRate}%)</Text>
                                                            <Text style={[styles.breakdownValue, { color: colors.text.secondary }]}>
                                                                +{currency}{cgst.toLocaleString()}
                                                            </Text>
                                                        </View>
                                                        <View style={styles.breakdownRow}>
                                                            <Text style={[styles.breakdownLabel, { color: colors.text.muted }]}>SGST ({halfRate}%)</Text>
                                                            <Text style={[styles.breakdownValue, { color: colors.text.secondary }]}>
                                                                +{currency}{cgst.toLocaleString()}
                                                            </Text>
                                                        </View>
                                                    </>
                                                );
                                            }
                                        })()}
                                        <View style={[styles.breakdownRow, styles.grandTotalRow]}>
                                            <Text style={[styles.breakdownLabel, { color: colors.text.primary, fontWeight: 'bold' }]}>Grand Total</Text>
                                            <Text style={[styles.breakdownValue, { color: colors.brand.primary, fontWeight: 'bold', fontSize: 18 }]}>
                                                {currency}{(() => {
                                                    const subtotal = parseFloat(totalAmount) || 0;
                                                    const dv2 = parseFloat(discountPercent) || 0;
                                                    const discountAmt = discountPercent ? (discountType === 'flat' ? dv2 : subtotal * dv2 / 100) : 0;
                                                    const taxable = subtotal - discountAmt;
                                                    const taxAmt = settings.gstEnabled ? taxable * gstRate / 100 : 0;
                                                    return (taxable + taxAmt).toLocaleString();
                                                })()}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                <Input
                                    label="Amount Paid"
                                    placeholder="Leave empty for full payment"
                                    keyboardType="numeric"
                                    value={paidAmount}
                                    onChangeText={setPaidAmount}
                                />

                                {paidAmount && totalAmount && parseFloat(paidAmount) < parseFloat(totalAmount) && (
                                    <View style={styles.partialNote}>
                                        <Text style={styles.partialNoteText}>
                                            💡 Remaining {currency}{(parseFloat(totalAmount) - parseFloat(paidAmount)).toLocaleString()} will be added as credit
                                        </Text>
                                    </View>
                                )}

                                <PaymentMethodControl selected={paymentMethod} onChange={setPaymentMethod} colors={colors} />
                                <Input label="Note (optional)" placeholder="Enter note" value={note} onChangeText={setNote} />

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
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: tokens.spacing.md,
        paddingBottom: tokens.spacing.md,
    },
    headerAddBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.semantic.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: { fontSize: tokens.typography.sizes.xxl, color: colors.brand.secondary, fontFamily: tokens.typography.fontFamily.bold },
    date: { fontSize: tokens.typography.sizes.sm, color: colors.text.secondary, marginTop: tokens.spacing.xxs, fontFamily: tokens.typography.fontFamily.medium },
    totalCard: { backgroundColor: colors.brand.primary, marginBottom: tokens.spacing.md, padding: tokens.spacing.md },
    totalLabel: { fontSize: tokens.typography.sizes.sm, color: colors.text.inverse, opacity: 0.9, fontFamily: tokens.typography.fontFamily.medium },
    totalAmount: { fontSize: tokens.typography.sizes.xxl, color: colors.text.inverse, fontFamily: tokens.typography.fontFamily.bold, marginTop: tokens.spacing.xxs },
    listContent: { paddingBottom: 100 },

    // Compact List Item
    listItem: {
        paddingVertical: 10,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.default,
    },
    listRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
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
    partialDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.brand.primary,
    },
    listAmount: {
        fontSize: 14,
        color: colors.brand.secondary,
        fontFamily: tokens.typography.fontFamily.bold,
    },
    shareButton: {
        padding: 5,
        marginLeft: 4,
    },
    listSubtitle: {
        fontSize: 12,
        color: colors.text.muted,
        fontFamily: tokens.typography.fontFamily.regular,
        marginTop: 2,
    },

    emptyContainer: { alignItems: 'center', paddingVertical: tokens.spacing.xxl },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.semantic.soft,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: tokens.spacing.md
    },
    emptyText: { fontSize: tokens.typography.sizes.lg, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.medium },
    emptySubtext: { fontSize: tokens.typography.sizes.sm, color: colors.text.muted, marginTop: tokens.spacing.xs, fontFamily: tokens.typography.fontFamily.regular },

    floatingButton: { position: 'absolute', bottom: 110, alignSelf: 'center', backgroundColor: colors.brand.primary, height: 52, minWidth: 200, borderRadius: 26, justifyContent: 'center', alignItems: 'center', paddingHorizontal: tokens.spacing.lg, ...tokens.shadow.floatingButton },
    floatingButtonPressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },
    floatingButtonText: { color: colors.text.inverse, fontSize: tokens.typography.sizes.lg, fontFamily: tokens.typography.fontFamily.semibold },

    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    bottomSheet: { backgroundColor: colors.semantic.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: SCREEN_HEIGHT * 0.85 },
    handleContainer: { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
    handleBar: { width: 40, height: 4, backgroundColor: colors.border.default, borderRadius: 2 },
    sheetScroll: { maxHeight: SCREEN_HEIGHT * 0.75 },
    sheetContent: { padding: tokens.spacing.lg, paddingBottom: tokens.spacing.xxl },
    modalTitle: { fontSize: tokens.typography.sizes.xl, color: colors.text.primary, marginBottom: tokens.spacing.md, textAlign: 'center', fontFamily: tokens.typography.fontFamily.bold },
    sectionLabel: { fontSize: 12, fontFamily: tokens.typography.fontFamily.medium, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    partialNote: { backgroundColor: colors.semantic.soft, padding: tokens.spacing.sm, borderRadius: tokens.radius.md, marginBottom: tokens.spacing.md },
    partialNoteText: { fontSize: tokens.typography.sizes.sm, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.regular },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: tokens.spacing.lg, gap: 12 },
    modalBtn: { flex: 1, paddingVertical: 14, borderRadius: tokens.radius.md, alignItems: 'center' },
    cancelBtn: { backgroundColor: colors.semantic.background },
    cancelBtnText: { fontSize: tokens.typography.sizes.md, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.semibold },
    saveBtn: { backgroundColor: colors.brand.primary },
    saveBtnText: { fontSize: tokens.typography.sizes.md, color: colors.text.inverse, fontFamily: tokens.typography.fontFamily.semibold },
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
    qtyBtn: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    qtyValue: { width: 30, textAlign: 'center', fontSize: 14, fontFamily: tokens.typography.fontFamily.bold },
    // Price breakdown styles
    priceBreakdown: {
        padding: tokens.spacing.md,
        borderRadius: tokens.radius.md,
        marginBottom: tokens.spacing.md,
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
    },
    breakdownLabel: {
        fontSize: tokens.typography.sizes.sm,
        fontFamily: tokens.typography.fontFamily.medium,
    },
    breakdownValue: {
        fontSize: tokens.typography.sizes.md,
        fontFamily: tokens.typography.fontFamily.semibold,
    },
    grandTotalRow: {
        borderTopWidth: 1,
        borderTopColor: colors.border.default,
        marginTop: tokens.spacing.sm,
        paddingTop: tokens.spacing.sm,
    },
    // Recent customers styles
    recentCustomersContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: tokens.spacing.sm,
        marginTop: tokens.spacing.xs,
    },
    recentLabel: {
        fontSize: 12,
        fontFamily: tokens.typography.fontFamily.medium,
        marginRight: tokens.spacing.sm,
    },
    recentChipsRow: {
        flexDirection: 'row',
        gap: tokens.spacing.xs,
    },
    recentChip: {
        paddingHorizontal: tokens.spacing.sm,
        paddingVertical: 6,
        borderRadius: 16,
    },
    recentChipText: {
        fontSize: 12,
        fontFamily: tokens.typography.fontFamily.medium,
    },
    // Print size selection styles
    printSizeOption: {
        padding: tokens.spacing.md,
        borderRadius: tokens.radius.md,
        marginBottom: tokens.spacing.sm,
    },
    printSizeText: {
        fontSize: tokens.typography.sizes.md,
        fontFamily: tokens.typography.fontFamily.semibold,
    },
    printSizeSubtext: {
        fontSize: tokens.typography.sizes.xs,
        fontFamily: tokens.typography.fontFamily.regular,
        marginTop: 2,
    },
});

export default SalesScreen;
