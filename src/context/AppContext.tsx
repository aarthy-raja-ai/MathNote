import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import storage, { Sale, Expense, Credit, Settings } from '../utils/storage';

interface AppState {
    sales: Sale[];
    expenses: Expense[];
    credits: Credit[];
    settings: Settings;
    isLoading: boolean;
}

// Input type for adding a sale (without id and linkedCreditId)
interface AddSaleInput {
    date: string;
    customerName: string;
    totalAmount: number;
    paidAmount: number;
    paymentMethod: 'Cash' | 'UPI';
    note: string;
}

interface AppContextType extends AppState {
    // Sales
    addSale: (sale: AddSaleInput) => Promise<void>;
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
    // Data Management
    clearAllData: () => Promise<boolean>;
    restoreData: (data: { sales?: Sale[]; expenses?: Expense[]; credits?: Credit[]; settings?: Settings }) => Promise<boolean>;
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

    // Sales - with partial payment logic
    const addSale = useCallback(async (saleInput: AddSaleInput) => {
        const saleId = generateId();
        let linkedCreditId: string | undefined;
        let newCredits = [...state.credits];

        // Check if this is a partial payment
        const remainingAmount = saleInput.totalAmount - saleInput.paidAmount;
        if (remainingAmount > 0 && saleInput.customerName.trim()) {
            // Auto-create credit for the remaining balance
            const creditId = generateId();
            linkedCreditId = creditId;

            const newCredit: Credit = {
                id: creditId,
                party: saleInput.customerName,
                type: 'given', // Customer owes us money
                amount: remainingAmount,
                status: 'pending',
                date: saleInput.date,
                linkedSaleId: saleId,
            };
            newCredits = [...newCredits, newCredit];
            await storage.setCredits(newCredits);
        }

        const newSale: Sale = {
            id: saleId,
            date: saleInput.date,
            customerName: saleInput.customerName,
            totalAmount: saleInput.totalAmount,
            paidAmount: saleInput.paidAmount,
            paymentMethod: saleInput.paymentMethod,
            note: saleInput.note,
            linkedCreditId,
        };

        const newSales = [...state.sales, newSale];
        await storage.setSales(newSales);
        setState((prev) => ({ ...prev, sales: newSales, credits: newCredits }));
    }, [state.sales, state.credits]);

    const updateSale = useCallback(async (id: string, updates: Partial<Sale>) => {
        const newSales = state.sales.map((s) => (s.id === id ? { ...s, ...updates } : s));
        await storage.setSales(newSales);
        setState((prev) => ({ ...prev, sales: newSales }));
    }, [state.sales]);

    const deleteSale = useCallback(async (id: string) => {
        const sale = state.sales.find((s) => s.id === id);
        let newCredits = [...state.credits];

        // Also delete linked credit if exists
        if (sale?.linkedCreditId) {
            newCredits = newCredits.filter((c) => c.id !== sale.linkedCreditId);
            await storage.setCredits(newCredits);
        }

        const newSales = state.sales.filter((s) => s.id !== id);
        await storage.setSales(newSales);
        setState((prev) => ({ ...prev, sales: newSales, credits: newCredits }));
    }, [state.sales, state.credits]);

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

    // Clear all data
    const clearAllData = useCallback(async () => {
        const success = await storage.clearAllData();
        if (success) {
            setState({
                sales: [],
                expenses: [],
                credits: [],
                settings: defaultSettings,
                isLoading: false,
            });
        }
        return success;
    }, []);

    // Restore data from backup
    const restoreData = useCallback(async (data: { sales?: Sale[]; expenses?: Expense[]; credits?: Credit[]; settings?: Settings }) => {
        const success = await storage.importAllData(data);
        if (success) {
            setState({
                sales: data.sales || [],
                expenses: data.expenses || [],
                credits: data.credits || [],
                settings: data.settings ? { ...data.settings, lock: Boolean(data.settings.lock) } : defaultSettings,
                isLoading: false,
            });
        }
        return success;
    }, []);

    // Computed values - use paidAmount for actual cash received (with legacy fallback)
    const getTodaySales = useCallback(() => {
        const today = getToday();
        return state.sales
            .filter((s) => s.date === today)
            .reduce((sum, s) => sum + (s.paidAmount ?? s.totalAmount ?? 0), 0);
    }, [state.sales]);

    const getTodayExpenses = useCallback(() => {
        const today = getToday();
        return state.expenses
            .filter((e) => e.date === today)
            .reduce((sum, e) => sum + (e.amount ?? 0), 0);
    }, [state.expenses]);

    const getBalance = useCallback(() => {
        const totalSales = state.sales.reduce((sum, s) => sum + (s.paidAmount ?? s.totalAmount ?? 0), 0);
        const totalExpenses = state.expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);
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
                clearAllData,
                restoreData,
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
