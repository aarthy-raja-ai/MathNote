import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Vibration,
    Alert,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Lock, Fingerprint, Delete, User as UserIcon, ArrowLeft } from 'lucide-react-native';
import { tokens, useTheme } from '../theme';
import { useApp } from '../context';
import { User } from '../utils/storage';

interface LockScreenProps {
    onUnlock: () => void;
    storedPin?: string;
    title?: string;
    subtitle?: string;
    onValidate?: (pin: string, userId?: string) => boolean | Promise<boolean>;
    users?: User[];
}

export const LockScreen: React.FC<LockScreenProps> = ({
    onUnlock,
    storedPin,
    title = 'MathNote',
    subtitle = 'Enter PIN to unlock',
    onValidate,
    users
}) => {
    const { colors } = useTheme();
    const { settings } = useApp();
    const [pin, setPin] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [hasBiometrics, setHasBiometrics] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const maxAttempts = 5;

    const styles = React.useMemo(() => createStyles(colors), [colors]);

    const shouldShowProfileSelect = users && users.length > 1 && !selectedUser;

    useEffect(() => {
        if (settings.biometricEnabled) {
            checkBiometrics();
        }
    }, [settings.biometricEnabled]);

    const checkBiometrics = async () => {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setHasBiometrics(compatible && enrolled);

        // Auto-prompt biometrics on load if setting is ON
        if (compatible && enrolled && settings.biometricEnabled) {
            await authenticateWithBiometrics();
        }
    };

    const authenticateWithBiometrics = async () => {
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Unlock MathNote',
                fallbackLabel: 'Use PIN',
                cancelLabel: 'Cancel',
                disableDeviceFallback: true,
            });

            if (result.success) {
                onUnlock();
            }
        } catch (error) {
            console.log('Biometric auth error:', error);
        }
    };

    const handleKeyPress = useCallback(async (digit: string) => {
        if (pin.length >= 4) return;

        const newPin = pin + digit;
        setPin(newPin);

        if (newPin.length === 4) {
            let isValid = false;
            if (onValidate) {
                isValid = await onValidate(newPin, selectedUser?.id);
            } else if (storedPin) {
                isValid = newPin === storedPin;
            } else {
                // Fallback for global app lock if no storedPin/onValidate provided
                isValid = newPin === '1234';
            }

            if (isValid) {
                Vibration.vibrate(50);
                onUnlock();
            } else {
                Vibration.vibrate([0, 50, 50, 50]);
                setAttempts(prev => prev + 1);

                if (attempts + 1 >= maxAttempts) {
                    Alert.alert('Too Many Attempts', 'Please try again later.');
                }

                setTimeout(() => setPin(''), 300);
            }
        }
    }, [pin, storedPin, onValidate, attempts, onUnlock, selectedUser]);

    const handleDelete = useCallback(() => {
        setPin(prev => prev.slice(0, -1));
    }, []);

    const renderPinDots = () => (
        <View style={styles.dotsContainer}>
            {[0, 1, 2, 3].map(i => (
                <View
                    key={i}
                    style={[
                        styles.dot,
                        pin.length > i && styles.dotFilled,
                    ]}
                />
            ))}
        </View>
    );

    const renderKeypad = () => {
        const keys = [
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            [hasBiometrics ? 'bio' : '', '0', 'delete'],
        ];

        return (
            <View style={styles.keypad}>
                {keys.map((row, rowIndex) => (
                    <View key={rowIndex} style={styles.keypadRow}>
                        {row.map((key, keyIndex) => {
                            if (key === '') {
                                return <View key={keyIndex} style={styles.keyEmpty} />;
                            }
                            if (key === 'bio') {
                                return (
                                    <TouchableOpacity
                                        key={keyIndex}
                                        style={styles.keySpecial}
                                        onPress={authenticateWithBiometrics}
                                    >
                                        <Fingerprint size={28} color={colors.brand.primary} strokeWidth={2} />
                                    </TouchableOpacity>
                                );
                            }
                            if (key === 'delete') {
                                return (
                                    <TouchableOpacity
                                        key={keyIndex}
                                        style={styles.keySpecial}
                                        onPress={handleDelete}
                                    >
                                        <Delete size={24} color={colors.text.secondary} strokeWidth={2} />
                                    </TouchableOpacity>
                                );
                            }
                            return (
                                <TouchableOpacity
                                    key={keyIndex}
                                    style={styles.key}
                                    onPress={() => handleKeyPress(key)}
                                >
                                    <Text style={styles.keyText}>{key}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ))}
            </View>
        );
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'owner':
                return colors.brand.primary;
            case 'manager':
                return '#6366F1';
            default:
                return '#64748B';
        }
    };

    if (shouldShowProfileSelect) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <View style={styles.lockIcon}>
                        <UserIcon size={32} color={colors.brand.primary} strokeWidth={2} />
                    </View>
                    <Text style={styles.title}>Select Profile</Text>
                    <Text style={styles.subtitle}>Who is using MathNote?</Text>
                </View>

                <View style={styles.profileGrid}>
                    {users.map(user => {
                        const firstLetter = user.name ? user.name.charAt(0).toUpperCase() : 'U';
                        return (
                            <TouchableOpacity
                                key={user.id}
                                style={styles.profileCard}
                                onPress={() => {
                                    setSelectedUser(user);
                                    setAttempts(0);
                                }}
                            >
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>{firstLetter}</Text>
                                </View>
                                <Text style={styles.profileName} numberOfLines={1}>
                                    {user.name}
                                </Text>
                                <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) }]}>
                                    <Text style={styles.roleText}>{user.role.toUpperCase()}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {users && users.length > 1 && selectedUser && (
                <TouchableOpacity 
                    style={styles.backButton} 
                    onPress={() => {
                        setSelectedUser(null);
                        setPin('');
                    }}
                >
                    <ArrowLeft size={20} color={colors.text.primary} />
                    <Text style={styles.backButtonText}>Profiles</Text>
                </TouchableOpacity>
            )}

            <View style={styles.header}>
                <View style={styles.lockIcon}>
                    <Lock size={32} color={colors.brand.primary} strokeWidth={2} />
                </View>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>
                    {selectedUser ? `Enter PIN for ${selectedUser.name}` : subtitle}
                </Text>
            </View>

            {renderPinDots()}
            {renderKeypad()}

            {attempts > 0 && (
                <Text style={styles.attemptsText}>
                    {maxAttempts - attempts} attempts remaining
                </Text>
            )}
        </View>
    );
};

const createStyles = (colors: typeof tokens.colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.semantic.background,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: tokens.spacing.lg,
    },
    header: {
        alignItems: 'center',
        marginBottom: tokens.spacing.xxl,
    },
    lockIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: colors.semantic.soft,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: tokens.spacing.md,
    },
    title: {
        fontSize: tokens.typography.sizes.xxl,
        color: colors.brand.secondary,
        fontFamily: tokens.typography.fontFamily.bold,
    },
    subtitle: {
        fontSize: tokens.typography.sizes.md,
        color: colors.text.secondary,
        marginTop: tokens.spacing.xs,
        fontFamily: tokens.typography.fontFamily.regular,
        textAlign: 'center',
    },
    dotsContainer: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: tokens.spacing.xxl,
    },
    dot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: colors.border.default,
    },
    dotFilled: {
        backgroundColor: colors.brand.primary,
        borderColor: colors.brand.primary,
    },
    keypad: {
        width: '100%',
        maxWidth: 300,
    },
    keypadRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: tokens.spacing.md,
    },
    key: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: colors.semantic.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    keySpecial: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    keyEmpty: {
        width: 72,
        height: 72,
    },
    keyText: {
        fontSize: 28,
        color: colors.text.primary,
        fontFamily: tokens.typography.fontFamily.semibold,
    },
    attemptsText: {
        fontSize: tokens.typography.sizes.sm,
        color: colors.brand.primary,
        marginTop: tokens.spacing.lg,
        fontFamily: tokens.typography.fontFamily.regular,
    },
    profileGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 20,
        width: '100%',
        maxWidth: 320,
        marginTop: tokens.spacing.md,
    },
    profileCard: {
        width: 130,
        padding: tokens.spacing.md,
        backgroundColor: colors.semantic.surface,
        borderRadius: tokens.radius.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border.default,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.semantic.soft,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: tokens.spacing.sm,
    },
    avatarText: {
        fontSize: 24,
        color: colors.brand.primary,
        fontFamily: tokens.typography.fontFamily.bold,
    },
    profileName: {
        fontSize: tokens.typography.sizes.md,
        color: colors.text.primary,
        fontFamily: tokens.typography.fontFamily.semibold,
        marginBottom: tokens.spacing.xs,
        textAlign: 'center',
        width: '100%',
    },
    roleBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: tokens.radius.sm,
    },
    roleText: {
        fontSize: 9,
        color: '#FFF',
        fontFamily: tokens.typography.fontFamily.bold,
        letterSpacing: 0.5,
    },
    backButton: {
        position: 'absolute',
        top: 60,
        left: tokens.spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 8,
        borderRadius: tokens.radius.md,
        backgroundColor: colors.semantic.soft,
    },
    backButtonText: {
        fontSize: tokens.typography.sizes.sm,
        color: colors.text.primary,
        fontFamily: tokens.typography.fontFamily.semibold,
    },
});

export default LockScreen;
