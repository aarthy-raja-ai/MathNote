import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Credit } from './storage';

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export const notificationService = {
    // Request permissions
    async requestPermissions(): Promise<boolean> {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Notification permissions not granted');
            return false;
        }

        try {
            // Android needs a notification channel
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('credit-reminders', {
                    name: 'Credit Reminders',
                    importance: Notifications.AndroidImportance.HIGH,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                });
            }
        } catch (error) {
            console.warn('Failed to set notification channel:', error);
            // Non-critical failure, continue
        }

        return true;
    },

    // Schedule a reminder for a pending credit
    async scheduleCreditReminder(credit: Credit): Promise<string | null> {
        if (credit.status === 'paid') return null;

        const hasPermission = await this.requestPermissions();
        if (!hasPermission) return null;

        // Schedule for next day at 9 AM
        const triggerDate = new Date();
        triggerDate.setDate(triggerDate.getDate() + 1);
        triggerDate.setHours(9, 0, 0, 0);

        try {
            const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                    title: '💰 Credit Reminder',
                    body: `${credit.party} owes you ₹${credit.amount.toLocaleString()}`,
                    data: { creditId: credit.id },
                    sound: true,
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: triggerDate,
                },
            });

            return notificationId;
        } catch (error) {
            console.warn('Failed to schedule credit reminder:', error);
            return null;
        }
    },

    // Cancel all scheduled notifications for a credit
    async cancelCreditReminder(notificationId: string): Promise<void> {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
    },

    // Cancel all notifications
    async cancelAllReminders(): Promise<void> {
        await Notifications.cancelAllScheduledNotificationsAsync();
    },

    // Schedule daily summary reminder
    async scheduleDailySummary(enabled: boolean): Promise<void> {
        // Cancel existing daily summary
        await Notifications.cancelAllScheduledNotificationsAsync();

        if (!enabled) return;

        const hasPermission = await this.requestPermissions();
        if (!hasPermission) return;

        // Schedule for 8 PM daily
        await Notifications.scheduleNotificationAsync({
            content: {
                title: '📊 Daily Summary',
                body: 'Check your daily sales and expenses!',
                sound: true,
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: 20,
                minute: 0,
            },
        });
    },
};

export default notificationService;
