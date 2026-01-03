import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ViewStyle,
    TextStyle,
    Animated,
} from 'react-native';
import { tokens } from '../theme';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary';
    disabled?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    disabled = false,
    style,
    textStyle,
}) => {
    const scaleValue = new Animated.Value(1);

    const handlePressIn = () => {
        Animated.spring(scaleValue, {
            toValue: tokens.motion.scale.pressIn,
            useNativeDriver: true,
            tension: tokens.motion.spring.tension,
            friction: tokens.motion.spring.friction,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleValue, {
            toValue: tokens.motion.scale.pressOut,
            useNativeDriver: true,
            tension: tokens.motion.spring.tension,
            friction: tokens.motion.spring.friction,
        }).start();
    };

    const isPrimary = variant === 'primary';

    return (
        <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
            <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled}
                activeOpacity={0.8}
                style={[
                    styles.button,
                    isPrimary ? styles.primary : styles.secondary,
                    disabled && styles.disabled,
                    style,
                ]}
            >
                <Text
                    style={[
                        styles.text,
                        isPrimary ? styles.primaryText : styles.secondaryText,
                        textStyle,
                    ]}
                >
                    {title}
                </Text>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    button: {
        paddingVertical: tokens.spacing.sm,
        paddingHorizontal: tokens.spacing.lg,
        borderRadius: tokens.radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    primary: {
        backgroundColor: tokens.colors.brand.primary,
    },
    secondary: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: tokens.colors.brand.primary,
    },
    disabled: {
        opacity: 0.5,
    },
    text: {
        fontSize: tokens.typography.sizes.md,
        fontWeight: tokens.typography.weight.semibold,
    },
    primaryText: {
        color: tokens.colors.text.inverse,
    },
    secondaryText: {
        color: tokens.colors.brand.primary,
    },
});

export default Button;
