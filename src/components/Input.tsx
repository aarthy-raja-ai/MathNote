import React, { useState, useRef } from 'react';
import {
    TextInput as RNTextInput,
    View,
    Text,
    StyleSheet,
    Animated,
    ViewStyle,
    TextInputProps as RNTextInputProps,
} from 'react-native';
import { tokens } from '../theme';

interface InputProps extends RNTextInputProps {
    label?: string;
    error?: string;
    containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    containerStyle,
    style,
    ...props
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const borderAnim = useRef(new Animated.Value(0)).current;

    const handleFocus = () => {
        setIsFocused(true);
        Animated.timing(borderAnim, {
            toValue: 1,
            duration: tokens.motion.duration.fast,
            useNativeDriver: false,
        }).start();
    };

    const handleBlur = () => {
        setIsFocused(false);
        Animated.timing(borderAnim, {
            toValue: 0,
            duration: tokens.motion.duration.fast,
            useNativeDriver: false,
        }).start();
    };

    const borderColor = borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [tokens.colors.border.default, tokens.colors.brand.primary],
    });

    return (
        <View style={[styles.container, containerStyle]}>
            {label && <Text style={styles.label}>{label}</Text>}
            <Animated.View
                style={[
                    styles.inputWrapper,
                    { borderColor },
                    error && styles.errorBorder,
                ]}
            >
                <RNTextInput
                    style={[styles.input, style]}
                    placeholderTextColor={tokens.colors.text.muted}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    {...props}
                />
            </Animated.View>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: tokens.spacing.md,
    },
    label: {
        fontSize: tokens.typography.sizes.sm,
        fontWeight: tokens.typography.weight.medium,
        color: tokens.colors.text.primary,
        marginBottom: tokens.spacing.xs,
    },
    inputWrapper: {
        backgroundColor: tokens.colors.semantic.soft,
        borderRadius: tokens.radius.md,
        borderWidth: 2,
        borderColor: tokens.colors.border.default,
    },
    input: {
        paddingVertical: tokens.spacing.sm,
        paddingHorizontal: tokens.spacing.md,
        fontSize: tokens.typography.sizes.md,
        color: tokens.colors.text.primary,
        minHeight: 48,
    },
    errorBorder: {
        borderColor: tokens.colors.brand.primary,
    },
    errorText: {
        fontSize: tokens.typography.sizes.xs,
        color: tokens.colors.brand.primary,
        marginTop: tokens.spacing.xxs,
    },
});

export default Input;
