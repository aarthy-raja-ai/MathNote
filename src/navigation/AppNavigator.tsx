import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, Platform } from 'react-native';
import {
    LayoutDashboard,
    TrendingUp,
    Receipt,
    Handshake,
    BarChart3,
    Settings,
} from 'lucide-react-native';
import {
    DashboardScreen,
    SalesScreen,
    ExpensesScreen,
    CreditsScreen,
    ReportsScreen,
    SettingsScreen,
} from '../screens';
import { tokens } from '../theme';

const Tab = createBottomTabNavigator();

interface TabIconProps {
    focused: boolean;
    IconComponent: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
}

const TabIcon: React.FC<TabIconProps> = ({ focused, IconComponent }) => (
    <View style={[styles.iconWrapper, focused && styles.iconWrapperFocused]}>
        <IconComponent
            size={24}
            color={focused ? tokens.colors.icon.active : tokens.colors.icon.inactive}
            strokeWidth={focused ? 2.5 : 2}
        />
    </View>
);

const tabScreens = [
    { name: 'Dashboard', component: DashboardScreen, icon: LayoutDashboard, label: 'Home' },
    { name: 'Sales', component: SalesScreen, icon: TrendingUp, label: 'Sales' },
    { name: 'Expenses', component: ExpensesScreen, icon: Receipt, label: 'Expenses' },
    { name: 'Credits', component: CreditsScreen, icon: Handshake, label: 'Credits' },
    { name: 'Reports', component: ReportsScreen, icon: BarChart3, label: 'Reports' },
    { name: 'Settings', component: SettingsScreen, icon: Settings, label: 'Settings' },
];

export const AppNavigator: React.FC = () => {
    return (
        <NavigationContainer>
            <Tab.Navigator
                initialRouteName="Dashboard"
                screenOptions={{
                    headerShown: false,
                    tabBarStyle: styles.tabBar,
                    tabBarActiveTintColor: tokens.colors.icon.active,
                    tabBarInactiveTintColor: tokens.colors.icon.inactive,
                    tabBarLabelStyle: styles.tabLabel,
                    tabBarItemStyle: styles.tabItem,
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
                                <TabIcon focused={focused} IconComponent={screen.icon} />
                            ),
                        }}
                    />
                ))}
            </Tab.Navigator>
        </NavigationContainer>
    );
};

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: tokens.colors.semantic.surface,
        borderTopWidth: 0,
        height: 68,
        paddingBottom: 8,
        paddingTop: 8,
        borderTopLeftRadius: tokens.radius.xxl,
        borderTopRightRadius: tokens.radius.xxl,
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.08,
                shadowRadius: 16,
            },
            android: {
                elevation: 10,
            },
        }),
    },
    tabItem: {
        minHeight: 44,
        paddingVertical: 4,
    },
    tabLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2,
    },
    iconWrapper: {
        width: 44,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 14,
    },
    iconWrapperFocused: {
        backgroundColor: tokens.colors.icon.activeBackground,
        paddingHorizontal: 6,
    },
});

export default AppNavigator;
