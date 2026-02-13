import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import storage, { Sale, Expense, Credit, Settings, CreditPayment, Contact, Product, SaleItem, SaleReturn } from '../utils/storage';

interface AppState {
    sales: Sale[];
    expenses: Expense[];
    credits: Credit[];
    settings: Settings;
    contacts: Contact[];
    products: Product[];
    returns: SaleReturn[];
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
    items?: SaleItem[];
}

interface AddReturnInput {
    saleId: string;
    date: string;
    amount: number;
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
    // Contacts
    addContact: (contact: Omit<Contact, 'id' | 'createdAt'>) => Promise<void>;
    updateContact: (id: string, contact: Partial<Contact>) => Promise<void>;
    deleteContact: (id: string) => Promise<void>;
    // Products
    addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Promise<void>;
    updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
    deleteProduct: (id: string) => Promise<void>;
    // Returns
    addReturn: (input: AddReturnInput) => Promise<void>;
    deleteReturn: (id: string) => Promise<void>;
    // Settings
    updateSettings: (settings: Partial<Settings>) => Promise<void>;
    // Data Management
    clearAllData: () => Promise<boolean>;
    restoreData: (data: {
        sales?: Sale[];
        expenses?: Expense[];
        credits?: Credit[];
        settings?: Settings;
        contacts?: Contact[];
        products?: Product[];
        returns?: SaleReturn[];
    }) => Promise<boolean>;
    // Computed
    getTodaySales: () => number;
    getTodayCashReceived: () => number;
    getTodayUPIReceived: () => number;
    getTodayExpenses: () => number;
    getBalance: () => number;
    // Credit computed
    getCreditPaymentsReceived: () => number;  // Money received from given credits
    getCreditPaymentsMade: () => number;       // Money paid for taken credits
    // Credit Payments
    addCreditPayment: (creditId: string, payment: Omit<CreditPayment, 'id'>) => Promise<void>;
    // Split Balances
    getCashBalance: () => number;
    getUPIBalance: () => number;
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
        contacts: [],
        products: [],
        returns: [],
        isLoading: true,
    });

    // Load data on mount
    useEffect(() => {
        const loadData = async () => {
            const [sales, expenses, credits, settings, contacts, products, returns] = await Promise.all([
                storage.getSales(),
                storage.getExpenses(),
                storage.getCredits(),
                storage.getSettings(),
                storage.getContacts(),
                storage.getProducts(),
                storage.getReturns(),
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
                contacts: contacts || [],
                products: products || [],
                returns: returns || [],
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
                paidAmount: 0,
                status: 'pending',
                date: saleInput.date,
                linkedSaleId: saleId,
                payments: [],
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
            items: saleInput.items,
        };

        const newSales = [...state.sales, newSale];
        await storage.setSales(newSales);

        // Inventory Logic: Decrement stock for each item sold
        let updatedProducts = [...state.products];
        if (saleInput.items && saleInput.items.length > 0) {
            for (const item of saleInput.items) {
                updatedProducts = updatedProducts.map(p =>
                    p.id === item.productId
                        ? { ...p, stock: Math.max(0, p.stock - item.quantity) }
                        : p
                );
            }
            await storage.setProducts(updatedProducts);
        }

        setState((prev) => ({
            ...prev,
            sales: newSales,
            credits: newCredits,
            products: updatedProducts
        }));
    }, [state.sales, state.credits, state.products]);

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
        const newExpense: Expense = {
            ...expense,
            id: generateId(),
            paymentMethod: expense.paymentMethod || 'Cash' // Default to Cash if not provided
        };
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
    const addCredit = useCallback(async (credit: Omit<Credit, 'id' | 'paidAmount' | 'payments'>) => {
        const newCredit: Credit = {
            ...credit,
            id: generateId(),
            paidAmount: 0,
            payments: [],
        };
        const newCredits = [...state.credits, newCredit];
        await storage.setCredits(newCredits);
        setState((prev) => ({ ...prev, credits: newCredits }));
    }, [state.credits]);

    const updateCredit = useCallback(async (id: string, updates: Partial<Credit>) => {
        const newCredits = state.credits.map((c) => {
            if (c.id === id) {
                const updated = { ...c, ...updates };
                // Auto-update status based on payments
                if (updated.paidAmount >= updated.amount) {
                    updated.status = 'paid';
                } else {
                    updated.status = 'pending';
                }
                return updated;
            }
            return c;
        });
        await storage.setCredits(newCredits);
        setState((prev) => ({ ...prev, credits: newCredits }));
    }, [state.credits]);

    const addCreditPayment = useCallback(async (creditId: string, payment: Omit<CreditPayment, 'id'>) => {
        const newCredits = state.credits.map((c) => {
            if (c.id === creditId) {
                const newPayment: CreditPayment = { ...payment, id: generateId() };
                const payments = [...(c.payments || []), newPayment];
                const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
                const status = paidAmount >= c.amount ? 'paid' : 'pending';
                return { ...c, payments, paidAmount, status };
            }
            return c;
        });
        await storage.setCredits(newCredits);
        setState((prev) => ({ ...prev, credits: newCredits }));
    }, [state.credits]);

    const deleteCredit = useCallback(async (id: string) => {
        const newCredits = state.credits.filter((c) => c.id !== id);
        await storage.setCredits(newCredits);
        setState((prev) => ({ ...prev, credits: newCredits }));
    }, [state.credits]);

    // Contacts
    const addContact = useCallback(async (contactInput: Omit<Contact, 'id' | 'createdAt'>) => {
        const newContact: Contact = {
            ...contactInput,
            id: generateId(),
            createdAt: new Date().toISOString(),
        };
        const newContacts = [...state.contacts, newContact];
        await storage.setContacts(newContacts);
        setState((prev) => ({ ...prev, contacts: newContacts }));
    }, [state.contacts]);

    const updateContact = useCallback(async (id: string, updates: Partial<Contact>) => {
        const newContacts = state.contacts.map((c) => (c.id === id ? { ...c, ...updates } : c));
        await storage.setContacts(newContacts);
        setState((prev) => ({ ...prev, contacts: newContacts }));
    }, [state.contacts]);

    const deleteContact = useCallback(async (id: string) => {
        const contact = state.contacts.find(c => c.id === id);
        if (!contact) return;

        // Check if contact is used in sales or credits
        const hasSales = state.sales.some(s => s.customerName === contact.name);
        const hasCredits = state.credits.some(c => c.party === contact.name);
        const hasExpenses = state.expenses.some(e => e.vendorId === id || e.vendorName === contact.name);

        if (hasSales || hasCredits || hasExpenses) {
            Alert.alert(
                'Cannot Delete Contact',
                'This contact is linked to existing transactions (Sales, Credits, or Expenses). Please delete those transactions first.',
                [{ text: 'OK' }]
            );
            return;
        }

        const newContacts = state.contacts.filter((c) => c.id !== id);
        await storage.setContacts(newContacts);
        setState((prev) => ({ ...prev, contacts: newContacts }));
    }, [state.contacts, state.sales, state.credits, state.expenses]);

    // Products
    const addProduct = useCallback(async (productInput: Omit<Product, 'id' | 'createdAt'>) => {
        const newProduct: Product = {
            ...productInput,
            id: generateId(),
            createdAt: new Date().toISOString(),
        };
        const newProducts = [...state.products, newProduct];
        await storage.setProducts(newProducts);
        setState((prev) => ({ ...prev, products: newProducts }));
    }, [state.products]);

    const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
        const newProducts = state.products.map((p) => (p.id === id ? { ...p, ...updates } : p));
        await storage.setProducts(newProducts);
        setState((prev) => ({ ...prev, products: newProducts }));
    }, [state.products]);

    const deleteProduct = useCallback(async (id: string) => {
        const product = state.products.find(p => p.id === id);
        if (!product) return;

        // Check if product is used in sales
        const hasSales = state.sales.some(s => s.items?.some(item => item.productId === id));

        if (hasSales) {
            Alert.alert(
                'Cannot Delete Product',
                'This product is linked to existing sales. Please delete those sales first or mark the product as inactive (if supported).',
                [{ text: 'OK' }]
            );
            return;
        }

        const newProducts = state.products.filter((p) => p.id !== id);
        await storage.setProducts(newProducts);
        setState((prev) => ({ ...prev, products: newProducts }));
    }, [state.products, state.sales]);

    // Returns
    const addReturn = useCallback(async (input: AddReturnInput) => {
        const sale = state.sales.find(s => s.id === input.saleId);
        if (!sale) return;

        const returnId = generateId();
        const newReturn: SaleReturn = {
            id: returnId,
            saleId: input.saleId,
            date: input.date,
            party: sale.customerName || 'Walk-in',
            amount: input.amount,
            note: input.note,
            items: sale.items,
        };

        const newReturns = [...state.returns, newReturn];
        await storage.setReturns(newReturns);

        // Inventory Logic: Increment stock for each item returned
        let updatedProducts = [...state.products];
        if (sale.items && sale.items.length > 0) {
            for (const item of sale.items) {
                updatedProducts = updatedProducts.map(p =>
                    p.id === item.productId
                        ? { ...p, stock: p.stock + item.quantity }
                        : p
                );
            }
            await storage.setProducts(updatedProducts);
        }

        // Handle linked credit if it exists - Cancel the remaining credit
        let updatedCredits = [...state.credits];
        if (sale.linkedCreditId) {
            updatedCredits = updatedCredits.map(c => {
                if (c.id === sale.linkedCreditId) {
                    // When a sale is returned, any pending credit for it should be cancelled
                    return { ...c, amount: c.paidAmount, status: 'paid' as const };
                }
                return c;
            });
            await storage.setCredits(updatedCredits);
        }

        setState((prev) => ({
            ...prev,
            returns: newReturns,
            products: updatedProducts,
            credits: updatedCredits
        }));

        Alert.alert('Success', 'Sales return processed and stock updated.');
    }, [state.sales, state.returns, state.products, state.credits]);

    const deleteReturn = useCallback(async (id: string) => {
        const ret = state.returns.find(r => r.id === id);
        if (!ret) return;

        const newReturns = state.returns.filter(r => r.id !== id);
        await storage.setReturns(newReturns);

        // Rollback inventory if possible
        let updatedProducts = [...state.products];
        if (ret.items && ret.items.length > 0) {
            for (const item of ret.items) {
                updatedProducts = updatedProducts.map(p =>
                    p.id === item.productId
                        ? { ...p, stock: Math.max(0, p.stock - item.quantity) }
                        : p
                );
            }
            await storage.setProducts(updatedProducts);
        }

        setState((prev) => ({
            ...prev,
            returns: newReturns,
            products: updatedProducts
        }));
    }, [state.returns, state.products]);

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
                contacts: [],
                products: [],
                returns: [],
                isLoading: false,
            });
        }
        return success;
    }, []);

    // Restore data from backup
    const restoreData = useCallback(async (data: { sales?: Sale[]; expenses?: Expense[]; credits?: Credit[]; settings?: Settings; contacts?: Contact[]; products?: Product[]; returns?: SaleReturn[] }) => {
        const success = await storage.importAllData(data);
        if (success) {
            setState({
                sales: data.sales || [],
                expenses: data.expenses || [],
                credits: data.credits || [],
                settings: data.settings ? { ...data.settings, lock: Boolean(data.settings.lock) } : defaultSettings,
                contacts: data.contacts || [],
                products: data.products || [],
                returns: data.returns || [],
                isLoading: false,
            });
        }
        return success;
    }, []);

    // Computed values
    // Get today's total sales amount (totalAmount - full invoice value)
    const getTodaySales = useCallback(() => {
        const today = getToday();
        return state.sales
            .filter((s) => s.date === today)
            .reduce((sum, s) => sum + (s.totalAmount ?? 0), 0);
    }, [state.sales]);

    // Get today's cash received (paidAmount for Cash payment method)
    const getTodayCashReceived = useCallback(() => {
        const today = getToday();
        return state.sales
            .filter((s) => s.date === today && s.paymentMethod === 'Cash')
            .reduce((sum, s) => sum + (s.paidAmount ?? s.totalAmount ?? 0), 0);
    }, [state.sales]);

    // Get today's UPI received (paidAmount for UPI payment method)
    const getTodayUPIReceived = useCallback(() => {
        const today = getToday();
        return state.sales
            .filter((s) => s.date === today && s.paymentMethod === 'UPI')
            .reduce((sum, s) => sum + (s.paidAmount ?? s.totalAmount ?? 0), 0);
    }, [state.sales]);

    const getTodayExpenses = useCallback(() => {
        const today = getToday();
        return state.expenses
            .filter((e) => e.date === today)
            .reduce((sum, e) => sum + (e.amount ?? 0), 0);
    }, [state.expenses]);

    // Get total payments received for 'given' credits (money coming in from credits we gave)
    const getCreditPaymentsReceived = useCallback(() => {
        return state.credits
            .filter((c) => c.type === 'given')
            .reduce((sum, c) => sum + (c.paidAmount ?? 0), 0);
    }, [state.credits]);

    // Get total payments made for 'taken' credits (money going out for credits we took)
    const getCreditPaymentsMade = useCallback(() => {
        return state.credits
            .filter((c) => c.type === 'taken')
            .reduce((sum, c) => sum + (c.paidAmount ?? 0), 0);
    }, [state.credits]);

    const getBalance = useCallback(() => {
        const totalSales = state.sales.reduce((sum, s) => sum + (s.paidAmount ?? s.totalAmount ?? 0), 0);
        const totalExpenses = state.expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);

        // Credit received (from given credits)
        const creditReceived = state.credits
            .filter((c) => c.type === 'given')
            .reduce((sum, c) => sum + (c.paidAmount ?? 0), 0);

        // Credit payments made (for taken credits) subtract from balance
        const creditPaid = state.credits
            .filter((c) => c.type === 'taken')
            .reduce((sum, c) => sum + (c.paidAmount ?? 0), 0);

        // Sales returns subtract from balance
        const totalReturns = state.returns.reduce((sum, r) => sum + (r.amount ?? 0), 0);

        return totalSales + creditReceived - totalExpenses - creditPaid - totalReturns;
    }, [state.sales, state.expenses, state.credits, state.returns]);

    const getCashBalance = useCallback(() => {
        // Sales (Cash)
        const salesCash = state.sales
            .filter(s => s.paymentMethod === 'Cash')
            .reduce((sum, s) => sum + (s.paidAmount ?? s.totalAmount ?? 0), 0);

        // Expenses (Cash) - if paymentMethod is undefined/null, assume Cash for now
        const expensesCash = state.expenses
            .filter(e => e.paymentMethod === 'Cash' || !e.paymentMethod)
            .reduce((sum, e) => sum + (e.amount ?? 0), 0);

        // Credit Received (Cash)
        const creditReceivedCash = state.credits
            .filter(c => c.type === 'given')
            .reduce((sum, c) => {
                const cashPayments = c.payments?.filter(p => p.paymentMode === 'Cash') || [];
                return sum + cashPayments.reduce((pSum, p) => pSum + p.amount, 0);
            }, 0);

        // Credit Paid (Cash)
        const creditPaidCash = state.credits
            .filter(c => c.type === 'taken')
            .reduce((sum, c) => {
                const cashPayments = c.payments?.filter(p => p.paymentMode === 'Cash') || [];
                return sum + cashPayments.reduce((pSum, p) => pSum + p.amount, 0);
            }, 0);

        // Returns (Cash) - difficult to track exactly without return payment method, assuming Cash for safety/default
        // logic: if original sale was cash, return is cash.
        const returnsCash = state.returns.reduce((sum, r) => {
            const originalSale = state.sales.find(s => s.id === r.saleId);
            if (originalSale && originalSale.paymentMethod === 'Cash') {
                return sum + (r.amount ?? 0);
            }
            return sum;
        }, 0);

        return salesCash + creditReceivedCash - expensesCash - creditPaidCash - returnsCash;
    }, [state.sales, state.expenses, state.credits, state.returns]);

    const getUPIBalance = useCallback(() => {
        // Sales (UPI)
        const salesUPI = state.sales
            .filter(s => s.paymentMethod === 'UPI')
            .reduce((sum, s) => sum + (s.paidAmount ?? s.totalAmount ?? 0), 0);

        // Expenses (UPI)
        const expensesUPI = state.expenses
            .filter(e => e.paymentMethod === 'UPI')
            .reduce((sum, e) => sum + (e.amount ?? 0), 0);

        // Credit Received (UPI)
        const creditReceivedUPI = state.credits
            .filter(c => c.type === 'given')
            .reduce((sum, c) => {
                const upiPayments = c.payments?.filter(p => p.paymentMode === 'UPI') || [];
                return sum + upiPayments.reduce((pSum, p) => pSum + p.amount, 0);
            }, 0);

        // Credit Paid (UPI)
        const creditPaidUPI = state.credits
            .filter(c => c.type === 'taken')
            .reduce((sum, c) => {
                const upiPayments = c.payments?.filter(p => p.paymentMode === 'UPI') || [];
                return sum + upiPayments.reduce((pSum, p) => pSum + p.amount, 0);
            }, 0);

        // Returns (UPI)
        const returnsUPI = state.returns.reduce((sum, r) => {
            const originalSale = state.sales.find(s => s.id === r.saleId);
            if (originalSale && originalSale.paymentMethod === 'UPI') {
                return sum + (r.amount ?? 0);
            }
            return sum;
        }, 0);

        return salesUPI + creditReceivedUPI - expensesUPI - creditPaidUPI - returnsUPI;
    }, [state.sales, state.expenses, state.credits, state.returns]);

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
                getTodayCashReceived,
                getTodayUPIReceived,
                getTodayExpenses,
                getBalance,
                getCreditPaymentsReceived,
                getCreditPaymentsMade,
                addCreditPayment,
                addContact,
                updateContact,
                deleteContact,
                addProduct,
                updateProduct,
                deleteProduct,
                addReturn,
                deleteReturn,
                getCashBalance,
                getUPIBalance,
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
