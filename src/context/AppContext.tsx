import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import storage, { Sale, Expense, Credit, Settings } from '../utils/storage';

interface AppState {
    sales: Sale[];
    expenses: Expense[];
    credits: Credit[];
    settings: Settings;
    isLoading: boolean;
}

interface AppContextType extends AppState {
    // Sales
    addSale: (sale: Omit<Sale, 'id'>) => Promise<void>;
    updateSale: (id: string, sale: Partial<Sale>) => Promise<void>;
    deleteSale: (id: string) => Promise<void>;
    // Expenses
    addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
    updateExpense: (id: string, expense: Partial<Expense>) => Promise<void>;
    deleteExpense: (id: string) => Promise<void>;
    // Credits
    addCredit: (credit: Omit<Credit, 'id'>) => Promise<void>;
    updateCredit: (id: string, credit: Partial<Credit>) => Promise<void>;
    deleteCredit: (id: string) => Promise<void>;
    // Settings
    updateSettings: (settings: Partial<Settings>) => Promise<void>;
    // Computed
    getTodaySales: () => number;
    getTodayExpenses: () => number;
    getBalance: () => number;
}

const defaultSettings: Settings = {
    theme: 'light',
    currency: '₹',
    lock: false,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);
const getToday = () => new Date().toISOString().split('T')[0];

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<AppState>({
        sales: [],
        expenses: [],
        credits: [],
        settings: defaultSettings,
        isLoading: true,
    });

    // Load data on mount
    useEffect(() => {
        const loadData = async () => {
            const [sales, expenses, credits, settings] = await Promise.all([
                storage.getSales(),
                storage.getExpenses(),
                storage.getCredits(),
                storage.getSettings(),
            ]);
            // Ensure settings.lock is always a boolean to prevent type casting errors
            const safeSettings = settings ? {
                ...settings,
                lock: Boolean(settings.lock),
            } : defaultSettings;

            setState({
                sales: sales || [],
                expenses: expenses || [],
                credits: credits || [],
                settings: safeSettings,
                isLoading: false,
            });
        };
        loadData();
    }, []);

    // Sales
    const addSale = useCallback(async (sale: Omit<Sale, 'id'>) => {
        const newSale: Sale = { ...sale, id: generateId() };
        const newSales = [...state.sales, newSale];
        await storage.setSales(newSales);
        setState((prev) => ({ ...prev, sales: newSales }));
    }, [state.sales]);

    const updateSale = useCallback(async (id: string, updates: Partial<Sale>) => {
        const newSales = state.sales.map((s) => (s.id === id ? { ...s, ...updates } : s));
        await storage.setSales(newSales);
        setState((prev) => ({ ...prev, sales: newSales }));
    }, [state.sales]);

    const deleteSale = useCallback(async (id: string) => {
        const newSales = state.sales.filter((s) => s.id !== id);
        await storage.setSales(newSales);
        setState((prev) => ({ ...prev, sales: newSales }));
    }, [state.sales]);

    // Expenses
    const addExpense = useCallback(async (expense: Omit<Expense, 'id'>) => {
        const newExpense: Expense = { ...expense, id: generateId() };
        const newExpenses = [...state.expenses, newExpense];
        await storage.setExpenses(newExpenses);
        setState((prev) => ({ ...prev, expenses: newExpenses }));
    }, [state.expenses]);

    const updateExpense = useCallback(async (id: string, updates: Partial<Expense>) => {
        const newExpenses = state.expenses.map((e) => (e.id === id ? { ...e, ...updates } : e));
        await storage.setExpenses(newExpenses);
        setState((prev) => ({ ...prev, expenses: newExpenses }));
    }, [state.expenses]);

    const deleteExpense = useCallback(async (id: string) => {
        const newExpenses = state.expenses.filter((e) => e.id !== id);
        await storage.setExpenses(newExpenses);
        setState((prev) => ({ ...prev, expenses: newExpenses }));
    }, [state.expenses]);

    // Credits
    const addCredit = useCallback(async (credit: Omit<Credit, 'id'>) => {
        const newCredit: Credit = { ...credit, id: generateId() };
        const newCredits = [...state.credits, newCredit];
        await storage.setCredits(newCredits);
        setState((prev) => ({ ...prev, credits: newCredits }));
    }, [state.credits]);

    const updateCredit = useCallback(async (id: string, updates: Partial<Credit>) => {
        const newCredits = state.credits.map((c) => (c.id === id ? { ...c, ...updates } : c));
        await storage.setCredits(newCredits);
        setState((prev) => ({ ...prev, credits: newCredits }));
    }, [state.credits]);

    const deleteCredit = useCallback(async (id: string) => {
        const newCredits = state.credits.filter((c) => c.id !== id);
        await storage.setCredits(newCredits);
        setState((prev) => ({ ...prev, credits: newCredits }));
    }, [state.credits]);

    // Settings
    const updateSettings = useCallback(async (updates: Partial<Settings>) => {
        const newSettings = { ...state.settings, ...updates };
        await storage.setSettings(newSettings);
        setState((prev) => ({ ...prev, settings: newSettings }));
    }, [state.settings]);

    // Computed values
    const getTodaySales = useCallback(() => {
        const today = getToday();
        return state.sales
            .filter((s) => s.date === today)
            .reduce((sum, s) => sum + s.amount, 0);
    }, [state.sales]);

    const getTodayExpenses = useCallback(() => {
        const today = getToday();
        return state.expenses
            .filter((e) => e.date === today)
            .reduce((sum, e) => sum + e.amount, 0);
    }, [state.expenses]);

    const getBalance = useCallback(() => {
        const totalSales = state.sales.reduce((sum, s) => sum + s.amount, 0);
        const totalExpenses = state.expenses.reduce((sum, e) => sum + e.amount, 0);
        return totalSales - totalExpenses;
    }, [state.sales, state.expenses]);

    return (
        <AppContext.Provider
            value={{
                ...state,
                addSale,
                updateSale,
                deleteSale,
                addExpense,
                updateExpense,
                deleteExpense,
                addCredit,
                updateCredit,
                deleteCredit,
                updateSettings,
                getTodaySales,
                getTodayExpenses,
                getBalance,
            }}
        >
            {children}
        </AppContext.Provider>
    );
};

export const useApp = (): AppContextType => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};
