import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ViewStyle, Animated } from 'react-native';
import { tokens } from '../theme';

interface CardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    animated?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, style, animated = true }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(tokens.motion.slide.yEnter)).current;

    useEffect(() => {
        if (animated) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: tokens.motion.duration.normal,
                    useNativeDriver: true,
                }),
                Animated.spring(slideAnim, {
                    toValue: 0,
                    tension: tokens.motion.spring.tension,
                    friction: tokens.motion.spring.friction,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            fadeAnim.setValue(1);
            slideAnim.setValue(0);
        }
    }, [animated, fadeAnim, slideAnim]);

    return (
        <Animated.View
            style={[
                styles.card,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                },
                style,
            ]}
        >
            {children}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: tokens.colors.semantic.surface,
        borderRadius: tokens.radius.lg,
        padding: tokens.spacing.md,
        ...tokens.shadow.card,
    },
});

export default Card;
