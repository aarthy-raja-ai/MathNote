import React, { useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, Platform } from 'react-native';
import {
    LayoutDashboard,
    TrendingUp,
    Wallet,
    CreditCard,
    BarChart3,
    Settings2,
} from 'lucide-react-native';
import {
    DashboardScreen,
    SalesScreen,
    ExpensesScreen,
    CreditsScreen,
    ReportsScreen,
    SettingsScreen,
} from '../screens';
import { tokens, useTheme } from '../theme';

const Tab = createBottomTabNavigator();

interface TabIconProps {
    focused: boolean;
    IconComponent: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
    colors: typeof tokens.colors;
}

const TabIcon: React.FC<TabIconProps> = ({ focused, IconComponent, colors }) => (
    <View style={[
        iconStyles.iconWrapper,
        focused && { backgroundColor: colors.icon.activeBackground }
    ]}>
        <IconComponent
            size={24}
            color={focused ? colors.icon.active : colors.icon.inactive}
            strokeWidth={focused ? 2.5 : 2}
        />
    </View>
);

const iconStyles = StyleSheet.create({
    iconWrapper: {
        width: 44,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 14,
        paddingHorizontal: 6,
    },
});

const tabScreens = [
    { name: 'Dashboard', component: DashboardScreen, icon: LayoutDashboard, label: 'Home' },
    { name: 'Sales', component: SalesScreen, icon: TrendingUp, label: 'Sales' },
    { name: 'Expenses', component: ExpensesScreen, icon: Wallet, label: 'Expenses' },
    { name: 'Credits', component: CreditsScreen, icon: CreditCard, label: 'Credits' },
    { name: 'Reports', component: ReportsScreen, icon: BarChart3, label: 'Reports' },
    { name: 'Settings', component: SettingsScreen, icon: Settings2, label: 'Settings' },
];

export const AppNavigator: React.FC = () => {
    const { colors, isDark } = useTheme();

    const tabBarStyle = useMemo(() => ({
        backgroundColor: colors.semantic.surface,
        borderTopWidth: 0,
        height: 68,
        paddingBottom: 8,
        paddingTop: 8,
        borderTopLeftRadius: tokens.radius.xxl,
        borderTopRightRadius: tokens.radius.xxl,
        position: 'absolute' as const,
        left: 0,
        right: 0,
        bottom: 0,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: isDark ? 0.3 : 0.08,
                shadowRadius: 16,
            },
            android: {
                elevation: 10,
            },
        }),
    }), [colors, isDark]);

    const tabLabelStyle = useMemo(() => ({
        fontSize: 11,
        fontFamily: tokens.typography.fontFamily.semibold,
        marginTop: 2,
    }), []);

    return (
        <NavigationContainer>
            <Tab.Navigator
                initialRouteName="Dashboard"
                screenOptions={{
                    headerShown: false,
                    tabBarStyle: tabBarStyle,
                    tabBarActiveTintColor: colors.icon.active,
                    tabBarInactiveTintColor: colors.icon.inactive,
                    tabBarLabelStyle: tabLabelStyle,
                    tabBarItemStyle: { minHeight: 44, paddingVertical: 4 },
                }}
            >
                {tabScreens.map((screen) => (
                    <Tab.Screen
                        key={screen.name}
                        name={screen.name}
                        component={screen.component}
                        options={{
                            tabBarLabel: screen.label,
                            tabBarIcon: ({ focused }) => (
                                <TabIcon focused={focused} IconComponent={screen.icon} colors={colors} />
                            ),
                        }}
                    />
                ))}
            </Tab.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;
