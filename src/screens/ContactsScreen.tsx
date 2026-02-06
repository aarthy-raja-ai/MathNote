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
import { Pencil, Trash2, Phone, Search, Users, User, X } from 'lucide-react-native';
import { Card, Input } from '../components';
import { tokens, useTheme } from '../theme';
import { useApp } from '../context';
import { Contact } from '../utils/storage';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.75;

type ContactType = 'Customer' | 'Vendor' | 'Both';

export const ContactsScreen: React.FC = () => {
    const { contacts, addContact, updateContact, deleteContact } = useApp();
    const { colors } = useTheme();

    // UI State
    const [modalVisible, setModalVisible] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'All' | ContactType>('All');

    // Form fields
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [type, setType] = useState<ContactType>('Customer');
    const [notes, setNotes] = useState('');

    const slideAnim = useRef(new Animated.Value(100)).current;
    const sheetAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
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
        setEditingContact(null);
        setName('');
        setPhone('');
        setType('Customer');
        setNotes('');
        setModalVisible(true);
    };

    const handleEdit = (contact: Contact) => {
        setEditingContact(contact);
        setName(contact.name);
        setPhone(contact.phone || '');
        setType(contact.type);
        setNotes(contact.notes || '');
        setModalVisible(true);
    };

    const handleDelete = (id: string, name: string) => {
        Alert.alert('Delete Contact', `Are you sure you want to delete ${name}?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteContact(id) },
        ]);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Name is required');
            return;
        }

        if (editingContact) {
            await updateContact(editingContact.id, {
                name: name.trim(),
                phone: phone.trim(),
                type,
                notes: notes.trim(),
            });
        } else {
            await addContact({
                name: name.trim(),
                phone: phone.trim(),
                type,
                notes: notes.trim(),
            });
        }
        closeModal();
    };

    const filteredContacts = useMemo(() => {
        return contacts
            .filter(c => {
                const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    c.phone?.includes(searchQuery);
                const matchesFilter = activeFilter === 'All' || c.type === activeFilter || c.type === 'Both';
                return matchesSearch && matchesFilter;
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [contacts, searchQuery, activeFilter]);

    const renderContactItem = ({ item }: { item: Contact }) => {
        const typeColor = item.type === 'Customer' ? colors.semantic.success :
            item.type === 'Vendor' ? colors.brand.primary : colors.brand.secondary;

        return (
            <Pressable
                style={styles.listItem}
                onPress={() => handleEdit(item)}
            >
                <View style={[styles.avatar, { backgroundColor: typeColor + '20' }]}>
                    <User size={24} color={typeColor} />
                </View>
                <View style={styles.listTextContainer}>
                    <View style={styles.listHeaderRow}>
                        <Text style={styles.listName} numberOfLines={1}>{item.name}</Text>
                        <View style={[styles.typeBadge, { backgroundColor: typeColor + '15' }]}>
                            <Text style={[styles.typeBadgeText, { color: typeColor }]}>{item.type}</Text>
                        </View>
                    </View>
                    {item.phone ? (
                        <View style={styles.listSubRow}>
                            <Phone size={12} color={colors.text.muted} style={{ marginRight: 4 }} />
                            <Text style={styles.listPhone}>{item.phone}</Text>
                        </View>
                    ) : null}
                    {item.notes ? (
                        <Text style={styles.listNotes} numberOfLines={1}>{item.notes}</Text>
                    ) : null}
                </View>
                <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={styles.deleteAction}>
                    <Trash2 size={20} color={colors.semantic.error + '90'} />
                </TouchableOpacity>
            </Pressable>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <Animated.View style={[styles.content, { transform: [{ translateY: slideAnim }] }]}>
                <View style={styles.header}>
                    <Text style={styles.title}>Contacts</Text>
                    <Text style={styles.subtitle}>Manage your customers and vendors</Text>
                </View>

                {/* Search and Filters */}
                <View style={styles.searchContainer}>
                    <View style={[styles.searchBar, { backgroundColor: colors.semantic.soft }]}>
                        <Search size={18} color={colors.text.muted} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search contacts..."
                            placeholderTextColor={colors.text.muted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery ? (
                            <Pressable onPress={() => setSearchQuery('')}>
                                <X size={18} color={colors.text.muted} />
                            </Pressable>
                        ) : null}
                    </View>
                </View>

                <View style={styles.filterContainer}>
                    {['All', 'Customer', 'Vendor', 'Both'].map((f) => (
                        <Pressable
                            key={f}
                            style={[
                                styles.filterChip,
                                activeFilter === f && { backgroundColor: colors.brand.primary }
                            ]}
                            onPress={() => setActiveFilter(f as any)}
                        >
                            <Text style={[
                                styles.filterText,
                                activeFilter === f && { color: colors.text.inverse, fontFamily: tokens.typography.fontFamily.semibold }
                            ]}>
                                {f}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                <FlatList
                    data={filteredContacts}
                    keyExtractor={(item) => item.id}
                    renderItem={renderContactItem}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Users size={64} color={colors.text.muted} strokeWidth={1} />
                            <Text style={styles.emptyText}>No contacts found</Text>
                            <Text style={styles.emptySubtext}>
                                {searchQuery ? 'Try a different search term' : 'Add your first customer or vendor'}
                            </Text>
                        </View>
                    }
                />
            </Animated.View>

            <Pressable
                style={({ pressed }) => [styles.floatingButton, pressed && styles.floatingButtonPressed]}
                onPress={handleAdd}
            >
                <Text style={styles.floatingButtonText}>+ New Contact</Text>
            </Pressable>

            {/* Add/Edit Modal */}
            <Modal visible={modalVisible} animationType="none" transparent={true}>
                <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <Pressable style={styles.modalBackdrop} onPress={closeModal} />
                    <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: sheetAnim }] }]}>
                        <View {...panResponder.panHandlers} style={styles.handleContainer}>
                            <View style={styles.handleBar} />
                        </View>
                        <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            <View style={styles.sheetContent}>
                                <Text style={styles.modalTitle}>{editingContact ? 'Edit Contact' : 'New Contact'}</Text>

                                <Input
                                    label="Name"
                                    placeholder="Enter full name"
                                    value={name}
                                    onChangeText={setName}
                                />

                                <Input
                                    label="Phone Number"
                                    placeholder="Enter phone number (optional)"
                                    keyboardType="phone-pad"
                                    value={phone}
                                    onChangeText={setPhone}
                                />

                                <View style={styles.typeSelector}>
                                    <Text style={styles.selectorLabel}>Contact Type</Text>
                                    <View style={styles.selectorButtons}>
                                        {(['Customer', 'Vendor', 'Both'] as ContactType[]).map((t) => (
                                            <Pressable
                                                key={t}
                                                style={[
                                                    styles.selectorBtn,
                                                    type === t && { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary }
                                                ]}
                                                onPress={() => setType(t)}
                                            >
                                                <Text style={[
                                                    styles.selectorBtnText,
                                                    type === t && { color: colors.text.inverse, fontFamily: tokens.typography.fontFamily.semibold }
                                                ]}>
                                                    {t}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>

                                <Input
                                    label="Notes"
                                    placeholder="Additional details (optional)"
                                    multiline
                                    numberOfLines={3}
                                    value={notes}
                                    onChangeText={setNotes}
                                />

                                <View style={styles.modalButtons}>
                                    <Pressable style={[styles.modalBtn, styles.cancelBtn]} onPress={closeModal}>
                                        <Text style={styles.cancelBtnText}>Cancel</Text>
                                    </Pressable>
                                    <Pressable style={[styles.modalBtn, styles.saveBtn]} onPress={handleSave}>
                                        <Text style={styles.saveBtnText}>Save Contact</Text>
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
    title: { fontSize: tokens.typography.sizes.xxl, color: colors.brand.secondary, fontFamily: tokens.typography.fontFamily.bold },
    subtitle: { fontSize: tokens.typography.sizes.sm, color: colors.text.secondary, marginTop: tokens.spacing.xxs, fontFamily: tokens.typography.fontFamily.regular },

    searchContainer: { marginVertical: tokens.spacing.sm },
    searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: tokens.spacing.md, height: 48, borderRadius: tokens.radius.md },
    searchInput: { flex: 1, marginLeft: tokens.spacing.sm, fontSize: tokens.typography.sizes.md, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.regular, height: '100%' },

    filterContainer: { flexDirection: 'row', paddingBottom: tokens.spacing.md, gap: 8 },
    filterChip: { paddingHorizontal: tokens.spacing.md, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.semantic.soft, borderSize: 1, borderColor: colors.border.default },
    filterText: { fontSize: 13, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.medium },

    listContent: { paddingBottom: 180 },
    listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.default },
    avatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
    listTextContainer: { flex: 1, marginLeft: 16 },
    listHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
    listName: { fontSize: 16, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.semibold, flex: 1, marginRight: 8 },
    typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
    typeBadgeText: { fontSize: 10, fontFamily: tokens.typography.fontFamily.bold, textTransform: 'uppercase' },
    listSubRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
    listPhone: { fontSize: 13, color: colors.text.muted, fontFamily: tokens.typography.fontFamily.medium },
    listNotes: { fontSize: 12, color: colors.text.muted, fontFamily: tokens.typography.fontFamily.regular },
    deleteAction: { padding: 8 },

    emptyContainer: { alignItems: 'center', paddingVertical: tokens.spacing.xxl, marginTop: 40 },
    emptyText: { fontSize: tokens.typography.sizes.lg, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.medium, marginTop: 16 },
    emptySubtext: { fontSize: tokens.typography.sizes.sm, color: colors.text.muted, marginTop: tokens.spacing.xs, fontFamily: tokens.typography.fontFamily.regular, textAlign: 'center' },

    floatingButton: { position: 'absolute', bottom: 110, alignSelf: 'center', backgroundColor: colors.brand.primary, height: 52, minWidth: 200, borderRadius: 26, justifyContent: 'center', alignItems: 'center', paddingHorizontal: tokens.spacing.lg, ...tokens.shadow.floatingButton },
    floatingButtonPressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },
    floatingButtonText: { color: colors.text.inverse, fontSize: tokens.typography.sizes.lg, fontFamily: tokens.typography.fontFamily.semibold },

    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    bottomSheet: { backgroundColor: colors.semantic.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: SCREEN_HEIGHT * 0.9 },
    handleContainer: { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
    handleBar: { width: 40, height: 4, backgroundColor: colors.border.default, borderRadius: 2 },
    sheetScroll: { maxHeight: SCREEN_HEIGHT * 0.8 },
    sheetContent: { padding: tokens.spacing.lg, paddingBottom: tokens.spacing.xxl },
    modalTitle: { fontSize: tokens.typography.sizes.xl, color: colors.text.primary, marginBottom: tokens.spacing.lg, textAlign: 'center', fontFamily: tokens.typography.fontFamily.bold },

    typeSelector: { marginBottom: tokens.spacing.lg },
    selectorLabel: { fontSize: tokens.typography.sizes.sm, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.medium, marginBottom: 8 },
    selectorButtons: { flexDirection: 'row', gap: 10 },
    selectorBtn: { flex: 1, paddingVertical: 12, borderRadius: tokens.radius.md, backgroundColor: colors.semantic.background, borderWidth: 1, borderColor: colors.border.default, alignItems: 'center' },
    selectorBtnText: { fontSize: 14, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.medium },

    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: tokens.spacing.lg, gap: 12 },
    modalBtn: { flex: 1, paddingVertical: 14, borderRadius: tokens.radius.md, alignItems: 'center' },
    cancelBtn: { backgroundColor: colors.semantic.background },
    cancelBtnText: { fontSize: tokens.typography.sizes.md, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.semibold },
    saveBtn: { backgroundColor: colors.brand.primary },
    saveBtnText: { fontSize: tokens.typography.sizes.md, color: colors.text.inverse, fontFamily: tokens.typography.fontFamily.semibold },
});

export default ContactsScreen;
