import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Modal,
    TextInput,
    Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { User as UserIcon, Plus, Trash2, Shield, UserCog, ChevronLeft } from 'lucide-react-native';
import { Card, Input } from '../components';
import { tokens, useTheme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { UserRole, User } from '../utils/storage';

export const UserManagerScreen: React.FC = () => {
    const { colors } = useTheme();
    const navigation = useNavigation();
    const { users, addUser, updateUser, deleteUser, currentUser } = useAuth();

    const [modalVisible, setModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>('staff');
    const [pin, setPin] = useState('');

    const styles = React.useMemo(() => createStyles(colors), [colors]);

    const handleAddUser = () => {
        setEditingUser(null);
        setName('');
        setUsername('');
        setPassword('');
        setRole('staff');
        setPin('');
        setModalVisible(true);
    };

    const handleEditUser = (user: User) => {
        setEditingUser(user);
        setName(user.name);
        setUsername(user.username || '');
        setPassword('');
        setRole(user.role);
        setPin(user.pin);
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!name.trim()) { Alert.alert('Error', 'Please enter a valid name'); return; }
        if (!username.trim()) { Alert.alert('Error', 'Please enter a valid username'); return; }
        if (pin.length !== 4) { Alert.alert('Error', 'PIN must be exactly 4 digits'); return; }

        if (editingUser) {
            const updates: Record<string, any> = { name, username: username.trim(), role, pin };
            if (password.trim()) {
                if (password.length < 4) { Alert.alert('Error', 'Password must be at least 4 characters'); return; }
                updates.passwordPlain = password;
            }
            await updateUser(editingUser.id, updates);
            Alert.alert('Success', 'User updated successfully');
        } else {
            if (!password.trim()) { Alert.alert('Error', 'Please enter a password'); return; }
            if (password.length < 4) { Alert.alert('Error', 'Password must be at least 4 characters'); return; }
            await addUser(name, username.trim(), password, role, pin);
            Alert.alert('Success', 'New user added successfully');
        }
        setPin('');
        setUsername('');
        setPassword('');
        setModalVisible(false);
    };

    const handleDelete = (id: string) => {
        if (id === currentUser?.id) {
            Alert.alert('Error', 'You cannot delete yourself!');
            return;
        }

        Alert.alert(
            'Delete User',
            'Are you sure you want to delete this user? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteUser(id) }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronLeft size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>User Management</Text>
                    <Text style={styles.subtitle}>Manage roles and access</Text>
                </View>
                <TouchableOpacity onPress={handleAddUser} style={styles.addHeaderBtn}>
                    <Plus size={24} color={colors.brand.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.userList}>
                    {users.map((user) => (
                        <Card key={user.id} style={styles.userCard}>
                            <View style={styles.userRow}>
                                <View style={styles.userInfo}>
                                    <View style={[styles.roleIcon, { backgroundColor: user.role === 'owner' ? colors.brand.primary + '20' : colors.semantic.soft }]}>
                                        {user.role === 'owner' ? (
                                            <Shield size={20} color={colors.brand.primary} />
                                        ) : (
                                            <UserIcon size={20} color={colors.text.secondary} />
                                        )}
                                    </View>
                                    <View>
                                        <Text style={styles.userName}>{user.name} {user.id === currentUser?.id && '(You)'}</Text>
                                        <Text style={styles.userRole}>
                                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)} • PIN: {user.pin}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.userActions}>
                                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleEditUser(user)}>
                                        <UserCog size={20} color={colors.text.secondary} />
                                    </TouchableOpacity>
                                    {users.length > 1 && user.id !== currentUser?.id && (
                                        <TouchableOpacity style={[styles.actionBtn, { marginLeft: 12 }]} onPress={() => handleDelete(user.id)}>
                                            <Trash2 size={20} color={colors.semantic.error} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        </Card>
                    ))}
                </View>
            </ScrollView>

            <TouchableOpacity style={styles.fab} onPress={handleAddUser}>
                <Plus size={24} color={colors.text.inverse} />
                <Text style={styles.fabText}>Add User</Text>
            </TouchableOpacity>

            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{editingUser ? 'Edit User' : 'Add New User'}</Text>

                        <Input
                            label="Name"
                            placeholder="Employee Name"
                            value={name}
                            onChangeText={setName}
                        />

                        <Input
                            label="Username"
                            placeholder="e.g. ravi_staff"
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                        />

                        <Input
                            label={editingUser ? "Password (leave blank to keep current)" : "Password"}
                            placeholder={editingUser ? "Leave blank to keep unchanged" : "At least 4 characters"}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoCapitalize="none"
                        />

                        <Text style={styles.label}>Role</Text>
                        <View style={styles.roleSelector}>
                            {(['staff', 'manager', 'owner'] as UserRole[]).map((r) => (
                                <TouchableOpacity
                                    key={r}
                                    style={[styles.roleOption, role === r && { backgroundColor: colors.brand.primary }]}
                                    onPress={() => setRole(r)}
                                >
                                    <Text style={[styles.roleText, role === r && { color: colors.text.inverse }]}>
                                        {r.charAt(0).toUpperCase() + r.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Input
                            label="4-Digit PIN"
                            placeholder="0000"
                            value={pin}
                            onChangeText={setPin}
                            keyboardType="numeric"
                            maxLength={4}
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
    userList: { paddingBottom: 100 },
    userCard: { marginBottom: tokens.spacing.sm },
    userRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    roleIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: tokens.spacing.md },
    userName: { fontSize: 16, fontFamily: tokens.typography.fontFamily.semibold, color: colors.text.primary },
    userRole: { fontSize: 13, color: colors.text.muted, marginTop: 2 },
    userActions: { flexDirection: 'row', alignItems: 'center' },
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
    label: { fontSize: 14, fontFamily: tokens.typography.fontFamily.semibold, marginBottom: 8, color: colors.text.primary },
    roleSelector: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    roleOption: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.semantic.soft, alignItems: 'center' },
    roleText: { fontSize: 14, fontFamily: tokens.typography.fontFamily.medium, color: colors.text.primary },
    modalButtons: { flexDirection: 'row', gap: 12, marginTop: 24 },
    modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    cancelBtn: { backgroundColor: colors.semantic.soft },
    cancelBtnText: { color: colors.text.primary, fontFamily: tokens.typography.fontFamily.bold },
    saveBtn: { backgroundColor: colors.brand.primary },
    saveBtnText: { color: colors.text.inverse, fontFamily: tokens.typography.fontFamily.bold },
});
