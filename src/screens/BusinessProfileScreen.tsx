import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Animated,
    TouchableOpacity,
    Alert,
    Image,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Camera, Building2, MapPin, Phone, FileText, Save } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Card, Input } from '../components';
import { tokens, useTheme } from '../theme';
import { useApp } from '../context';

export const BusinessProfileScreen: React.FC = () => {
    const { settings, updateSettings } = useApp();
    const { colors } = useTheme();
    const navigation = useNavigation<any>();
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Form state
    const [businessName, setBusinessName] = useState(settings.businessName || '');
    const [businessAddress, setBusinessAddress] = useState(settings.businessAddress || '');
    const [businessPhone, setBusinessPhone] = useState(settings.businessPhone || '');
    const [businessGSTIN, setBusinessGSTIN] = useState(settings.businessGSTIN || '');
    const [businessLogo, setBusinessLogo] = useState(settings.businessLogo || '');
    const [invoicePrefix, setInvoicePrefix] = useState(settings.invoicePrefix || 'INV');

    const styles = useMemo(() => createStyles(colors), [colors]);

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: tokens.motion.duration.slow,
            useNativeDriver: true,
        }).start();
    }, [fadeAnim]);

    const handlePickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permissionResult.granted) {
            Alert.alert('Permission Required', 'Please allow access to your photo library to select a logo.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled && result.assets[0]) {
            const base64 = result.assets[0].base64;
            if (base64) {
                setBusinessLogo(`data:image/jpeg;base64,${base64}`);
            }
        }
    };

    const handleSave = async () => {
        // Validate GSTIN format (if provided)
        if (businessGSTIN && businessGSTIN.length !== 15) {
            Alert.alert('Invalid GSTIN', 'GSTIN should be exactly 15 characters.');
            return;
        }

        await updateSettings({
            businessName: businessName.trim(),
            businessAddress: businessAddress.trim(),
            businessPhone: businessPhone.trim(),
            businessGSTIN: businessGSTIN.trim().toUpperCase(),
            businessLogo,
            invoicePrefix: invoicePrefix.trim().toUpperCase() || 'INV',
        });

        Alert.alert('Success', 'Business profile saved successfully!', [
            { text: 'OK', onPress: () => navigation.goBack() }
        ]);
    };

    const handleRemoveLogo = () => {
        setBusinessLogo('');
    };

    return (
        <SafeAreaView style={styles.container}>
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <ArrowLeft size={24} color={colors.text.primary} />
                    </TouchableOpacity>
                    <View style={styles.headerText}>
                        <Text style={styles.title}>Business Profile</Text>
                        <Text style={styles.subtitle}>Your details on invoices</Text>
                    </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Logo Section */}
                    <Card style={styles.logoCard}>
                        <Text style={styles.sectionTitle}>Business Logo</Text>
                        <View style={styles.logoContainer}>
                            {businessLogo ? (
                                <TouchableOpacity onPress={handlePickImage} onLongPress={handleRemoveLogo}>
                                    <Image source={{ uri: businessLogo }} style={styles.logoImage} />
                                    <Text style={styles.logoHint}>Tap to change • Long press to remove</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity style={styles.logoPlaceholder} onPress={handlePickImage}>
                                    <Camera size={32} color={colors.text.muted} />
                                    <Text style={styles.logoPlaceholderText}>Add Logo</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </Card>

                    {/* Business Details */}
                    <Card style={styles.formCard}>
                        <Text style={styles.sectionTitle}>Business Details</Text>

                        <View style={styles.inputRow}>
                            <Building2 size={20} color={colors.text.muted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.textInput}
                                placeholder="Business Name"
                                placeholderTextColor={colors.text.muted}
                                value={businessName}
                                onChangeText={setBusinessName}
                            />
                        </View>

                        <View style={styles.inputRow}>
                            <MapPin size={20} color={colors.text.muted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.textInput, styles.textArea]}
                                placeholder="Business Address"
                                placeholderTextColor={colors.text.muted}
                                value={businessAddress}
                                onChangeText={setBusinessAddress}
                                multiline
                                numberOfLines={3}
                            />
                        </View>

                        <View style={styles.inputRow}>
                            <Phone size={20} color={colors.text.muted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.textInput}
                                placeholder="Phone Number"
                                placeholderTextColor={colors.text.muted}
                                value={businessPhone}
                                onChangeText={setBusinessPhone}
                                keyboardType="phone-pad"
                            />
                        </View>
                    </Card>

                    {/* Tax Details */}
                    <Card style={styles.formCard}>
                        <Text style={styles.sectionTitle}>Tax Details</Text>

                        <View style={styles.inputRow}>
                            <FileText size={20} color={colors.text.muted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.textInput}
                                placeholder="GSTIN (15 characters)"
                                placeholderTextColor={colors.text.muted}
                                value={businessGSTIN}
                                onChangeText={(text) => setBusinessGSTIN(text.toUpperCase())}
                                maxLength={15}
                                autoCapitalize="characters"
                            />
                        </View>

                        <View style={styles.inputRow}>
                            <Text style={styles.inputLabel}>INV-</Text>
                            <TextInput
                                style={[styles.textInput, styles.prefixInput]}
                                placeholder="Invoice Prefix"
                                placeholderTextColor={colors.text.muted}
                                value={invoicePrefix}
                                onChangeText={(text) => setInvoicePrefix(text.toUpperCase())}
                                maxLength={5}
                                autoCapitalize="characters"
                            />
                        </View>
                        <Text style={styles.hintText}>Invoice numbers will be: {invoicePrefix}-0001, {invoicePrefix}-0002, etc.</Text>
                    </Card>

                    <View style={styles.bottomSpacer} />
                </ScrollView>

                {/* Save Button */}
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Save size={20} color={colors.text.inverse} />
                    <Text style={styles.saveButtonText}>Save Profile</Text>
                </TouchableOpacity>
            </Animated.View>
        </SafeAreaView>
    );
};

const createStyles = (colors: typeof tokens.colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.semantic.background },
    content: { flex: 1, paddingHorizontal: tokens.spacing.md },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: tokens.spacing.md,
        paddingBottom: tokens.spacing.lg
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.semantic.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: tokens.spacing.md,
    },
    headerText: { flex: 1 },
    title: {
        fontSize: tokens.typography.sizes.xl,
        color: colors.brand.secondary,
        fontFamily: tokens.typography.fontFamily.bold
    },
    subtitle: {
        fontSize: tokens.typography.sizes.sm,
        color: colors.text.muted,
        fontFamily: tokens.typography.fontFamily.regular
    },
    sectionTitle: {
        fontSize: tokens.typography.sizes.md,
        color: colors.text.primary,
        fontFamily: tokens.typography.fontFamily.semibold,
        marginBottom: tokens.spacing.md,
    },
    logoCard: {
        backgroundColor: colors.semantic.surface,
        marginBottom: tokens.spacing.md
    },
    logoContainer: {
        alignItems: 'center',
        paddingVertical: tokens.spacing.md
    },
    logoImage: {
        width: 100,
        height: 100,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: colors.border.default
    },
    logoHint: {
        fontSize: tokens.typography.sizes.xs,
        color: colors.text.muted,
        marginTop: tokens.spacing.sm,
        textAlign: 'center',
        fontFamily: tokens.typography.fontFamily.regular,
    },
    logoPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 16,
        backgroundColor: colors.semantic.soft,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.border.default,
        borderStyle: 'dashed',
    },
    logoPlaceholderText: {
        fontSize: tokens.typography.sizes.sm,
        color: colors.text.muted,
        marginTop: tokens.spacing.xs,
        fontFamily: tokens.typography.fontFamily.medium,
    },
    formCard: {
        backgroundColor: colors.semantic.surface,
        marginBottom: tokens.spacing.md
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: tokens.spacing.md,
        backgroundColor: colors.semantic.background,
        borderRadius: tokens.radius.md,
        paddingHorizontal: tokens.spacing.md,
    },
    inputIcon: {
        marginRight: tokens.spacing.sm
    },
    inputLabel: {
        fontSize: tokens.typography.sizes.md,
        color: colors.text.muted,
        fontFamily: tokens.typography.fontFamily.medium,
    },
    textInput: {
        flex: 1,
        fontSize: tokens.typography.sizes.md,
        color: colors.text.primary,
        fontFamily: tokens.typography.fontFamily.regular,
        paddingVertical: tokens.spacing.md,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top'
    },
    prefixInput: {
        marginLeft: tokens.spacing.xs,
    },
    hintText: {
        fontSize: tokens.typography.sizes.xs,
        color: colors.text.muted,
        fontFamily: tokens.typography.fontFamily.regular,
        marginTop: -tokens.spacing.sm,
    },
    bottomSpacer: { height: 120 },
    saveButton: {
        position: 'absolute',
        bottom: 100,
        left: tokens.spacing.md,
        right: tokens.spacing.md,
        backgroundColor: colors.brand.primary,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
        borderRadius: tokens.radius.lg,
        gap: tokens.spacing.sm,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    saveButtonText: {
        fontSize: tokens.typography.sizes.md,
        color: colors.text.inverse,
        fontFamily: tokens.typography.fontFamily.semibold
    },
});

export default BusinessProfileScreen;
