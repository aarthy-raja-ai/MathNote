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
import { Moon, Coins, Lock, CloudUpload, CloudDownload, AlertTriangle, Mail, ChevronRight, Bell } from 'lucide-react-native';
import { Card } from '../components';
import { tokens, useTheme } from '../theme';
import { useApp } from '../context';
import notificationService from '../utils/notificationService';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import storage from '../utils/storage';

const CURRENCIES = [
    { code: '₹', name: 'Indian Rupee' },
    { code: '$', name: 'US Dollar' },
    { code: '€', name: 'Euro' },
    { code: '£', name: 'British Pound' },
];

const CONTACT_EMAIL = 'raarthyraja@gmail.com';

export const SettingsScreen: React.FC = () => {
    const { settings, updateSettings, clearAllData, restoreData } = useApp();
    const { mode, toggleTheme, colors, isDark } = useTheme();
    const navigation = useNavigation<any>();
    const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
    const [remindersEnabled, setRemindersEnabled] = useState(false);
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

    const handleRemindersToggle = async () => {
        const newValue = !remindersEnabled;
        if (newValue) {
            const hasPermission = await notificationService.requestPermissions();
            if (!hasPermission) {
                Alert.alert('Permission Required', 'Please enable notifications in your device settings.');
                return;
            }
            await notificationService.scheduleDailySummary(true);
        } else {
            await notificationService.cancelAllReminders();
        }
        setRemindersEnabled(newValue);
    };

    const handleBackup = async () => {
        try {
            const data = await storage.exportAllData();
            const jsonData = JSON.stringify(data, null, 2);

            // Create file in cache directory
            const fileName = `mathnote_backup_${new Date().toISOString().split('T')[0]}.json`;
            const filePath = `${FileSystem.cacheDirectory}${fileName}`;

            await FileSystem.writeAsStringAsync(filePath, jsonData);

            // Check if sharing is available
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(filePath, {
                    mimeType: 'application/json',
                    dialogTitle: 'Save Backup File',
                });
            } else {
                // Fallback to clipboard
                await Clipboard.setStringAsync(jsonData);
                Alert.alert(
                    'Backup Ready',
                    `Sharing not available. Data copied to clipboard.\n\nSales: ${(data.sales || []).length}\nExpenses: ${(data.expenses || []).length}\nCredits: ${(data.credits || []).length}`,
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to create backup');
        }
    };

    const handleRestore = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/json',
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const fileUri = result.assets[0].uri;
                const fileContent = await FileSystem.readAsStringAsync(fileUri);
                const data = JSON.parse(fileContent);

                // Validate backup data
                if (!data || typeof data !== 'object') {
                    Alert.alert('Error', 'Invalid backup file format');
                    return;
                }

                Alert.alert(
                    'Restore Data',
                    `Found:\n• ${(data.sales || []).length} sales\n• ${(data.expenses || []).length} expenses\n• ${(data.credits || []).length} credits\n\nThis will replace all current data. Continue?`,
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Restore',
                            style: 'destructive',
                            onPress: async () => {
                                const success = await restoreData(data);
                                if (success) {
                                    Alert.alert('Success', 'Data restored successfully!');
                                    navigation.navigate('Dashboard');
                                } else {
                                    Alert.alert('Error', 'Failed to restore data');
                                }
                            },
                        },
                    ]
                );
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to read backup file. Make sure it\'s a valid JSON file.');
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
                                <View style={styles.iconWrapper}>
                                    <Moon size={20} color={colors.text.primary} strokeWidth={2} />
                                </View>
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
                                <View style={styles.iconWrapper}>
                                    <Coins size={20} color={colors.text.primary} strokeWidth={2} />
                                </View>
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

                    <Card style={styles.settingCard}>
                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <View style={styles.iconWrapper}>
                                    <Bell size={20} color={colors.text.primary} strokeWidth={2} />
                                </View>
                                <View>
                                    <Text style={styles.settingLabel}>Daily Reminders</Text>
                                    <Text style={styles.settingDescription}>Get notified about pending credits</Text>
                                </View>
                            </View>
                            <Switch
                                value={remindersEnabled}
                                onValueChange={handleRemindersToggle}
                                trackColor={{ false: colors.border.default, true: colors.brand.primary }}
                                thumbColor={colors.semantic.surface}
                            />
                        </View>
                    </Card>

                    <Text style={styles.sectionTitle}>Security</Text>
                    <Card style={styles.settingCard}>
                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <View style={styles.iconWrapper}>
                                    <Lock size={20} color={colors.text.primary} strokeWidth={2} />
                                </View>
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
                                <View style={styles.iconWrapper}>
                                    <CloudUpload size={20} color={colors.text.primary} strokeWidth={2} />
                                </View>
                                <View>
                                    <Text style={styles.settingLabel}>Backup Data</Text>
                                    <Text style={styles.settingDescription}>Save data as JSON file</Text>
                                </View>
                            </View>
                            <ChevronRight size={20} color={colors.text.muted} strokeWidth={2} />
                        </TouchableOpacity>
                    </Card>

                    <Card style={styles.settingCard}>
                        <TouchableOpacity style={styles.settingRow} onPress={handleRestore}>
                            <View style={styles.settingInfo}>
                                <View style={styles.iconWrapper}>
                                    <CloudDownload size={20} color={colors.text.primary} strokeWidth={2} />
                                </View>
                                <View>
                                    <Text style={styles.settingLabel}>Restore Data</Text>
                                    <Text style={styles.settingDescription}>Import data from a backup JSON file</Text>
                                </View>
                            </View>
                            <ChevronRight size={20} color={colors.text.muted} strokeWidth={2} />
                        </TouchableOpacity>
                    </Card>

                    <Card style={styles.dangerCard}>
                        <TouchableOpacity style={styles.settingRow} onPress={handleClearData}>
                            <View style={styles.settingInfo}>
                                <View style={styles.iconWrapper}>
                                    <AlertTriangle size={20} color={colors.brand.primary} strokeWidth={2} />
                                </View>
                                <View>
                                    <Text style={styles.dangerLabel}>Clear All Data</Text>
                                    <Text style={styles.settingDescription}>Delete all sales, expenses, and credits</Text>
                                </View>
                            </View>
                            <ChevronRight size={20} color={colors.text.muted} strokeWidth={2} />
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
                                <View style={styles.iconWrapper}>
                                    <Mail size={20} color={colors.text.primary} strokeWidth={2} />
                                </View>
                                <View>
                                    <Text style={styles.settingLabel}>Contact</Text>
                                    <Text style={styles.emailText}>{CONTACT_EMAIL}</Text>
                                </View>
                            </View>
                            <ChevronRight size={20} color={colors.text.muted} strokeWidth={2} />
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
    iconWrapper: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.semantic.soft, justifyContent: 'center', alignItems: 'center', marginRight: tokens.spacing.sm },
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
