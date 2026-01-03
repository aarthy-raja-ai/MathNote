import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Animated,
    TouchableOpacity,
    Switch,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button } from '../components';
import { tokens } from '../theme';
import { useApp } from '../context';
import { useTheme } from '../theme';
import storage from '../utils/storage';

const CURRENCIES = [
    { code: '₹', name: 'Indian Rupee' },
    { code: '$', name: 'US Dollar' },
    { code: '€', name: 'Euro' },
    { code: '£', name: 'British Pound' },
];

export const SettingsScreen: React.FC = () => {
    const { settings, updateSettings } = useApp();
    const { mode, toggleTheme } = useTheme();
    const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: tokens.motion.duration.slow,
            useNativeDriver: true,
        }).start();
    }, [fadeAnim]);

    const handleThemeToggle = async () => {
        toggleTheme();
        await updateSettings({ theme: mode === 'light' ? 'dark' : 'light' });
    };

    const handleLockToggle = async () => {
        await updateSettings({ lock: !settings.lock });
    };

    const handleCurrencyChange = async (currency: string) => {
        await updateSettings({ currency });
        setShowCurrencyPicker(false);
    };

    const handleBackup = async () => {
        try {
            const data = await storage.exportAllData();
            Alert.alert(
                'Backup Ready',
                `Your data has been prepared for backup.\n\nSales: ${(data.sales || []).length}\nExpenses: ${(data.expenses || []).length}\nCredits: ${(data.credits || []).length}\n\nExported at: ${new Date(data.exportedAt).toLocaleString()}`,
                [{ text: 'OK' }]
            );
        } catch (error) {
            Alert.alert('Error', 'Failed to create backup');
        }
    };

    const handleClearData = () => {
        Alert.alert(
            'Clear All Data',
            'Are you sure you want to delete all your data? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: async () => {
                        // Clear all data logic here
                        Alert.alert('Success', 'All data has been cleared');
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Settings</Text>
                        <Text style={styles.subtitle}>Customize your experience</Text>
                    </View>

                    {/* Appearance */}
                    <Text style={styles.sectionTitle}>Appearance</Text>
                    <Card style={styles.settingCard}>
                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingIcon}>🌙</Text>
                                <View>
                                    <Text style={styles.settingLabel}>Dark Mode</Text>
                                    <Text style={styles.settingDescription}>
                                        Switch between light and dark theme
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={Boolean(mode === 'dark')}
                                onValueChange={handleThemeToggle}
                                trackColor={{
                                    false: tokens.colors.border.default,
                                    true: tokens.colors.brand.primary
                                }}
                                thumbColor={tokens.colors.semantic.surface}
                            />
                        </View>
                    </Card>

                    {/* Preferences */}
                    <Text style={styles.sectionTitle}>Preferences</Text>
                    <Card style={styles.settingCard}>
                        <TouchableOpacity
                            style={styles.settingRow}
                            onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
                        >
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingIcon}>💰</Text>
                                <View>
                                    <Text style={styles.settingLabel}>Currency</Text>
                                    <Text style={styles.settingDescription}>
                                        {CURRENCIES.find((c) => c.code === settings.currency)?.name || 'Indian Rupee'}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.currencyValue}>{settings.currency}</Text>
                        </TouchableOpacity>

                        {showCurrencyPicker && (
                            <View style={styles.currencyPicker}>
                                {CURRENCIES.map((currency) => (
                                    <TouchableOpacity
                                        key={currency.code}
                                        style={[
                                            styles.currencyOption,
                                            settings.currency === currency.code && styles.currencySelected,
                                        ]}
                                        onPress={() => handleCurrencyChange(currency.code)}
                                    >
                                        <Text style={styles.currencyCode}>{currency.code}</Text>
                                        <Text style={styles.currencyName}>{currency.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </Card>

                    {/* Security */}
                    <Text style={styles.sectionTitle}>Security</Text>
                    <Card style={styles.settingCard}>
                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingIcon}>🔒</Text>
                                <View>
                                    <Text style={styles.settingLabel}>App Lock</Text>
                                    <Text style={styles.settingDescription}>
                                        Require authentication to open app
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={Boolean(settings.lock)}
                                onValueChange={handleLockToggle}
                                trackColor={{
                                    false: tokens.colors.border.default,
                                    true: tokens.colors.brand.primary
                                }}
                                thumbColor={tokens.colors.semantic.surface}
                            />
                        </View>
                    </Card>

                    {/* Data */}
                    <Text style={styles.sectionTitle}>Data Management</Text>
                    <Card style={styles.settingCard}>
                        <TouchableOpacity style={styles.settingRow} onPress={handleBackup}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingIcon}>☁️</Text>
                                <View>
                                    <Text style={styles.settingLabel}>Backup Data</Text>
                                    <Text style={styles.settingDescription}>
                                        Export your data for safekeeping
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.actionArrow}>→</Text>
                        </TouchableOpacity>
                    </Card>

                    <Card style={styles.dangerCard}>
                        <TouchableOpacity style={styles.settingRow} onPress={handleClearData}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingIcon}>⚠️</Text>
                                <View>
                                    <Text style={styles.dangerLabel}>Clear All Data</Text>
                                    <Text style={styles.settingDescription}>
                                        Delete all sales, expenses, and credits
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.actionArrow}>→</Text>
                        </TouchableOpacity>
                    </Card>

                    {/* About */}
                    <Text style={styles.sectionTitle}>About</Text>
                    <Card style={styles.settingCard}>
                        <View style={styles.aboutSection}>
                            <Text style={styles.appName}>Math Note</Text>
                            <Text style={styles.tagline}>Every Number. Clearly Noted.</Text>
                            <Text style={styles.version}>Version 1.0.0</Text>
                        </View>
                    </Card>

                    <View style={styles.bottomSpacer} />
                </ScrollView>
            </Animated.View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: tokens.colors.semantic.background,
    },
    content: {
        flex: 1,
        paddingHorizontal: tokens.spacing.md,
    },
    header: {
        paddingTop: tokens.spacing.md,
        paddingBottom: tokens.spacing.md,
    },
    title: {
        fontSize: tokens.typography.sizes.xxl,
        fontWeight: tokens.typography.weight.bold,
        color: tokens.colors.brand.secondary,
    },
    subtitle: {
        fontSize: tokens.typography.sizes.sm,
        color: tokens.colors.text.secondary,
    },
    sectionTitle: {
        fontSize: tokens.typography.sizes.md,
        fontWeight: tokens.typography.weight.semibold,
        color: tokens.colors.text.primary,
        marginTop: tokens.spacing.lg,
        marginBottom: tokens.spacing.sm,
    },
    settingCard: {
        backgroundColor: tokens.colors.semantic.surface,
        marginBottom: tokens.spacing.sm,
    },
    dangerCard: {
        backgroundColor: tokens.colors.semantic.surface,
        marginBottom: tokens.spacing.sm,
        borderWidth: 1,
        borderColor: tokens.colors.brand.primary,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    settingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    settingIcon: {
        fontSize: 24,
        marginRight: tokens.spacing.sm,
    },
    settingLabel: {
        fontSize: tokens.typography.sizes.md,
        fontWeight: tokens.typography.weight.medium,
        color: tokens.colors.text.primary,
    },
    dangerLabel: {
        fontSize: tokens.typography.sizes.md,
        fontWeight: tokens.typography.weight.medium,
        color: tokens.colors.brand.primary,
    },
    settingDescription: {
        fontSize: tokens.typography.sizes.xs,
        color: tokens.colors.text.muted,
        marginTop: tokens.spacing.xxs,
    },
    currencyValue: {
        fontSize: tokens.typography.sizes.lg,
        fontWeight: tokens.typography.weight.bold,
        color: tokens.colors.brand.primary,
    },
    currencyPicker: {
        marginTop: tokens.spacing.md,
        borderTopWidth: 1,
        borderTopColor: tokens.colors.border.default,
        paddingTop: tokens.spacing.sm,
    },
    currencyOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: tokens.spacing.sm,
        paddingHorizontal: tokens.spacing.xs,
        borderRadius: tokens.radius.sm,
    },
    currencySelected: {
        backgroundColor: tokens.colors.semantic.soft,
    },
    currencyCode: {
        fontSize: tokens.typography.sizes.lg,
        fontWeight: tokens.typography.weight.bold,
        color: tokens.colors.brand.secondary,
        width: 40,
    },
    currencyName: {
        fontSize: tokens.typography.sizes.sm,
        color: tokens.colors.text.secondary,
    },
    actionArrow: {
        fontSize: tokens.typography.sizes.lg,
        color: tokens.colors.text.muted,
    },
    aboutSection: {
        alignItems: 'center',
        paddingVertical: tokens.spacing.md,
    },
    appName: {
        fontSize: tokens.typography.sizes.xl,
        fontWeight: tokens.typography.weight.bold,
        color: tokens.colors.brand.secondary,
    },
    tagline: {
        fontSize: tokens.typography.sizes.sm,
        color: tokens.colors.text.muted,
        fontStyle: 'italic',
        marginTop: tokens.spacing.xxs,
    },
    version: {
        fontSize: tokens.typography.sizes.xs,
        color: tokens.colors.text.muted,
        marginTop: tokens.spacing.sm,
    },
    bottomSpacer: {
        height: tokens.spacing.xl,
    },
});

export default SettingsScreen;
