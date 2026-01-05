import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
    SALES: '@mathnote_sales',
    EXPENSES: '@mathnote_expenses',
    CREDITS: '@mathnote_credits',
    SETTINGS: '@mathnote_settings',
};

export const storage = {
    // Generic get/set
    async get<T>(key: string): Promise<T | null> {
        try {
            const value = await AsyncStorage.getItem(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error('Storage get error:', error);
            return null;
        }
    },

    async set<T>(key: string, value: T): Promise<boolean> {
        try {
            await AsyncStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Storage set error:', error);
            return false;
        }
    },

    // Sales
    async getSales() {
        return this.get<Sale[]>(STORAGE_KEYS.SALES) || [];
    },

    async setSales(sales: Sale[]) {
        return this.set(STORAGE_KEYS.SALES, sales);
    },

    // Expenses
    async getExpenses() {
        return this.get<Expense[]>(STORAGE_KEYS.EXPENSES) || [];
    },

    async setExpenses(expenses: Expense[]) {
        return this.set(STORAGE_KEYS.EXPENSES, expenses);
    },

    // Credits
    async getCredits() {
        return this.get<Credit[]>(STORAGE_KEYS.CREDITS) || [];
    },

    async setCredits(credits: Credit[]) {
        return this.set(STORAGE_KEYS.CREDITS, credits);
    },

    // Settings
    async getSettings() {
        return this.get<Settings>(STORAGE_KEYS.SETTINGS);
    },

    async setSettings(settings: Settings) {
        return this.set(STORAGE_KEYS.SETTINGS, settings);
    },

    // Backup
    async exportAllData() {
        const [sales, expenses, credits, settings] = await Promise.all([
            this.getSales(),
            this.getExpenses(),
            this.getCredits(),
            this.getSettings(),
        ]);
        return { sales, expenses, credits, settings, exportedAt: new Date().toISOString() };
    },

    // Clear all data
    async clearAllData() {
        try {
            await AsyncStorage.clear();
            return true;
        } catch (error) {
            console.error('Failed to clear all data:', error);
            return false;
        }
    },
};

// Types
export interface Sale {
    id: string;
    date: string;
    customerName: string;           // Customer name for the sale
    totalAmount: number;            // Total sale amount
    paidAmount: number;             // Amount paid at time of sale
    paymentMethod: 'Cash' | 'UPI';
    note: string;
    linkedCreditId?: string;        // Reference to auto-created credit (if partial payment)
}

export interface Expense {
    id: string;
    date: string;
    category: string;
    amount: number;
    note: string;
}

export interface Credit {
    id: string;
    party: string;
    type: 'given' | 'taken';
    amount: number;
    status: 'paid' | 'pending';
    date: string;
    linkedSaleId?: string;          // Reference to originating sale (if auto-created from partial payment)
}

export interface Settings {
    theme: 'light' | 'dark';
    currency: string;
    lock: boolean;
}

export default storage;
