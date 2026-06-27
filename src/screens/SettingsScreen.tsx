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
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Moon, Coins, Lock, CloudUpload, CloudDownload, AlertTriangle, Mail, ChevronRight, Bell, Share2, Building2, Receipt, FileText, Printer, User as UserIcon, RefreshCw, Fingerprint, Cloud, Key } from 'lucide-react-native';
import { Card, Button, Input } from '../components';
import { tokens, useTheme } from '../theme';
import { useApp, useAuth } from '../context';
import notificationService from '../utils/notificationService';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Constants from 'expo-constants';
import storage from '../utils/storage';
import googleDriveService from '../utils/googleDrive';

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
    const { currentUser, role, canManageSettings, logout } = useAuth();
    const navigation = useNavigation<any>();
    const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
    const [showGstRatePicker, setShowGstRatePicker] = useState(false);
    const [showPrintSizePicker, setShowPrintSizePicker] = useState(false);
    const [showTemplatePicker, setShowTemplatePicker] = useState(false);
    const [remindersEnabled, setRemindersEnabled] = useState(settings.remindersEnabled ?? false);
    const [isCloudSyncing, setIsCloudSyncing] = useState(false);
    const [lastCloudSync, setLastCloudSync] = useState<string | null>(null);
    const [supabaseUrl, setSupabaseUrl] = useState('');
    const [supabaseKey, setSupabaseKey] = useState('');
    const [showGuide, setShowGuide] = useState(false);
    const [copiedSQL, setCopiedSQL] = useState(false);

    const handleCopySQL = async () => {
        await Clipboard.setStringAsync(SQL_SCHEMA);
        setCopiedSQL(true);
        setTimeout(() => setCopiedSQL(false), 2000);
    };

    useEffect(() => {
        const loadSyncCreds = async () => {
            const url = await storage.get<string>('SUPABASE_URL');
            const key = await storage.get<string>('SUPABASE_KEY');
            if (url) setSupabaseUrl(url);
            if (key) setSupabaseKey(key);
        };
        loadSyncCreds();
    }, []);

    const saveSyncCreds = async () => {
        await storage.set('SUPABASE_URL', supabaseUrl);
        await storage.set('SUPABASE_KEY', supabaseKey);
        Alert.alert('Success', 'Sync credentials saved. Please restart the app for changes to take effect.');
    };

    const GST_RATES = [5, 12, 18, 28];
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
        await updateSettings({ remindersEnabled: newValue });
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

    const handleCloudBackup = async () => {
        // Mock token for demonstration - in a real app, this would come from expo-auth-session
        const mockToken = "USER_ACCESS_TOKEN";

        setIsCloudSyncing(true);
        try {
            const success = await googleDriveService.uploadBackup(mockToken);
            if (success) {
                const now = new Date().toLocaleString();
                setLastCloudSync(now);
                Alert.alert('Cloud Sync Success', `Data backed up to Google Drive at ${now}`);
            } else {
                Alert.alert('Cloud Sync Failed', 'Make sure you are signed in and have internet access.');
            }
        } catch (error) {
            Alert.alert('Error', 'An unexpected error occurred during cloud sync.');
        } finally {
            setIsCloudSyncing(false);
        }
    };

    const handleCloudRestore = async () => {
        const mockToken = "USER_ACCESS_TOKEN";

        setIsCloudSyncing(true);
        try {
            const info = await googleDriveService.getBackupInfo(mockToken);
            if (!info) {
                Alert.alert('No Backup Found', 'No cloud backup was found for this account.');
                return;
            }

            Alert.alert(
                'Restore from Cloud',
                `Found backup from ${new Date(info.modifiedTime).toLocaleString()}.\n\nThis will replace all local data. Continue?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Restore Now',
                        style: 'destructive',
                        onPress: async () => {
                            const success = await googleDriveService.downloadAndRestore(mockToken);
                            if (success) {
                                Alert.alert('Success', 'Data restored from cloud successfully!');
                                navigation.navigate('Dashboard');
                            } else {
                                Alert.alert('Error', 'Failed to restore data from cloud.');
                            }
                        }
                    }
                ]
            );
        } catch (error) {
            Alert.alert('Error', 'Failed to connect to Google Drive.');
        } finally {
            setIsCloudSyncing(false);
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

                    {/* Business Profile Section */}
                    <Text style={styles.sectionTitle}>Business</Text>
                    <Card style={styles.settingCard}>
                        <TouchableOpacity style={styles.settingRow} onPress={() => navigation.navigate('BusinessProfile')}>
                            <View style={styles.settingInfo}>
                                <View style={[styles.iconWrapper, { backgroundColor: colors.brand.primary + '15' }]}>
                                    <Building2 size={20} color={colors.brand.primary} strokeWidth={2} />
                                </View>
                                <View>
                                    <Text style={styles.settingLabel}>Business Profile</Text>
                                    <Text style={styles.settingDescription}>
                                        {settings.businessName || 'Add your business details for invoices'}
                                    </Text>
                                </View>
                            </View>
                            <ChevronRight size={20} color={colors.text.muted} strokeWidth={2} />
                        </TouchableOpacity>
                    </Card>

                    {/* GST Settings */}
                    <Card style={styles.settingCard}>
                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <View style={styles.iconWrapper}>
                                    <Receipt size={20} color={colors.text.primary} strokeWidth={2} />
                                </View>
                                <View>
                                    <Text style={styles.settingLabel}>GST/Tax</Text>
                                    <Text style={styles.settingDescription}>Enable tax calculation on invoices</Text>
                                </View>
                            </View>
                            <Switch
                                value={Boolean(settings.gstEnabled)}
                                onValueChange={(value) => updateSettings({ gstEnabled: value })}
                                trackColor={{ false: colors.border.default, true: colors.brand.primary }}
                                thumbColor={colors.semantic.surface}
                            />
                        </View>
                    </Card>

                    {settings.gstEnabled && (
                        <>
                            <Card style={styles.settingCard}>
                                <TouchableOpacity style={styles.settingRow} onPress={() => setShowGstRatePicker(!showGstRatePicker)}>
                                    <View style={styles.settingInfo}>
                                        <View style={styles.iconWrapper}>
                                            <Receipt size={20} color={colors.text.primary} strokeWidth={2} />
                                        </View>
                                        <View>
                                            <Text style={styles.settingLabel}>GST Rate</Text>
                                            <Text style={styles.settingDescription}>
                                                Current rate: {settings.gstRate || 18}%
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.currencyValue}>{settings.gstRate || 18}%</Text>
                                </TouchableOpacity>

                                {showGstRatePicker && (
                                    <View style={styles.currencyPicker}>
                                        {GST_RATES.map((rate) => (
                                            <TouchableOpacity
                                                key={rate}
                                                style={[styles.currencyOption, settings.gstRate === rate && styles.currencySelected]}
                                                onPress={() => {
                                                    updateSettings({ gstRate: rate });
                                                    setShowGstRatePicker(false);
                                                }}
                                            >
                                                <Text style={styles.currencyCode}>{rate}%</Text>
                                                <Text style={styles.currencyName}>GST Rate</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </Card>

                            <Card style={styles.settingCard}>
                                <View style={styles.settingRow}>
                                    <View style={styles.settingInfo}>
                                        <View style={styles.iconWrapper}>
                                            <Receipt size={20} color={colors.text.primary} strokeWidth={2} />
                                        </View>
                                        <View>
                                            <Text style={styles.settingLabel}>GST Type</Text>
                                            <Text style={styles.settingDescription}>
                                                {settings.gstType === 'inter' ? 'Inter-state (IGST)' : 'Intra-state (CGST + SGST)'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={styles.gstTypeSelector}>
                                    <TouchableOpacity
                                        style={[
                                            styles.gstTypeOption,
                                            settings.gstType !== 'inter' && { backgroundColor: colors.brand.primary }
                                        ]}
                                        onPress={() => updateSettings({ gstType: 'intra' })}
                                    >
                                        <Text style={[
                                            styles.gstTypeText,
                                            settings.gstType !== 'inter' && { color: colors.text.inverse }
                                        ]}>CGST + SGST</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.gstTypeOption,
                                            settings.gstType === 'inter' && { backgroundColor: colors.brand.primary }
                                        ]}
                                        onPress={() => updateSettings({ gstType: 'inter' })}
                                    >
                                        <Text style={[
                                            styles.gstTypeText,
                                            settings.gstType === 'inter' && { color: colors.text.inverse }
                                        ]}>IGST</Text>
                                    </TouchableOpacity>
                                </View>
                            </Card>
                        </>
                    )}

                    {/* Invoice Settings */}
                    <Text style={styles.sectionTitle}>Invoice</Text>
                    <Card style={styles.settingCard}>
                        <TouchableOpacity style={styles.settingRow} onPress={() => setShowPrintSizePicker(!showPrintSizePicker)}>
                            <View style={styles.settingInfo}>
                                <View style={styles.iconWrapper}>
                                    <Printer size={20} color={colors.text.primary} strokeWidth={2} />
                                </View>
                                <View>
                                    <Text style={styles.settingLabel}>Default Print Size</Text>
                                    <Text style={styles.settingDescription}>
                                        {settings.invoicePrintSize === 'thermal58' ? '58mm Thermal' : settings.invoicePrintSize === 'thermal80' ? '80mm Thermal' : settings.invoicePrintSize || 'A4'}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.currencyValue}>{settings.invoicePrintSize || 'A4'}</Text>
                        </TouchableOpacity>

                        {showPrintSizePicker && (
                            <View style={styles.currencyPicker}>
                                {[
                                    { value: 'A4', label: 'A4 (Full Page)' },
                                    { value: 'A5', label: 'A5 (Half Page)' },
                                    { value: 'thermal80', label: '80mm Thermal' },
                                    { value: 'thermal58', label: '58mm Thermal' },
                                ].map((opt) => (
                                    <TouchableOpacity
                                        key={opt.value}
                                        style={[styles.currencyOption, settings.invoicePrintSize === opt.value && styles.currencySelected]}
                                        onPress={() => {
                                            updateSettings({ invoicePrintSize: opt.value as any });
                                            setShowPrintSizePicker(false);
                                        }}
                                    >
                                        <Text style={styles.currencyCode}>{opt.value}</Text>
                                        <Text style={styles.currencyName}>{opt.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </Card>

                    <Card style={styles.settingCard}>
                        <TouchableOpacity style={styles.settingRow} onPress={() => setShowTemplatePicker(!showTemplatePicker)}>
                            <View style={styles.settingInfo}>
                                <View style={styles.iconWrapper}>
                                    <FileText size={20} color={colors.text.primary} strokeWidth={2} />
                                </View>
                                <View>
                                    <Text style={styles.settingLabel}>Default Template</Text>
                                    <Text style={styles.settingDescription}>
                                        {(settings.invoiceTemplate || 'classic').charAt(0).toUpperCase() + (settings.invoiceTemplate || 'classic').slice(1)} style
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.currencyValue}>{(settings.invoiceTemplate || 'classic').charAt(0).toUpperCase() + (settings.invoiceTemplate || 'classic').slice(1)}</Text>
                        </TouchableOpacity>

                        {showTemplatePicker && (
                            <View style={styles.currencyPicker}>
                                {[
                                    { value: 'classic', label: 'Classic', desc: 'Red accent, formal layout' },
                                    { value: 'modern', label: 'Modern', desc: 'Gradient header, card layout' },
                                    { value: 'minimal', label: 'Minimal', desc: 'Black & white, compact' },
                                ].map((opt) => (
                                    <TouchableOpacity
                                        key={opt.value}
                                        style={[styles.currencyOption, settings.invoiceTemplate === opt.value && styles.currencySelected]}
                                        onPress={() => {
                                            updateSettings({ invoiceTemplate: opt.value as any });
                                            setShowTemplatePicker(false);
                                        }}
                                    >
                                        <Text style={styles.currencyCode}>{opt.label}</Text>
                                        <Text style={styles.currencyName}>{opt.desc}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
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

                    {/* User & Security Section */}
                    <Text style={styles.sectionTitle}>User & Security</Text>
                    <Card style={styles.settingCard}>
                        <TouchableOpacity style={styles.settingRow} onPress={() => logout()}>
                            <View style={styles.settingInfo}>
                                <View style={[styles.iconWrapper, { backgroundColor: colors.semantic.soft }]}>
                                    <UserIcon size={20} color={colors.text.primary} strokeWidth={2} />
                                </View>
                                <View>
                                    <Text style={styles.settingLabel}>Switch User / Logout</Text>
                                    <Text style={styles.settingDescription}>Current: {currentUser?.name} ({role})</Text>
                                </View>
                            </View>
                            <ChevronRight size={20} color={colors.text.muted} strokeWidth={2} />
                        </TouchableOpacity>
                    </Card>

                    {canManageSettings && (
                        <Card style={styles.settingCard}>
                            <TouchableOpacity style={styles.settingRow} onPress={() => navigation.navigate('UserManager')}>
                                <View style={styles.settingInfo}>
                                    <View style={[styles.iconWrapper, { backgroundColor: colors.brand.primary + '15' }]}>
                                        <AlertTriangle size={20} color={colors.brand.primary} strokeWidth={2} />
                                    </View>
                                    <View>
                                        <Text style={styles.settingLabel}>Manage Users & Roles</Text>
                                        <Text style={styles.settingDescription}>Add/edit staff and manager access</Text>
                                    </View>
                                </View>
                                <ChevronRight size={20} color={colors.text.muted} strokeWidth={2} />
                            </TouchableOpacity>
                        </Card>
                    )}

                    <Card style={styles.settingCard}>
                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <View style={styles.iconWrapper}>
                                    <Lock size={20} color={colors.text.primary} strokeWidth={2} />
                                </View>
                                <View>
                                    <Text style={styles.settingLabel}>Enable Global App Lock</Text>
                                    <Text style={styles.settingDescription}>PIN required on app startup</Text>
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

                    {settings.lock && (
                        <Card style={styles.settingCard}>
                            <View style={styles.settingRow}>
                                <View style={styles.settingInfo}>
                                    <View style={styles.iconWrapper}>
                                        <Fingerprint size={20} color={colors.text.primary} strokeWidth={2} />
                                    </View>
                                    <View>
                                        <Text style={styles.settingLabel}>Use Biometrics</Text>
                                        <Text style={styles.settingDescription}>Fingerprint or Face ID unlock</Text>
                                    </View>
                                </View>
                                <Switch
                                    value={Boolean(settings.biometricEnabled)}
                                    onValueChange={(val) => updateSettings({ biometricEnabled: val })}
                                    trackColor={{ false: colors.border.default, true: colors.brand.primary }}
                                    thumbColor={colors.semantic.surface}
                                />
                            </View>
                        </Card>
                    )}

                    {canManageSettings && (
                        <>
                            <Text style={styles.sectionTitle}>Cloud Storage</Text>
                            <Card style={styles.settingCard}>
                                <TouchableOpacity
                                    style={styles.settingRow}
                                    onPress={handleCloudBackup}
                                    disabled={isCloudSyncing}
                                >
                                    <View style={styles.settingInfo}>
                                        <View style={[styles.iconWrapper, { backgroundColor: colors.brand.primary + '15' }]}>
                                            <CloudUpload size={20} color={colors.brand.primary} strokeWidth={2} />
                                        </View>
                                        <View>
                                            <View style={styles.row}>
                                                <Text style={styles.settingLabel}>Backup to Drive</Text>
                                                {isCloudSyncing && <ActivityIndicator size="small" color={colors.brand.primary} style={{ marginLeft: 10 }} />}
                                            </View>
                                            <Text style={styles.settingDescription}>
                                                {lastCloudSync ? `Last synced: ${lastCloudSync}` : 'Export data to Google Drive'}
                                            </Text>
                                        </View>
                                    </View>
                                    <ChevronRight size={20} color={colors.text.muted} strokeWidth={2} />
                                </TouchableOpacity>
                            </Card>

                            <Card style={styles.settingCard}>
                                <View style={styles.settingRow}>
                                    <View style={styles.settingInfo}>
                                        <View style={[styles.iconWrapper, { backgroundColor: colors.brand.primary + '15' }]}>
                                            <RefreshCw size={20} color={colors.brand.primary} strokeWidth={2} />
                                        </View>
                                        <View>
                                            <Text style={styles.settingLabel}>Auto Cloud Sync</Text>
                                            <Text style={styles.settingDescription}>Automatically backup on every change</Text>
                                        </View>
                                    </View>
                                    <Switch
                                        value={Boolean(settings.autoCloudBackup)}
                                        onValueChange={(val) => updateSettings({ autoCloudBackup: val })}
                                        trackColor={{ false: colors.border.default, true: colors.brand.primary }}
                                        thumbColor={colors.semantic.surface}
                                    />
                                </View>
                            </Card>

                            <Card style={styles.settingCard}>
                                <TouchableOpacity
                                    style={styles.settingRow}
                                    onPress={handleCloudRestore}
                                    disabled={isCloudSyncing}
                                >
                                    <View style={styles.settingInfo}>
                                        <View style={[styles.iconWrapper, { backgroundColor: colors.semantic.success + '15' }]}>
                                            <CloudDownload size={20} color={colors.semantic.success} strokeWidth={2} />
                                        </View>
                                        <View>
                                            <Text style={styles.settingLabel}>Restore from Drive</Text>
                                            <Text style={styles.settingDescription}>Import data from Google Drive</Text>
                                        </View>
                                    </View>
                                    <ChevronRight size={20} color={colors.text.muted} strokeWidth={2} />
                                </TouchableOpacity>
                            </Card>

                            <Text style={styles.sectionTitle}>Real-time Cloud Sync (Supabase)</Text>
                            <Card style={styles.settingCard}>
                                <View style={styles.syncConfig}>
                                    <Text style={styles.syncHint}>Connect to your Supabase project for real-time sync with Desktop.</Text>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Supabase URL</Text>
                                        <Input
                                            placeholder="https://your-project.supabase.co"
                                            value={supabaseUrl}
                                            onChangeText={setSupabaseUrl}
                                            autoCapitalize="none"
                                            containerStyle={styles.syncInput}
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Anon Key</Text>
                                        <Input
                                            placeholder="your-anon-key"
                                            value={supabaseKey}
                                            onChangeText={setSupabaseKey}
                                            secureTextEntry
                                            autoCapitalize="none"
                                            containerStyle={styles.syncInput}
                                        />
                                    </View>

                                    <TouchableOpacity
                                        style={styles.saveSyncBtn}
                                        onPress={saveSyncCreds}
                                    >
                                        <RefreshCw size={16} color="#FFF" style={{ marginRight: 8 }} />
                                        <Text style={styles.saveSyncText}>Save & Enable Sync</Text>
                                    </TouchableOpacity>

                                    <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: colors.border.default, paddingTop: 16 }}>
                                        <TouchableOpacity
                                            style={{
                                                borderWidth: 1,
                                                borderColor: colors.border.default,
                                                paddingVertical: 10,
                                                borderRadius: tokens.radius.md,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: colors.semantic.soft
                                            }}
                                            onPress={() => setShowGuide(!showGuide)}
                                        >
                                            <Text style={{ fontSize: tokens.typography.sizes.sm, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.medium }}>
                                                {showGuide ? 'Hide Setup Guide' : 'Show Setup Guide'}
                                            </Text>
                                        </TouchableOpacity>

                                        {showGuide && (
                                            <View style={{ marginTop: 12 }}>
                                                <Text style={{ fontSize: tokens.typography.sizes.sm, color: colors.brand.primary, fontFamily: tokens.typography.fontFamily.semibold, marginBottom: 8 }}>
                                                    4-Step Sync Guide:
                                                </Text>
                                                
                                                <View style={{ gap: 12 }}>
                                                    <Text style={{ fontSize: tokens.typography.sizes.xs, color: colors.text.primary, lineHeight: 18 }}>
                                                        <Text style={{ fontFamily: tokens.typography.fontFamily.bold }}>1. </Text>
                                                        Create a free project at <Text style={{ color: colors.brand.primary, textDecorationLine: 'underline' }} onPress={() => Linking.openURL('https://supabase.com')}>supabase.com</Text>.
                                                    </Text>

                                                    <View>
                                                        <Text style={{ fontSize: tokens.typography.sizes.xs, color: colors.text.primary, lineHeight: 18, marginBottom: 6 }}>
                                                            <Text style={{ fontFamily: tokens.typography.fontFamily.bold }}>2. </Text>
                                                            Open the <Text style={{ fontFamily: tokens.typography.fontFamily.bold }}>SQL Editor</Text> on your Supabase dashboard, paste the setup script, and click Run.
                                                        </Text>
                                                        <TouchableOpacity
                                                            style={{
                                                                backgroundColor: colors.semantic.soft,
                                                                borderWidth: 1,
                                                                borderColor: colors.border.default,
                                                                paddingVertical: 6,
                                                                paddingHorizontal: 12,
                                                                borderRadius: tokens.radius.sm,
                                                                alignSelf: 'flex-start'
                                                            }}
                                                            onPress={handleCopySQL}
                                                        >
                                                            <Text style={{ fontSize: 11, color: colors.text.primary, fontFamily: tokens.typography.fontFamily.medium }}>
                                                                {copiedSQL ? 'SQL Copied! ✅' : '📋 Copy SQL Database Script'}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    </View>

                                                    <Text style={{ fontSize: tokens.typography.sizes.xs, color: colors.text.primary, lineHeight: 18 }}>
                                                        <Text style={{ fontFamily: tokens.typography.fontFamily.bold }}>3. </Text>
                                                        Go to project Settings &gt; API in Supabase, and copy the Project URL and Anon Key.
                                                    </Text>

                                                    <Text style={{ fontSize: tokens.typography.sizes.xs, color: colors.text.primary, lineHeight: 18 }}>
                                                        <Text style={{ fontFamily: tokens.typography.fontFamily.bold }}>4. </Text>
                                                        Paste them into the fields above, click "Save & Enable Sync", and restart the app.
                                                    </Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </Card>
                        </>
                    )}

                    {canManageSettings && (
                        <>
                            <Text style={styles.sectionTitle}>Local Data Management</Text>
                            <Card style={styles.settingCard}>
                                <TouchableOpacity style={styles.settingRow} onPress={handleBackup}>
                                    <View style={styles.settingInfo}>
                                        <View style={styles.iconWrapper}>
                                            <Share2 size={20} color={colors.text.primary} strokeWidth={2} />
                                        </View>
                                        <View>
                                            <Text style={styles.settingLabel}>Export JSON</Text>
                                            <Text style={styles.settingDescription}>Share data file manually</Text>
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
                        </>
                    )}

                    <Text style={styles.sectionTitle}>About</Text>
                    <Card style={styles.settingCard}>
                        <View style={styles.aboutSection}>
                            <Text style={styles.appName}>Math Note</Text>
                            <Text style={styles.tagline}>Every Number. Clearly Noted.</Text>
                            <Text style={styles.version}>Version {Constants.expoConfig?.version ?? '1.0.0'}</Text>
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
    syncConfig: { padding: tokens.spacing.sm },
    syncHint: { fontSize: tokens.typography.sizes.xs, color: colors.text.muted, marginBottom: tokens.spacing.md, fontFamily: tokens.typography.fontFamily.regular },
    inputGroup: { marginBottom: tokens.spacing.sm },
    inputLabel: { fontSize: tokens.typography.sizes.xs, color: colors.text.primary, marginBottom: 4, fontFamily: tokens.typography.fontFamily.medium },
    syncInput: { marginBottom: 0 },
    saveSyncBtn: {
        backgroundColor: colors.brand.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: tokens.radius.md,
        marginTop: tokens.spacing.sm
    },
    saveSyncText: { color: '#FFF', fontSize: tokens.typography.sizes.sm, fontFamily: tokens.typography.fontFamily.bold },
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
    row: { flexDirection: 'row', alignItems: 'center' },
    gstTypeSelector: {
        flexDirection: 'row',
        marginTop: tokens.spacing.md,
        backgroundColor: colors.semantic.background,
        borderRadius: tokens.radius.md,
        padding: 4
    },
    gstTypeOption: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: tokens.radius.sm,
        alignItems: 'center'
    },
    gstTypeText: {
        fontSize: tokens.typography.sizes.sm,
        color: colors.text.primary,
        fontFamily: tokens.typography.fontFamily.medium
    },
});

export default SettingsScreen;

const SQL_SCHEMA = `-- MathNote Unified Supabase Database Setup Script

-- 1. Sales Table
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  date DATE,
  "customerName" TEXT,
  "customerState" TEXT,
  "customerAddress" TEXT,
  "customerGSTIN" TEXT,
  "customerPhone" TEXT,
  "totalAmount" NUMERIC,
  "paidAmount" NUMERIC,
  "paymentMethod" TEXT,
  note TEXT,
  items JSONB,
  "invoiceNumber" TEXT,
  subtotal NUMERIC,
  "discountTotal" NUMERIC,
  "discountType" TEXT,
  "taxTotal" NUMERIC,
  cgst NUMERIC,
  sgst NUMERIC,
  igst NUMERIC,
  "gstRate" NUMERIC,
  "taxMode" TEXT,
  "returnIds" JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT,
  brand TEXT,
  sku TEXT,
  barcode TEXT,
  "hsnCode" TEXT,
  category TEXT,
  price NUMERIC,
  "costPrice" NUMERIC,
  stock NUMERIC,
  unit TEXT,
  "lowStockThreshold" NUMERIC,
  "taxRate" NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Contacts Table
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  state TEXT,
  gstin TEXT,
  type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  date DATE,
  category TEXT,
  amount NUMERIC,
  note TEXT,
  "vendorName" TEXT,
  "vendorId" TEXT,
  "paymentMethod" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Credits Table
CREATE TABLE IF NOT EXISTS credits (
  id TEXT PRIMARY KEY,
  party TEXT,
  type TEXT,
  amount NUMERIC,
  "paidAmount" NUMERIC,
  status TEXT,
  date DATE,
  "dueDate" DATE,
  note TEXT,
  "linkedSaleId" TEXT,
  "linkedPurchaseId" TEXT,
  payments JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Returns Table
CREATE TABLE IF NOT EXISTS returns (
  id TEXT PRIMARY KEY,
  "saleId" TEXT,
  date DATE,
  party TEXT,
  amount NUMERIC,
  note TEXT,
  items JSONB,
  "linkedCreditId" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Purchases Table
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  date DATE,
  "vendorName" TEXT,
  "vendorState" TEXT,
  "totalAmount" NUMERIC,
  "paidAmount" NUMERIC,
  "paymentMethod" TEXT,
  note TEXT,
  items JSONB,
  "linkedExpenseId" TEXT,
  "linkedCreditId" TEXT,
  cgst NUMERIC,
  sgst NUMERIC,
  igst NUMERIC,
  "gstRate" NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Quotations Table
CREATE TABLE IF NOT EXISTS quotations (
  id TEXT PRIMARY KEY,
  date DATE,
  "quotationNumber" TEXT,
  "customerName" TEXT,
  "customerState" TEXT,
  "customerAddress" TEXT,
  "customerGSTIN" TEXT,
  "customerPhone" TEXT,
  items JSONB,
  subtotal NUMERIC,
  "discountTotal" NUMERIC,
  "discountType" TEXT,
  "taxTotal" NUMERIC,
  cgst NUMERIC,
  sgst NUMERIC,
  igst NUMERIC,
  "gstRate" NUMERIC,
  "taxMode" TEXT,
  "grandTotal" NUMERIC,
  "validUntil" DATE,
  terms TEXT,
  status TEXT,
  "convertedSaleId" TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Purchase Orders Table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  date DATE,
  "poNumber" TEXT,
  "vendorName" TEXT,
  "vendorState" TEXT,
  items JSONB,
  subtotal NUMERIC,
  "taxTotal" NUMERIC,
  cgst NUMERIC,
  sgst NUMERIC,
  igst NUMERIC,
  "gstRate" NUMERIC,
  "grandTotal" NUMERIC,
  "expectedDate" DATE,
  status TEXT,
  "convertedPurchaseId" TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  "staffId" TEXT,
  "staffName" TEXT,
  date DATE,
  status TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Users Table (Auth credentials)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT,
  password TEXT,
  pin TEXT,
  role TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Business Profile Table
CREATE TABLE IF NOT EXISTS business_profile (
  id TEXT PRIMARY KEY,
  "businessName" TEXT,
  "ownerName" TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  state TEXT,
  city TEXT,
  pincode TEXT,
  gstin TEXT,
  "panNumber" TEXT,
  category TEXT,
  "taxType" TEXT,
  "logoBase64" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ENABLE REALTIME REPLICATION FOR ALL TABLES
ALTER PUBLICATION supabase_realtime ADD TABLE sales, products, contacts, expenses, credits, returns, purchases, quotations, purchase_orders, attendance, users, business_profile;
`;
