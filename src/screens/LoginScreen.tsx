import React, { useState } from 'react';
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
} from 'react-native';
import { Eye, EyeOff, User as UserIcon, Lock } from 'lucide-react-native';
import { tokens, useTheme } from '../theme';
import { useAuth } from '../context';

export const LoginScreen: React.FC = () => {
    const { colors } = useTheme();
    const { loginWithPassword } = useAuth();
    
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const styles = React.useMemo(() => createStyles(colors), [colors]);

    const handleLogin = async () => {
        if (!username.trim() || !password.trim()) {
            setError('Please enter both username and password.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const success = await loginWithPassword(username.trim(), password.trim());
            if (!success) {
                setError('Invalid username or password.');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
            console.error('Login error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.keyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
                <View style={styles.card}>
                    <View style={styles.header}>
                        <View style={styles.logoIcon}>
                            <Lock size={36} color={colors.brand.primary} strokeWidth={2} />
                        </View>
                        <Text style={styles.title}>MathNote</Text>
                        <Text style={styles.subtitle}>Business Finance Manager</Text>
                    </View>

                    {error && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    <View style={styles.form}>
                        {/* Username Input */}
                        <Text style={styles.label}>Username</Text>
                        <View style={styles.inputContainer}>
                            <UserIcon size={20} color={colors.text.muted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter username"
                                placeholderTextColor={colors.text.muted}
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>

                        {/* Password Input */}
                        <Text style={styles.label}>Password</Text>
                        <View style={styles.inputContainer}>
                            <Lock size={20} color={colors.text.muted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter password"
                                placeholderTextColor={colors.text.muted}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                autoCorrect={false}
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

                        {/* Login Button */}
                        <TouchableOpacity
                            style={[styles.button, isLoading && styles.buttonDisabled]}
                            onPress={handleLogin}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <Text style={styles.buttonText}>Log In</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const createStyles = (colors: typeof tokens.colors) => StyleSheet.create({
    keyboardView: {
        flex: 1,
        backgroundColor: colors.semantic.background,
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
        marginBottom: tokens.spacing.xl,
    },
    logoIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.semantic.soft,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: tokens.spacing.md,
    },
    title: {
        fontSize: tokens.typography.sizes.xl,
        color: colors.brand.secondary,
        fontFamily: tokens.typography.fontFamily.bold,
    },
    subtitle: {
        fontSize: tokens.typography.sizes.sm,
        color: colors.text.secondary,
        marginTop: tokens.spacing.xxs,
        fontFamily: tokens.typography.fontFamily.regular,
    },
    form: {
        width: '100%',
    },
    label: {
        fontSize: tokens.typography.sizes.sm,
        color: colors.text.primary,
        fontFamily: tokens.typography.fontFamily.semibold,
        marginBottom: tokens.spacing.xs,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.semantic.soft,
        borderRadius: tokens.radius.md,
        paddingHorizontal: tokens.spacing.md,
        marginBottom: tokens.spacing.lg,
        borderWidth: 1,
        borderColor: colors.border.default,
    },
    inputIcon: {
        marginRight: tokens.spacing.sm,
    },
    input: {
        flex: 1,
        height: 48,
        color: colors.text.primary,
        fontFamily: tokens.typography.fontFamily.regular,
        fontSize: tokens.typography.sizes.sm,
    },
    eyeIcon: {
        padding: tokens.spacing.xs,
    },
    button: {
        backgroundColor: colors.brand.primary,
        borderRadius: tokens.radius.md,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: tokens.spacing.sm,
        shadowColor: colors.brand.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#FFF',
        fontSize: tokens.typography.sizes.md,
        fontFamily: tokens.typography.fontFamily.semibold,
    },
    errorContainer: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: 'rgba(239, 68, 68, 0.2)',
        borderWidth: 1,
        borderRadius: tokens.radius.md,
        padding: tokens.spacing.md,
        marginBottom: tokens.spacing.lg,
    },
    errorText: {
        color: colors.semantic.error,
        fontSize: tokens.typography.sizes.sm,
        fontFamily: tokens.typography.fontFamily.medium,
        textAlign: 'center',
    },
});

export default LoginScreen;
