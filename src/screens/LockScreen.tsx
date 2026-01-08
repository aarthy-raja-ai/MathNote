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
import { Lock, Fingerprint, Delete } from 'lucide-react-native';
import { tokens, useTheme } from '../theme';

interface LockScreenProps {
    onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
    const { colors } = useTheme();
    const [pin, setPin] = useState('');
    const [storedPin] = useState('1234'); // Default PIN - in production, fetch from SecureStore
    const [hasBiometrics, setHasBiometrics] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const maxAttempts = 5;

    const styles = React.useMemo(() => createStyles(colors), [colors]);

    useEffect(() => {
        checkBiometrics();
    }, []);

    const checkBiometrics = async () => {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setHasBiometrics(compatible && enrolled);

        // Auto-prompt biometrics on load
        if (compatible && enrolled) {
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

    const handleKeyPress = useCallback((digit: string) => {
        if (pin.length >= 4) return;

        const newPin = pin + digit;
        setPin(newPin);

        if (newPin.length === 4) {
            if (newPin === storedPin) {
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
    }, [pin, storedPin, attempts, onUnlock]);

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

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.lockIcon}>
                    <Lock size={32} color={colors.brand.primary} strokeWidth={2} />
                </View>
                <Text style={styles.title}>MathNote</Text>
                <Text style={styles.subtitle}>Enter PIN to unlock</Text>
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
});

export default LockScreen;
