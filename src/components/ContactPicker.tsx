import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Pressable,
    TextInput,
} from 'react-native';
import { User, Search, X } from 'lucide-react-native';
import { tokens } from '../theme';
import { Contact } from '../utils/storage';

interface ContactPickerProps {
    contacts: Contact[];
    onSelect: (contact: Contact) => void;
    colors: typeof tokens.colors;
    filterType?: 'Customer' | 'Vendor' | 'Both';
}

export const ContactPicker: React.FC<ContactPickerProps> = ({
    contacts,
    onSelect,
    colors,
    filterType
}) => {
    const [search, setSearch] = useState('');

    const filteredContacts = useMemo(() => {
        return contacts
            .filter(c => {
                const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                    c.phone?.includes(search);
                const matchesFilter = !filterType || filterType === 'Both' || c.type === filterType || c.type === 'Both';
                return matchesSearch && matchesFilter;
            })
            .sort((a, b) => a.name.localeCompare(b.name))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [contacts, search, filterType]);

    if (contacts.length === 0) return null;

    return (
        <View style={styles.container}>
            <View style={[styles.searchBar, { backgroundColor: colors.semantic.soft }]}>
                <Search size={16} color={colors.text.muted} />
                <TextInput
                    style={[styles.searchInput, { color: colors.text.primary }]}
                    placeholder="Search recent contacts..."
                    placeholderTextColor={colors.text.muted}
                    value={search}
                    onChangeText={setSearch}
                />
                {search ? (
                    <Pressable onPress={() => setSearch('')}>
                        <X size={16} color={colors.text.muted} />
                    </Pressable>
                ) : null}
            </View>

            {filteredContacts.length > 0 ? (
                <View style={styles.list}>
                    {filteredContacts.map((item) => (
                        <Pressable
                            key={item.id}
                            style={({ pressed }) => [
                                styles.item,
                                { borderBottomColor: colors.border.default },
                                pressed && { backgroundColor: colors.semantic.soft }
                            ]}
                            onPress={() => onSelect(item)}
                        >
                            <View style={[styles.avatar, { backgroundColor: colors.brand.primary + '15' }]}>
                                <User size={16} color={colors.brand.primary} />
                            </View>
                            <View style={styles.content}>
                                <Text style={[styles.name, { color: colors.text.primary }]}>{item.name}</Text>
                                {item.phone ? (
                                    <Text style={[styles.phone, { color: colors.text.muted }]}>{item.phone}</Text>
                                ) : null}
                            </View>
                        </Pressable>
                    ))}
                </View>
            ) : (
                <View style={styles.empty}>
                    <Text style={[styles.emptyText, { color: colors.text.muted }]}>No matching contacts</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: tokens.spacing.md,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: tokens.spacing.md,
        height: 40,
        borderRadius: tokens.radius.md,
        marginBottom: tokens.spacing.xs,
    },
    searchInput: {
        flex: 1,
        marginLeft: tokens.spacing.sm,
        fontSize: 14,
        fontFamily: tokens.typography.fontFamily.regular,
        height: '100%',
    },
    list: {
        borderRadius: tokens.radius.md,
        overflow: 'hidden',
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: tokens.spacing.sm,
        borderBottomWidth: 1,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        marginLeft: 10,
    },
    name: {
        fontSize: 14,
        fontFamily: tokens.typography.fontFamily.medium,
    },
    phone: {
        fontSize: 11,
        fontFamily: tokens.typography.fontFamily.regular,
    },
    empty: {
        paddingVertical: 10,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 12,
        fontStyle: 'italic',
    },
});
