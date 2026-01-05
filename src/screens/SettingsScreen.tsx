import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Animated,
    TouchableOpacity,
    Switch,
    Alert,
    Linking,
    Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Card } from '../components';
import { tokens, useTheme } from '../theme';
import { useApp } from '../context';
import * as Clipboard from 'expo-clipboard';
import storage from '../utils/storage';

const CURRENCIES = [
    { code: '₹', name: 'Indian Rupee' },
    { code: '$', name: 'US Dollar' },
    { code: '€', name: 'Euro' },
    { code: '£', name: 'British Pound' },
];

const CONTACT_EMAIL = 'raarthyraja@gmail.com';

export const SettingsScreen: React.FC = () => {
    const { settings, updateSettings, clearAllData } = useApp();
    const { mode, toggleTheme, colors, isDark } = useTheme();
    const navigation = useNavigation<any>();
    const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const styles = useMemo(() => createStyles(colors), [colors]);

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
                        const success = await clearAllData();
                        if (success) {
                            Alert.alert('Success', 'All data has been cleared');
                            navigation.navigate('Dashboard');
                        } else {
                            Alert.alert('Error', 'Failed to clear data');
                        }
                    },
                },
            ]
        );
    };

    const handleEmailPress = async () => {
        const mailtoUrl = `mailto:${CONTACT_EMAIL}`;
        const canOpen = await Linking.canOpenURL(mailtoUrl);
        if (canOpen) {
            await Linking.openURL(mailtoUrl);
        } else {
            await handleCopyEmail();
        }
    };

    const handleCopyEmail = async () => {
        try {
            await Clipboard.setStringAsync(CONTACT_EMAIL);
            Alert.alert('Copied!', 'Email address copied to clipboard');
        } catch (error) {
            Alert.alert('Error', 'Failed to copy email');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Settings</Text>
                        <Text style={styles.subtitle}>Customize your experience</Text>
                    </View>

                    <Text style={styles.sectionTitle}>Appearance</Text>
                    <Card style={styles.settingCard}>
                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingIcon}>🌙</Text>
                                <View>
                                    <Text style={styles.settingLabel}>Dark Mode</Text>
                                    <Text style={styles.settingDescription}>Switch between light and dark theme</Text>
                                </View>
                            </View>
                            <Switch
                                value={isDark}
                                onValueChange={handleThemeToggle}
                                trackColor={{ false: colors.border.default, true: colors.brand.primary }}
                                thumbColor={colors.semantic.surface}
                            />
                        </View>
                    </Card>

                    <Text style={styles.sectionTitle}>Preferences</Text>
                    <Card style={styles.settingCard}>
                        <TouchableOpacity style={styles.settingRow} onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}>
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
                                        style={[styles.currencyOption, settings.currency === currency.code && styles.currencySelected]}
                                        onPress={() => handleCurrencyChange(currency.code)}
                                    >
                                        <Text style={styles.currencyCode}>{currency.code}</Text>
                                        <Text style={styles.currencyName}>{currency.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </Card>

                    <Text style={styles.sectionTitle}>Security</Text>
                    <Card style={styles.settingCard}>
                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingIcon}>🔒</Text>
                                <View>
                                    <Text style={styles.settingLabel}>App Lock</Text>
                                    <Text style={styles.settingDescription}>Require authentication to open app</Text>
                                </View>
                            </View>
                            <Switch
                                value={Boolean(settings.lock)}
                                onValueChange={handleLockToggle}
                                trackColor={{ false: colors.border.default, true: colors.brand.primary }}
                                thumbColor={colors.semantic.surface}
                            />
                        </View>
                    </Card>

                    <Text style={styles.sectionTitle}>Data Management</Text>
                    <Card style={styles.settingCard}>
                        <TouchableOpacity style={styles.settingRow} onPress={handleBackup}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingIcon}>☁️</Text>
                                <View>
                                    <Text style={styles.settingLabel}>Backup Data</Text>
                                    <Text style={styles.settingDescription}>Export your data for safekeeping</Text>
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
                                    <Text style={styles.settingDescription}>Delete all sales, expenses, and credits</Text>
                                </View>
                            </View>
                            <Text style={styles.actionArrow}>→</Text>
                        </TouchableOpacity>
                    </Card>

                    <Text style={styles.sectionTitle}>About</Text>
                    <Card style={styles.settingCard}>
                        <View style={styles.aboutSection}>
                            <Text style={styles.appName}>Math Note</Text>
                            <Text style={styles.tagline}>Every Number. Clearly Noted.</Text>
                            <Text style={styles.version}>Version 1.0.0</Text>
                        </View>
                    </Card>

                    <Card style={styles.settingCard}>
                        <Pressable style={styles.settingRow} onPress={handleEmailPress} onLongPress={handleCopyEmail}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingIcon}>📧</Text>
                                <View>
                                    <Text style={styles.settingLabel}>Contact</Text>
                                    <Text style={styles.emailText}>{CONTACT_EMAIL}</Text>
                                </View>
                            </View>
                            <Text style={styles.actionArrow}>→</Text>
                        </Pressable>
                        <Text style={styles.contactHint}>Tap to email • Long press to copy</Text>
                    </Card>

                    <View style={styles.bottomSpacer} />
                </ScrollView>
            </Animated.View>
        </SafeAreaView>
    );
};

const createStyles = (colors: typeof tokens.colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.semantic.background },
    content: { flex: 1, paddingHorizontal: tokens.spacing.md },
    header: { paddingTop: tokens.spacing.md, paddingBottom: tokens.spacing.md },
    title: { fontSize: tokens.typography.sizes.xxl, color: colors.brand.secondary, fontFamily: tokens.typography.fontFamily.bold },
    subtitle: { fontSize: tokens.typography.sizes.sm, color: colors.text.secondary, fontFamily: tokens.typography.fontFamily.regular },
    sectionTitle: { fontSize: tokens.typography.sizes.md, color: colors.text.primary, marginTop: tokens.spacing.lg, marginBottom: tokens.spacing.sm, fontFamily: tokens.typography.fontFamily.semibold },
    settingCard: { backgroundColor: colors.semantic.surface, marginBottom: tokens.spacing.sm },
    dangerCard: { backgroundColor: colors.semantic.surface, marginBottom: tokens.spacing.sm, borderWidth: 1, borderColor: colors.brand.primary },
    settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    settingInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    settingIcon: { fontSize: 24, marginRight: tokens.spacing.sm },
    settingLabel: { fontSize: tokens.typography.sizes.md, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.medium },
    dangerLabel: { fontSize: tokens.typography.sizes.md, color: colors.brand.primary, fontFamily: tokens.typography.fontFamily.medium },
    settingDescription: { fontSize: tokens.typography.sizes.xs, color: colors.text.muted, marginTop: tokens.spacing.xxs, fontFamily: tokens.typography.fontFamily.regular },
    emailText: { fontSize: tokens.typography.sizes.sm, color: colors.brand.primary, marginTop: tokens.spacing.xxs, fontFamily: tokens.typography.fontFamily.regular },
    contactHint: { fontSize: tokens.typography.sizes.xs, color: colors.text.muted, textAlign: 'center', marginTop: tokens.spacing.sm, fontFamily: tokens.typography.fontFamily.regular },
    currencyValue: { fontSize: tokens.typography.sizes.lg, color: colors.brand.primary, fontFamily: tokens.typography.fontFamily.bold },
    currencyPicker: { marginTop: tokens.spacing.md, borderTopWidth: 1, borderTopColor: colors.border.default, paddingTop: tokens.spacing.sm },
    currencyOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: tokens.spacing.sm, paddingHorizontal: tokens.spacing.xs, borderRadius: tokens.radius.sm },
    currencySelected: { backgroundColor: colors.semantic.soft },
    currencyCode: { fontSize: tokens.typography.sizes.lg, color: colors.brand.secondary, width: 40, fontFamily: tokens.typography.fontFamily.bold },
    currencyName: { fontSize: tokens.typography.sizes.sm, color: colors.text.secondary, fontFamily: tokens.typography.fontFamily.regular },
    actionArrow: { fontSize: tokens.typography.sizes.lg, color: colors.text.muted },
    aboutSection: { alignItems: 'center', paddingVertical: tokens.spacing.md },
    appName: { fontSize: tokens.typography.sizes.xl, color: colors.brand.secondary, fontFamily: tokens.typography.fontFamily.bold },
    tagline: { fontSize: tokens.typography.sizes.sm, color: colors.text.muted, fontStyle: 'italic', marginTop: tokens.spacing.xxs, fontFamily: tokens.typography.fontFamily.regular },
    version: { fontSize: tokens.typography.sizes.xs, color: colors.text.muted, marginTop: tokens.spacing.sm, fontFamily: tokens.typography.fontFamily.regular },
    bottomSpacer: { height: tokens.spacing.xl + 80 },
});

export default SettingsScreen;
