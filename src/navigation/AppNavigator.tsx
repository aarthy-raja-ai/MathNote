import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, Platform, Text, TouchableOpacity } from 'react-native';
import {
    LayoutDashboard,
    TrendingUp,
    Wallet,
    CreditCard,
    Package,
} from 'lucide-react-native';
import {
    DashboardScreen,
    SalesScreen,
    ExpensesScreen,
    CreditsScreen,
    ReportsScreen,
    SettingsScreen,
    ContactsScreen,
    InventoryScreen,
    ReturnsScreen,
    BusinessProfileScreen,
    InvoicePreviewScreen,
} from '../screens';
import { tokens, useTheme } from '../theme';

const Tab = createBottomTabNavigator();

const tabConfig = [
    { name: 'Dashboard', icon: LayoutDashboard, label: 'Home' },
    { name: 'Sales', icon: TrendingUp, label: 'Sales' },
    { name: 'Expenses', icon: Wallet, label: 'Spend' },
    { name: 'Inventory', icon: Package, label: 'Stock' },
    { name: 'Credits', icon: CreditCard, label: 'Credits' },
];

const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
    const { colors, isDark } = useTheme();

    // Only render the 5 visible tabs from tabConfig
    const visibleRoutes = state.routes.filter(route =>
        tabConfig.some(config => config.name === route.name)
    );

    return (
        <View style={[
            styles.tabBarContainer,
            {
                backgroundColor: isDark ? colors.brand.secondary : colors.semantic.surface,
                borderColor: colors.border.default,
            }
        ]}>
            {visibleRoutes.map((route) => {
                const config = tabConfig.find(t => t.name === route.name);
                if (!config) return null;

                const routeIndex = state.routes.findIndex(r => r.key === route.key);
                const isFocused = state.index === routeIndex;
                const IconComponent = config.icon;

                const onPress = () => {
                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    });

                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name);
                    }
                };

                return (
                    <TouchableOpacity
                        key={route.key}
                        activeOpacity={0.7}
                        onPress={onPress}
                        style={styles.tabItem}
                    >
                        {isFocused ? (
                            <View style={[
                                styles.activeContainer,
                                { backgroundColor: colors.brand.primary }
                            ]}>
                                <IconComponent
                                    size={24}
                                    color="#FFFFFF"
                                    strokeWidth={2.5}
                                />
                                <Text style={[
                                    styles.activeLabel,
                                    { fontFamily: tokens.typography.fontFamily.semibold }
                                ]}>
                                    {config.label}
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.inactiveContainer}>
                                <IconComponent
                                    size={26}
                                    color={colors.icon.inactive}
                                    strokeWidth={2}
                                />
                                <Text style={[
                                    styles.inactiveLabel,
                                    {
                                        color: colors.icon.inactive,
                                        fontFamily: tokens.typography.fontFamily.medium
                                    }
                                ]}>
                                    {config.label}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    tabBarContainer: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 28 : 16,
        left: 16,
        right: 16,
        height: 64,
        borderRadius: 32,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        paddingHorizontal: 8,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.15,
                shadowRadius: 20,
            },
            android: {
                elevation: 16,
            },
        }),
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
    activeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 24,
        gap: 6,
    },
    inactiveContainer: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
    },
    activeLabel: {
        fontSize: 11,
        color: '#FFFFFF',
    },
    inactiveLabel: {
        fontSize: 10,
    },
});

export const AppNavigator: React.FC = () => {
    return (
        <NavigationContainer>
            <Tab.Navigator
                initialRouteName="Dashboard"
                tabBar={(props) => <CustomTabBar {...props} />}
                screenOptions={{
                    headerShown: false,
                }}
            >
                <Tab.Screen name="Dashboard" component={DashboardScreen} />
                <Tab.Screen name="Sales" component={SalesScreen} />
                <Tab.Screen name="Expenses" component={ExpensesScreen} />
                <Tab.Screen name="Inventory" component={InventoryScreen} />
                <Tab.Screen name="Credits" component={CreditsScreen} />
                <Tab.Screen
                    name="Reports"
                    component={ReportsScreen}
                    options={{ tabBarButton: () => null }}
                />
                <Tab.Screen
                    name="Returns"
                    component={ReturnsScreen}
                    options={{ tabBarButton: () => null }}
                />
                <Tab.Screen
                    name="Settings"
                    component={SettingsScreen}
                    options={{ tabBarButton: () => null }}
                />
                <Tab.Screen
                    name="Contacts"
                    component={ContactsScreen}
                    options={{ tabBarButton: () => null }}
                />
                <Tab.Screen
                    name="BusinessProfile"
                    component={BusinessProfileScreen}
                    options={{ tabBarButton: () => null }}
                />
                <Tab.Screen
                    name="InvoicePreview"
                    component={InvoicePreviewScreen}
                    options={{ tabBarButton: () => null }}
                />
            </Tab.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;
