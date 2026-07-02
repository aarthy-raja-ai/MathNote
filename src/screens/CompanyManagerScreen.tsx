import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Modal,
    Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Building2, Plus, Trash2, Edit2, ChevronLeft, MapPin, Phone, Hash } from 'lucide-react-native';
import { Card, Input } from '../components';
import { tokens, useTheme } from '../theme';
import { useApp } from '../context';
import { Company } from '../utils/storage';

export const CompanyManagerScreen: React.FC = () => {
    const { colors } = useTheme();
    const navigation = useNavigation();
    const { companies, addCompany, updateCompany, deleteCompany, selectedCompanyId, setSelectedCompanyId } = useApp();

    const [modalVisible, setModalVisible] = useState(false);
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [gstin, setGstin] = useState('');

    const styles = React.useMemo(() => createStyles(colors), [colors]);

    const handleAddCompany = () => {
        setEditingCompany(null);
        setName('');
        setAddress('');
        setPhone('');
        setGstin('');
        setModalVisible(true);
    };

    const handleEditCompany = (company: Company) => {
        setEditingCompany(company);
        setName(company.name);
        setAddress(company.address || '');
        setPhone(company.phone || '');
        setGstin(company.gstin || '');
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter a valid company name');
            return;
        }

        const companyData = {
            name: name.trim(),
            address: address.trim() || undefined,
            phone: phone.trim() || undefined,
            gstin: gstin.trim() || undefined,
        };

        if (editingCompany) {
            await updateCompany(editingCompany.id, companyData);
            Alert.alert('Success', 'Company updated successfully');
        } else {
            await addCompany(companyData);
            Alert.alert('Success', 'New company added successfully');
        }
        setModalVisible(false);
    };

    const handleDelete = (company: Company) => {
        if (company.id === 'default' || company.id === selectedCompanyId) {
            Alert.alert('Error', 'You cannot delete the active or default company. Switch active company first.');
            return;
        }

        Alert.alert(
            'Delete Company',
            `Are you sure you want to delete ${company.name}? This will NOT delete associated transactions but they will no longer be visible unless assigned to another company.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: async () => {
                    await deleteCompany(company.id);
                    Alert.alert('Success', 'Company deleted');
                }}
            ]
        );
    };

    const handleSelectCompany = (id: string) => {
        setSelectedCompanyId(id);
        Alert.alert('Company Switched', 'Active company updated successfully.');
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronLeft size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>Company Settings</Text>
                    <Text style={styles.subtitle}>Manage your business outlets</Text>
                </View>
                <TouchableOpacity onPress={handleAddCompany} style={styles.addHeaderBtn}>
                    <Plus size={24} color={colors.brand.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.list}>
                    {/* Default Company display */}
                    <Card style={[styles.card, selectedCompanyId === 'default' && styles.activeCard]}>
                        <Pressable onPress={() => handleSelectCompany('default')} style={styles.pressableRow}>
                            <View style={styles.info}>
                                <View style={[styles.iconWrapper, { backgroundColor: colors.brand.primary + '20' }]}>
                                    <Building2 size={20} color={colors.brand.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.companyName}>Default Company {selectedCompanyId === 'default' && '(Active)'}</Text>
                                    <Text style={styles.companyMeta}>Primary system fallback</Text>
                                </View>
                            </View>
                        </Pressable>
                    </Card>

                    {/* Custom Companies */}
                    {companies.map((company) => (
                        <Card key={company.id} style={[styles.card, selectedCompanyId === company.id && styles.activeCard]}>
                            <View style={styles.row}>
                                <Pressable onPress={() => handleSelectCompany(company.id)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={[styles.iconWrapper, { backgroundColor: selectedCompanyId === company.id ? colors.brand.primary + '20' : colors.semantic.soft }]}>
                                        <Building2 size={20} color={selectedCompanyId === company.id ? colors.brand.primary : colors.text.secondary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.companyName}>{company.name} {selectedCompanyId === company.id && '(Active)'}</Text>
                                        {company.phone ? <Text style={styles.detailText}><Phone size={10} /> {company.phone}</Text> : null}
                                        {company.gstin ? <Text style={styles.detailText}><Hash size={10} /> GST: {company.gstin}</Text> : null}
                                        {company.address ? <Text style={styles.detailText}><MapPin size={10} /> {company.address}</Text> : null}
                                    </View>
                                </Pressable>
                                <View style={styles.actions}>
                                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleEditCompany(company)}>
                                        <Edit2 size={18} color={colors.text.secondary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.actionBtn, { marginLeft: 12 }]} onPress={() => handleDelete(company)}>
                                        <Trash2 size={18} color={colors.semantic.error} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </Card>
                    ))}
                </View>
            </ScrollView>

            <TouchableOpacity style={styles.fab} onPress={handleAddCompany}>
                <Plus size={24} color={colors.text.inverse} />
                <Text style={styles.fabText}>Add Company</Text>
            </TouchableOpacity>

            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{editingCompany ? 'Edit Company' : 'Add New Company'}</Text>

                        <Input
                            label="Company Name"
                            placeholder="e.g. Math Note Retailers"
                            value={name}
                            onChangeText={setName}
                        />

                        <Input
                            label="GSTIN"
                            placeholder="e.g. 33AAAAA0000A1Z1"
                            value={gstin}
                            onChangeText={setGstin}
                            autoCapitalize="characters"
                        />

                        <Input
                            label="Phone Number"
                            placeholder="e.g. +91 98765 43210"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                        />

                        <Input
                            label="Address"
                            placeholder="e.g. Chennai, Tamil Nadu"
                            value={address}
                            onChangeText={setAddress}
                            multiline
                        />

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
            </Modal>
        </SafeAreaView>
    );
};

const createStyles = (colors: typeof tokens.colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.semantic.background },
    header: { flexDirection: 'row', alignItems: 'center', padding: tokens.spacing.md },
    backBtn: { marginRight: tokens.spacing.md },
    addHeaderBtn: { padding: 8, borderRadius: 20, backgroundColor: colors.brand.primary + '10' },
    title: { fontSize: 24, paddingVertical: tokens.spacing.xs, fontFamily: tokens.typography.fontFamily.bold, color: colors.text.primary },
    subtitle: { fontSize: 14, color: colors.text.muted, fontFamily: tokens.typography.fontFamily.regular },
    content: { flex: 1, paddingHorizontal: tokens.spacing.md },
    list: { paddingBottom: 100 },
    card: { marginBottom: tokens.spacing.sm, borderWidth: 1, borderColor: 'transparent' },
    activeCard: { borderColor: colors.brand.primary },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    pressableRow: { flexDirection: 'row', alignItems: 'center' },
    info: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    iconWrapper: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: tokens.spacing.md },
    companyName: { fontSize: 16, fontFamily: tokens.typography.fontFamily.semibold, color: colors.text.primary },
    companyMeta: { fontSize: 13, color: colors.text.muted, marginTop: 2 },
    detailText: { fontSize: 12, color: colors.text.muted, marginTop: 2 },
    actions: { flexDirection: 'row', alignItems: 'center' },
    actionBtn: { padding: 4 },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        backgroundColor: colors.brand.primary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 30,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        zIndex: 10,
    },
    fabText: { color: colors.text.inverse, marginLeft: 8, fontSize: 16, fontFamily: tokens.typography.fontFamily.bold },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: colors.semantic.surface, borderRadius: 24, padding: 24 },
    modalTitle: { fontSize: 20, fontFamily: tokens.typography.fontFamily.bold, color: colors.text.primary, marginBottom: 20 },
    modalButtons: { flexDirection: 'row', gap: 12, marginTop: 24 },
    modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    cancelBtn: { backgroundColor: colors.semantic.soft },
    cancelBtnText: { color: colors.text.primary, fontFamily: tokens.typography.fontFamily.bold },
    saveBtn: { backgroundColor: colors.brand.primary },
    saveBtnText: { color: colors.text.inverse, fontFamily: tokens.typography.fontFamily.bold },
});
export default CompanyManagerScreen;
