import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Modal,
    FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    Building2,
    User,
    Phone,
    MapPin,
    Hash,
    Lock,
    Eye,
    EyeOff,
    Check,
    ArrowLeft,
    ArrowRight,
    Key,
} from 'lucide-react-native';
import { tokens, useTheme } from '../theme';
import { useAuth } from '../context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabaseClient';

const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

export const RegisterScreen: React.FC = () => {
    const { colors } = useTheme();
    const { register } = useAuth();

    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Step 1 Form State (Business Details)
    const [businessName, setBusinessName] = useState('');
    const [ownerName, setOwnerName] = useState('');
    const [phone, setPhone] = useState('');
    const [state, setState] = useState('');
    const [address, setAddress] = useState('');
    const [gstin, setGstin] = useState('');

    // Step 2 Form State (Cloud Sync Setup)
    const [enableSync, setEnableSync] = useState(false);
    const [supabaseUrl, setSupabaseUrl] = useState('');
    const [supabaseKey, setSupabaseKey] = useState('');

    // Step 3 Form State (Account Credentials)
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [pin, setPin] = useState('');

    // UI helper states
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isStateModalVisible, setIsStateModalVisible] = useState(false);

    const styles = useMemo(() => createStyles(colors), [colors]);

    const validateStep1 = (): boolean => {
        const errs: Record<string, string> = {};
        if (!businessName.trim()) errs.businessName = 'Business name is required';
        if (!ownerName.trim()) errs.ownerName = 'Owner name is required';
        if (!phone.trim()) errs.phone = 'Phone number is required';
        else if (phone.length < 10) errs.phone = 'Phone must be at least 10 digits';
        if (!state) errs.state = 'State / Union Territory is required';
        if (gstin && gstin.trim().length !== 15) errs.gstin = 'GSTIN must be 15 characters';
        
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const validateStep2Sync = (): boolean => {
        if (!enableSync) return true;
        const errs: Record<string, string> = {};
        if (!supabaseUrl.trim()) errs.supabaseUrl = 'Supabase Project URL is required';
        else if (!supabaseUrl.trim().startsWith('http')) errs.supabaseUrl = 'URL must start with http:// or https://';
        if (!supabaseKey.trim()) errs.supabaseKey = 'Supabase Anon Key is required';
        
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const validateAccountSetup = (): boolean => {
        const errs: Record<string, string> = {};
        if (!username.trim()) errs.username = 'Username is required';
        else if (username.trim().length < 3) errs.username = 'Username must be at least 3 characters';
        else if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) errs.username = 'Letters, numbers and underscores only';
        
        if (!password) errs.password = 'Password is required';
        else if (password.length < 4) errs.password = 'Password must be at least 4 characters';
        
        if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
        
        if (!pin) errs.pin = 'Login PIN is required';
        else if (pin.length !== 4) errs.pin = 'PIN must be exactly 4 digits';

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleNext = () => {
        if (step === 1 && validateStep1()) {
            setStep(2);
        } else if (step === 2 && validateStep2Sync()) {
            setStep(3);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        }
    };

    const handleRegister = async () => {
        if (!validateAccountSetup()) return;

        setIsLoading(true);
        try {
            if (enableSync) {
                await AsyncStorage.setItem('SUPABASE_URL', supabaseUrl.trim());
                await AsyncStorage.setItem('SUPABASE_KEY', supabaseKey.trim());
                supabase.reset();
            } else {
                await AsyncStorage.removeItem('SUPABASE_URL');
                await AsyncStorage.removeItem('SUPABASE_KEY');
                supabase.reset();
            }

            const profile = {
                businessName: businessName.trim(),
                ownerName: ownerName.trim(),
                phone: phone.trim(),
                address: address.trim(),
                state,
                gstin: gstin.trim().toUpperCase(),
                email: '',
                city: '',
                pincode: '',
                panNumber: '',
                category: 'Retail',
                taxType: gstin ? 'GST' : 'NON-GST',
                logoBase64: '',
            };

            await register(profile, username, password, pin);
        } catch (err) {
            console.error('Registration failed:', err);
            setErrors({ global: 'Failed to create business profile. Please try again.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
                    <View style={styles.card}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.logoIcon}>
                                <Building2 size={36} color={colors.brand.primary} strokeWidth={2} />
                            </View>
                            <Text style={styles.title}>Welcome to MathNote</Text>
                            <Text style={styles.subtitle}>Let's set up your business account</Text>
                        </View>

                        {/* Step Progress Indicators */}
                        <View style={styles.progressContainer}>
                            <View style={[styles.progressStep, step >= 1 && styles.progressStepActive]}>
                                <Text style={[styles.progressNumber, step >= 1 && styles.progressNumberActive]}>1</Text>
                                <Text style={styles.progressLabel}>Business</Text>
                            </View>
                            <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
                            <View style={[styles.progressStep, step >= 2 && styles.progressStepActive]}>
                                <Text style={[styles.progressNumber, step >= 2 && styles.progressNumberActive]}>2</Text>
                                <Text style={styles.progressLabel}>Sync</Text>
                            </View>
                            <View style={[styles.progressLine, step >= 3 && styles.progressLineActive]} />
                            <View style={[styles.progressStep, step >= 3 && styles.progressStepActive]}>
                                <Text style={[styles.progressNumber, step >= 3 && styles.progressNumberActive]}>3</Text>
                                <Text style={styles.progressLabel}>Account</Text>
                            </View>
                        </View>

                        {errors.global && (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>{errors.global}</Text>
                            </View>
                        )}

                        {/* STEP 1: BUSINESS DETAILS */}
                        {step === 1 && (
                            <View style={styles.form}>
                                <Text style={styles.label}>Business Name *</Text>
                                <View style={[styles.inputContainer, errors.businessName && styles.inputError]}>
                                    <Building2 size={20} color={colors.text.muted} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. Arjun Electronics"
                                        placeholderTextColor={colors.text.muted}
                                        value={businessName}
                                        onChangeText={setBusinessName}
                                    />
                                </View>
                                {errors.businessName && <Text style={styles.fieldError}>{errors.businessName}</Text>}

                                <Text style={styles.label}>Owner Name *</Text>
                                <View style={[styles.inputContainer, errors.ownerName && styles.inputError]}>
                                    <User size={20} color={colors.text.muted} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Your full name"
                                        placeholderTextColor={colors.text.muted}
                                        value={ownerName}
                                        onChangeText={setOwnerName}
                                    />
                                </View>
                                {errors.ownerName && <Text style={styles.fieldError}>{errors.ownerName}</Text>}

                                <Text style={styles.label}>Phone Number *</Text>
                                <View style={[styles.inputContainer, errors.phone && styles.inputError]}>
                                    <Phone size={20} color={colors.text.muted} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="10-digit phone number"
                                        placeholderTextColor={colors.text.muted}
                                        keyboardType="phone-pad"
                                        maxLength={10}
                                        value={phone}
                                        onChangeText={text => setPhone(text.replace(/\D/g, ''))}
                                    />
                                </View>
                                {errors.phone && <Text style={styles.fieldError}>{errors.phone}</Text>}

                                <Text style={styles.label}>State *</Text>
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    style={[styles.inputContainer, errors.state && styles.inputError]}
                                    onPress={() => setIsStateModalVisible(true)}
                                >
                                    <MapPin size={20} color={colors.text.muted} style={styles.inputIcon} />
                                    <Text style={[styles.input, !state && { color: colors.text.muted }, { textAlignVertical: 'center', lineHeight: 48 }]}>
                                        {state || 'Select your state'}
                                    </Text>
                                </TouchableOpacity>
                                {errors.state && <Text style={styles.fieldError}>{errors.state}</Text>}

                                <Text style={styles.label}>Address</Text>
                                <View style={styles.inputContainer}>
                                    <MapPin size={20} color={colors.text.muted} style={styles.inputIcon} />
                                    <TextInput
                                        style={[styles.input, styles.textArea]}
                                        placeholder="Business address (optional)"
                                        placeholderTextColor={colors.text.muted}
                                        multiline
                                        numberOfLines={2}
                                        value={address}
                                        onChangeText={setAddress}
                                    />
                                </View>

                                <Text style={styles.label}>GSTIN (GST Identification Number)</Text>
                                <View style={[styles.inputContainer, errors.gstin && styles.inputError]}>
                                    <Hash size={20} color={colors.text.muted} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="15-digit GSTIN (optional)"
                                        placeholderTextColor={colors.text.muted}
                                        autoCapitalize="characters"
                                        maxLength={15}
                                        value={gstin}
                                        onChangeText={setGstin}
                                    />
                                </View>
                                {errors.gstin && <Text style={styles.fieldError}>{errors.gstin}</Text>}

                                <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
                                    <Text style={styles.buttonText}>Continue</Text>
                                    <ArrowRight size={20} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* STEP 2: CLOUD SYNC */}
                        {step === 2 && (
                            <View style={styles.form}>
                                <Text style={[styles.label, { textAlign: 'center', fontSize: 16, marginBottom: 8 }]}>
                                    Real-time Cloud Sync
                                </Text>
                                <Text style={{ color: colors.text.secondary, textAlign: 'center', fontSize: 13, marginBottom: 20 }}>
                                    Do you want to sync your data across multiple devices (Desktop & Mobile)?
                                </Text>

                                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        style={[
                                            styles.backButton,
                                            { flex: 1, height: 50 },
                                            enableSync && { borderColor: colors.brand.primary, backgroundColor: colors.semantic.soft }
                                        ]}
                                        onPress={() => { setEnableSync(true); setErrors({}); }}
                                    >
                                        <Text style={[styles.backButtonText, { color: enableSync ? colors.brand.primary : colors.text.primary }]}>
                                            Yes, sync devices
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        style={[
                                            styles.backButton,
                                            { flex: 1, height: 50 },
                                            !enableSync && { borderColor: colors.brand.primary, backgroundColor: colors.semantic.soft }
                                        ]}
                                        onPress={() => { setEnableSync(false); setErrors({}); }}
                                    >
                                        <Text style={[styles.backButtonText, { color: !enableSync ? colors.brand.primary : colors.text.primary }]}>
                                            No, local only
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {enableSync && (
                                    <View style={{ marginTop: 8 }}>
                                        <Text style={{ fontSize: 12, color: colors.text.secondary, marginBottom: 12 }}>
                                            Enter your Supabase connection parameters below:
                                        </Text>
                                        <Text style={styles.label}>Supabase Project URL *</Text>
                                        <View style={[styles.inputContainer, errors.supabaseUrl && styles.inputError]}>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="https://your-project.supabase.co"
                                                placeholderTextColor={colors.text.muted}
                                                value={supabaseUrl}
                                                onChangeText={text => { setSupabaseUrl(text); setErrors(prev => { const n = {...prev}; delete n.supabaseUrl; return n; }); }}
                                                autoCapitalize="none"
                                                autoCorrect={false}
                                            />
                                        </View>
                                        {errors.supabaseUrl && <Text style={styles.fieldError}>{errors.supabaseUrl}</Text>}

                                        <Text style={styles.label}>Supabase Anon Key *</Text>
                                        <View style={[styles.inputContainer, errors.supabaseKey && styles.inputError]}>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="your-supabase-anon-key"
                                                placeholderTextColor={colors.text.muted}
                                                value={supabaseKey}
                                                onChangeText={text => { setSupabaseKey(text); setErrors(prev => { const n = {...prev}; delete n.supabaseKey; return n; }); }}
                                                autoCapitalize="none"
                                                autoCorrect={false}
                                            />
                                        </View>
                                        {errors.supabaseKey && <Text style={styles.fieldError}>{errors.supabaseKey}</Text>}
                                    </View>
                                )}

                                <View style={styles.buttonRow}>
                                    <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                                        <ArrowLeft size={20} color={colors.text.primary} />
                                        <Text style={[styles.backButtonText, { color: colors.text.primary }]}>Back</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={[styles.primaryButton, { flex: 2, marginTop: 0 }]} onPress={handleNext}>
                                        <Text style={styles.buttonText}>Continue</Text>
                                        <ArrowRight size={20} color="#FFF" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* STEP 3: CREDENTIALS */}
                        {step === 3 && (
                            <View style={styles.form}>
                                <Text style={styles.label}>Username *</Text>
                                <View style={[styles.inputContainer, errors.username && styles.inputError]}>
                                    <User size={20} color={colors.text.muted} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Choose username"
                                        placeholderTextColor={colors.text.muted}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        value={username}
                                        onChangeText={setUsername}
                                    />
                                </View>
                                {errors.username && <Text style={styles.fieldError}>{errors.username}</Text>}

                                <Text style={styles.label}>Password *</Text>
                                <View style={[styles.inputContainer, errors.password && styles.inputError]}>
                                    <Lock size={20} color={colors.text.muted} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter password"
                                        placeholderTextColor={colors.text.muted}
                                        secureTextEntry={!showPassword}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        value={password}
                                        onChangeText={setPassword}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowPassword(!showPassword)}
                                        style={styles.eyeIcon}
                                    >
                                        {showPassword ? (
                                            <EyeOff size={20} color={colors.text.secondary} />
                                        ) : (
                                            <Eye size={20} color={colors.text.secondary} />
                                        )}
                                    </TouchableOpacity>
                                </View>
                                {errors.password && <Text style={styles.fieldError}>{errors.password}</Text>}

                                <Text style={styles.label}>Confirm Password *</Text>
                                <View style={[styles.inputContainer, errors.confirmPassword && styles.inputError]}>
                                    <Lock size={20} color={colors.text.muted} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Re-enter password"
                                        placeholderTextColor={colors.text.muted}
                                        secureTextEntry={!showConfirmPassword}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                        style={styles.eyeIcon}
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff size={20} color={colors.text.secondary} />
                                        ) : (
                                            <Eye size={20} color={colors.text.secondary} />
                                        )}
                                    </TouchableOpacity>
                                </View>
                                {errors.confirmPassword && <Text style={styles.fieldError}>{errors.confirmPassword}</Text>}

                                <Text style={styles.label}>Login PIN (4 Digits) *</Text>
                                <View style={[styles.inputContainer, errors.pin && styles.inputError]}>
                                    <Key size={20} color={colors.text.muted} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="4-digit PIN for app lock"
                                        placeholderTextColor={colors.text.muted}
                                        keyboardType="numeric"
                                        maxLength={4}
                                        secureTextEntry
                                        value={pin}
                                        onChangeText={text => setPin(text.replace(/\D/g, ''))}
                                    />
                                </View>
                                {errors.pin && <Text style={styles.fieldError}>{errors.pin}</Text>}

                                <View style={styles.buttonRow}>
                                    <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                                        <ArrowLeft size={20} color={colors.text.primary} />
                                        <Text style={[styles.backButtonText, { color: colors.text.primary }]}>Back</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.primaryButton, styles.registerButton, isLoading && styles.buttonDisabled]}
                                        onPress={handleRegister}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <ActivityIndicator size="small" color="#FFF" />
                                        ) : (
                                            <>
                                                <Text style={styles.buttonText}>Register</Text>
                                                <Check size={20} color="#FFF" />
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* STATE SELECTION MODAL */}
            <Modal
                visible={isStateModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsStateModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select State / UT</Text>
                            <TouchableOpacity onPress={() => setIsStateModalVisible(false)} style={styles.modalCloseButton}>
                                <Text style={[styles.modalCloseText, { color: colors.brand.primary }]}>Done</Text>
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={INDIAN_STATES}
                            keyExtractor={item => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.modalItem, state === item && { backgroundColor: colors.semantic.soft }]}
                                    onPress={() => {
                                        setState(item);
                                        setErrors(prev => { const e = { ...prev }; delete e.state; return e; });
                                        setIsStateModalVisible(false);
                                    }}
                                >
                                    <Text style={[styles.modalItemText, state === item && { color: colors.brand.primary, fontFamily: tokens.typography.fontFamily.semibold }]}>
                                        {item}
                                    </Text>
                                    {state === item && <Check size={18} color={colors.brand.primary} />}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const createStyles = (colors: typeof tokens.colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.semantic.background,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: tokens.spacing.lg,
    },
    card: {
        backgroundColor: colors.semantic.surface,
        borderRadius: tokens.radius.xl,
        padding: tokens.spacing.xl,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
        elevation: 4,
        borderWidth: 1,
        borderColor: colors.border.default,
    },
    header: {
        alignItems: 'center',
        marginBottom: tokens.spacing.lg,
    },
    logoIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: colors.semantic.soft,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: tokens.spacing.md,
    },
    title: {
        fontSize: tokens.typography.sizes.lg,
        color: colors.brand.secondary,
        fontFamily: tokens.typography.fontFamily.bold,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: tokens.typography.sizes.sm,
        color: colors.text.secondary,
        marginTop: tokens.spacing.xxs,
        fontFamily: tokens.typography.fontFamily.regular,
        textAlign: 'center',
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: tokens.spacing.lg,
        paddingHorizontal: tokens.spacing.lg,
    },
    progressStep: {
        alignItems: 'center',
        zIndex: 2,
    },
    progressStepActive: {
        opacity: 1,
    },
    progressNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.semantic.soft,
        color: colors.text.secondary,
        textAlign: 'center',
        lineHeight: 28,
        fontSize: tokens.typography.sizes.sm,
        fontFamily: tokens.typography.fontFamily.semibold,
        overflow: 'hidden',
    },
    progressNumberActive: {
        backgroundColor: colors.brand.primary,
        color: '#FFF',
    },
    progressLabel: {
        fontSize: 10,
        color: colors.text.secondary,
        fontFamily: tokens.typography.fontFamily.medium,
        marginTop: 4,
    },
    progressLine: {
        flex: 1,
        height: 2,
        backgroundColor: colors.semantic.soft,
        marginHorizontal: tokens.spacing.xs,
        marginTop: -16, // align with numbers
    },
    progressLineActive: {
        backgroundColor: colors.brand.primary,
    },
    form: {
        width: '100%',
    },
    label: {
        fontSize: tokens.typography.sizes.sm,
        color: colors.text.primary,
        fontFamily: tokens.typography.fontFamily.semibold,
        marginBottom: tokens.spacing.xs,
        marginTop: tokens.spacing.xs,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.semantic.background,
        borderRadius: tokens.radius.md,
        paddingHorizontal: tokens.spacing.md,
        marginBottom: tokens.spacing.xs,
        borderWidth: 1,
        borderColor: colors.border.default,
        height: 48,
    },
    inputIcon: {
        marginRight: tokens.spacing.sm,
    },
    input: {
        flex: 1,
        color: colors.text.primary,
        fontFamily: tokens.typography.fontFamily.regular,
        fontSize: tokens.typography.sizes.sm,
        height: '100%',
    },
    textArea: {
        textAlignVertical: 'top',
        paddingVertical: tokens.spacing.sm,
    },
    inputError: {
        borderColor: colors.semantic.error,
    },
    fieldError: {
        color: colors.semantic.error,
        fontSize: tokens.typography.sizes.xs,
        fontFamily: tokens.typography.fontFamily.medium,
        marginBottom: tokens.spacing.sm,
        marginLeft: 4,
    },
    eyeIcon: {
        padding: tokens.spacing.xs,
    },
    primaryButton: {
        backgroundColor: colors.brand.primary,
        borderRadius: tokens.radius.md,
        height: 48,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: tokens.spacing.lg,
        shadowColor: colors.brand.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
        gap: tokens.spacing.xs,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: tokens.spacing.md,
        marginTop: tokens.spacing.lg,
    },
    backButton: {
        flex: 1,
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: colors.border.default,
        borderRadius: tokens.radius.md,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        gap: tokens.spacing.xs,
    },
    backButtonText: {
        fontSize: tokens.typography.sizes.sm,
        fontFamily: tokens.typography.fontFamily.semibold,
    },
    registerButton: {
        flex: 2,
        marginTop: 0,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#FFF',
        fontSize: tokens.typography.sizes.sm,
        fontFamily: tokens.typography.fontFamily.semibold,
    },
    errorContainer: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: 'rgba(239, 68, 68, 0.2)',
        borderWidth: 1,
        borderRadius: tokens.radius.md,
        padding: tokens.spacing.md,
        marginBottom: tokens.spacing.md,
    },
    errorText: {
        color: colors.semantic.error,
        fontSize: tokens.typography.sizes.sm,
        fontFamily: tokens.typography.fontFamily.medium,
        textAlign: 'center',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.semantic.surface,
        borderTopLeftRadius: tokens.radius.xl,
        borderTopRightRadius: tokens.radius.xl,
        maxHeight: '70%',
        paddingBottom: tokens.spacing.xl,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: tokens.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.default,
    },
    modalTitle: {
        fontSize: tokens.typography.sizes.md,
        color: colors.text.primary,
        fontFamily: tokens.typography.fontFamily.bold,
    },
    modalCloseButton: {
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    modalCloseText: {
        fontSize: tokens.typography.sizes.sm,
        fontFamily: tokens.typography.fontFamily.semibold,
    },
    modalItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: tokens.spacing.md,
        paddingHorizontal: tokens.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.default,
    },
    modalItemText: {
        fontSize: tokens.typography.sizes.sm,
        color: colors.text.primary,
        fontFamily: tokens.typography.fontFamily.regular,
    },
});
