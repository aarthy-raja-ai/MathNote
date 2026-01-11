import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { tokens } from '../theme';

export type DateFilterType = 'today' | 'week' | 'month' | 'all';

interface DateFilterProps {
    selected: DateFilterType;
    onFilterChange: (filter: DateFilterType) => void;
    onCalendarPress?: () => void;
    selectedDate?: string | null; // YYYY-MM-DD format
    colors: typeof tokens.colors;
}

const FILTERS: { id: DateFilterType; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'all', label: 'All' },
];

export const DateFilter: React.FC<DateFilterProps> = ({
    selected,
    onFilterChange,
    onCalendarPress,
    selectedDate,
    colors,
}) => {
    const styles = createStyles(colors);

    return (
        <View style={styles.container}>
            <View style={styles.tabsContainer}>
                {FILTERS.map((filter) => (
                    <TouchableOpacity
                        key={filter.id}
                        style={[styles.tab, selected === filter.id && styles.tabActive]}
                        onPress={() => onFilterChange(filter.id)}
                    >
                        <Text style={[styles.tabText, selected === filter.id && styles.tabTextActive]}>
                            {filter.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            {onCalendarPress && (
                <Pressable
                    style={[styles.calendarBtn, selectedDate && styles.calendarBtnActive]}
                    onPress={onCalendarPress}
                >
                    <Calendar
                        size={18}
                        color={selectedDate ? colors.text.inverse : colors.text.secondary}
                    />
                </Pressable>
            )}
        </View>
    );
};

// Helper function to filter data by date range
export const filterByDateRange = <T extends { date: string }>(
    data: T[],
    filter: DateFilterType,
    specificDate?: string | null
): T[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // If specific date is selected, filter by that date
    if (specificDate) {
        return data.filter((item) => item.date === specificDate);
    }

    switch (filter) {
        case 'today': {
            // Use local date parts to avoid timezone issues with toISOString()
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;
            return data.filter((item) => item.date === todayStr);
        }
        case 'week': {
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 7);
            return data.filter((item) => {
                const itemDate = new Date(item.date);
                return itemDate >= weekAgo && itemDate <= today;
            });
        }
        case 'month': {
            const monthAgo = new Date(today);
            monthAgo.setMonth(today.getMonth() - 1);
            return data.filter((item) => {
                const itemDate = new Date(item.date);
                return itemDate >= monthAgo && itemDate <= today;
            });
        }
        case 'all':
        default:
            return data;
    }
};

// Get display label for current filter
export const getFilterLabel = (
    filter: DateFilterType,
    specificDate?: string | null
): string => {
    if (specificDate) {
        return new Date(specificDate).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    }

    switch (filter) {
        case 'today':
            return "Today's";
        case 'week':
            return "This Week's";
        case 'month':
            return "This Month's";
        case 'all':
            return 'Total';
        default:
            return '';
    }
};

const createStyles = (colors: typeof tokens.colors) =>
    StyleSheet.create({
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: tokens.spacing.md,
            gap: tokens.spacing.sm,
        },
        tabsContainer: {
            flex: 1,
            flexDirection: 'row',
            backgroundColor: colors.semantic.soft,
            borderRadius: tokens.radius.pill,
            padding: 3,
            overflow: 'hidden',
        },
        tab: {
            flex: 1,
            paddingVertical: tokens.spacing.xs,
            alignItems: 'center',
            borderRadius: tokens.radius.pill,
        },
        tabActive: {
            backgroundColor: colors.brand.primary,
        },
        tabText: {
            fontSize: tokens.typography.sizes.xs,
            color: colors.text.secondary,
            fontFamily: tokens.typography.fontFamily.medium,
        },
        tabTextActive: {
            color: colors.text.inverse,
        },
        calendarBtn: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.semantic.soft,
            justifyContent: 'center',
            alignItems: 'center',
        },
        calendarBtnActive: {
            backgroundColor: colors.brand.primary,
        },
    });

export default DateFilter;
