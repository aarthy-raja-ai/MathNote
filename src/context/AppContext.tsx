import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { Alert } from 'react-native';
import storage, { Sale, Expense, Credit, Settings, CreditPayment, Contact, Product, SaleItem, SaleReturn, Purchase } from '../utils/storage';
import { syncService } from '../services/syncService';
import { supabase } from '../services/supabaseClient';
import googleDriveService from '../utils/googleDrive';

interface AppState {
    sales: Sale[];
    expenses: Expense[];
    credits: Credit[];
    settings: Settings;
    contacts: Contact[];
    products: Product[];
    returns: SaleReturn[];
    purchases: Purchase[];
    isLoading: boolean;
}

// Input type for adding a sale (without id and linkedCreditId)
interface AddSaleInput {
    date: string;
    customerName: string;
    customerState?: string;
    customerAddress?: string;
    customerGSTIN?: string;
    customerPhone?: string;
    totalAmount: number;
    paidAmount: number;
    paymentMethod: 'Cash' | 'UPI';
    note: string;
    items?: SaleItem[];
    invoiceNumber?: string;
    subtotal?: number;
    discountTotal?: number;
    discountType?: 'percent' | 'flat';
    taxTotal?: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    gstRate?: number;
    taxMode?: 'exclusive' | 'inclusive';
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
    addCredit: (credit: Omit<Credit, 'id' | 'paidAmount' | 'payments'>) => Promise<void>;
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
    // Purchases
    addPurchase: (purchase: Omit<Purchase, 'id'>) => Promise<void>;
    updatePurchase: (id: string, purchase: Partial<Purchase>) => Promise<void>;
    deletePurchase: (id: string) => Promise<void>;
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
        purchases?: Purchase[];
    }) => Promise<boolean>;
    // Computed
    getTodaySales: () => number;
    getTodayCashReceived: () => number;
    getTodayUPIReceived: () => number;
    getTodayExpenses: () => number;
    getTodayPurchases: () => number;
    getBalance: () => number;
    getTodayProfit: () => number;
    getProfitForRange: (days?: number) => number;
    triggerCloudSync: () => Promise<void>;
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
        purchases: [],
        isLoading: true,
    });

    // Ref to always hold latest state — prevents stale closures in useCallback
    const stateRef = useRef(state);
    stateRef.current = state;

    const [syncTrigger, setSyncTrigger] = useState(0);

    // Load data on mount
    useEffect(() => {
        // Register sync listener to break circular dependency
        storage.onSet = (key, value) => {
            if (key === 'SUPABASE_URL' || key === 'SUPABASE_KEY') {
                supabase.reset();
                setSyncTrigger(prev => prev + 1);
                syncService.pullAll().catch(err => console.error('[Sync] Post-config pull failed:', err));
            } else {
                syncService.push(key, value);
            }
        };

        const loadData = async () => {
            const [sales, expenses, credits, settings, contacts, products, returns, purchases] = await Promise.all([
                storage.getSales(),
                storage.getExpenses(),
                storage.getCredits(),
                storage.getSettings(),
                storage.getContacts(),
                storage.getProducts(),
                storage.getReturns(),
                storage.getPurchases(),
            ]);
            const safeSettings = settings ? {
                ...settings,
                lock: Boolean(settings.lock),
            } : defaultSettings;

            const localData = {
                sales: sales || [],
                expenses: expenses || [],
                credits: credits || [],
                settings: safeSettings,
                contacts: contacts || [],
                products: products || [],
                returns: returns || [],
                purchases: purchases || [],
                isLoading: false,
            };
            setState(localData);

            // Cloud Sync Pull
            try {
                await syncService.pullAll();
            } catch (err) {
                console.error('[Sync] Initial pull failed:', err);
            }
        };
        loadData();
    }, []);

// Set up real-time subscription
useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupSync = async () => {
        unsubscribe = await syncService.subscribe(async () => {
            console.log('[Sync] Cloud update received, refreshing state...');
            const [sales, expenses, credits, settings, contacts, products, returns, purchases] = await Promise.all([
                storage.getSales(),
                storage.getExpenses(),
                storage.getCredits(),
                storage.getSettings(),
                storage.getContacts(),
                storage.getProducts(),
                storage.getReturns(),
                storage.getPurchases(),
            ]);
            setState(prev => ({
                ...prev,
                sales, expenses, credits, settings: settings || prev.settings, contacts, products, returns, purchases
            }));
        });
    };

    setupSync();
    return () => {
        if (unsubscribe) unsubscribe();
    };
}, [syncTrigger]);

// Sales - with partial payment logic
const addSale = useCallback(async (saleInput: AddSaleInput) => {
    const saleId = generateId();
    let linkedCreditId: string | undefined;
    let newCredits = [...stateRef.current.credits];

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
        customerState: saleInput.customerState,
        customerAddress: saleInput.customerAddress,
        customerGSTIN: saleInput.customerGSTIN,
        customerPhone: saleInput.customerPhone,
        totalAmount: saleInput.totalAmount,
        paidAmount: saleInput.paidAmount,
        paymentMethod: saleInput.paymentMethod,
        note: saleInput.note,
        linkedCreditId,
        items: saleInput.items,
        invoiceNumber: saleInput.invoiceNumber,
        subtotal: saleInput.subtotal,
        discountTotal: saleInput.discountTotal,
        discountType: saleInput.discountType,
        taxTotal: saleInput.taxTotal,
        cgst: saleInput.cgst,
        sgst: saleInput.sgst,
        igst: saleInput.igst,
        gstRate: saleInput.gstRate,
        taxMode: saleInput.taxMode,
    };

    const newSales = [...stateRef.current.sales, newSale];
    await storage.setSales(newSales);

    // Inventory Logic: Decrement stock for each item sold
    let updatedProducts = [...stateRef.current.products];
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
}, []);

const updateSale = useCallback(async (id: string, updates: Partial<Sale>) => {
    const newSales = stateRef.current.sales.map((s) => (s.id === id ? { ...s, ...updates } : s));
    await storage.setSales(newSales);
    setState((prev) => ({ ...prev, sales: newSales }));
}, []);

const deleteSale = useCallback(async (id: string) => {
    const sale = stateRef.current.sales.find((s) => s.id === id);
    let newCredits = [...stateRef.current.credits];

    // Also delete linked credit if exists
    if (sale?.linkedCreditId) {
        newCredits = newCredits.filter((c) => c.id !== sale.linkedCreditId);
        await storage.setCredits(newCredits);
        await syncService.delete('@mathnote_credits', sale.linkedCreditId).catch(err => console.error('[Sync] Credit delete failed:', err));
    }

    const newSales = stateRef.current.sales.filter((s) => s.id !== id);
    await storage.setSales(newSales);
    setState((prev) => ({ ...prev, sales: newSales, credits: newCredits }));
    await syncService.delete('@mathnote_sales', id).catch(err => console.error('[Sync] Sale delete failed:', err));
}, []);

// Expenses
const addExpense = useCallback(async (expense: Omit<Expense, 'id'>) => {
    const newExpense: Expense = {
        ...expense,
        id: generateId(),
        paymentMethod: expense.paymentMethod || 'Cash' // Default to Cash if not provided
    };
    const newExpenses = [...stateRef.current.expenses, newExpense];
    await storage.setExpenses(newExpenses);
    setState((prev) => ({ ...prev, expenses: newExpenses }));
}, []);

const updateExpense = useCallback(async (id: string, updates: Partial<Expense>) => {
    const newExpenses = stateRef.current.expenses.map((e) => (e.id === id ? { ...e, ...updates } : e));
    await storage.setExpenses(newExpenses);
    setState((prev) => ({ ...prev, expenses: newExpenses }));
}, []);

const deleteExpense = useCallback(async (id: string) => {
    const newExpenses = stateRef.current.expenses.filter((e) => e.id !== id);
    await storage.setExpenses(newExpenses);
    setState((prev) => ({ ...prev, expenses: newExpenses }));
    await syncService.delete('@mathnote_expenses', id).catch(err => console.error('[Sync] Expense delete failed:', err));
}, []);

// Credits
const addCredit = useCallback(async (credit: Omit<Credit, 'id' | 'paidAmount' | 'payments'>) => {
    const newCredit: Credit = {
        ...credit,
        id: generateId(),
        paidAmount: 0,
        payments: [],
    };
    const newCredits = [...stateRef.current.credits, newCredit];
    await storage.setCredits(newCredits);
    setState((prev) => ({ ...prev, credits: newCredits }));
}, []);

const updateCredit = useCallback(async (id: string, updates: Partial<Credit>) => {
    const newCredits = stateRef.current.credits.map((c) => {
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
}, []);

const addCreditPayment = useCallback(async (creditId: string, payment: Omit<CreditPayment, 'id'>) => {
    const newCredits = stateRef.current.credits.map((c) => {
        if (c.id === creditId) {
            const newPayment: CreditPayment = { ...payment, id: generateId() };
            const payments = [...(c.payments || []), newPayment];
            const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
            const status: 'paid' | 'pending' = paidAmount >= c.amount ? 'paid' : 'pending';
            return { ...c, payments, paidAmount, status };
        }
        return c;
    });
    await storage.setCredits(newCredits);
    setState((prev) => ({ ...prev, credits: newCredits }));
}, []);

const deleteCredit = useCallback(async (id: string) => {
    const newCredits = stateRef.current.credits.filter((c) => c.id !== id);
    await storage.setCredits(newCredits);
    setState((prev) => ({ ...prev, credits: newCredits }));
    await syncService.delete('@mathnote_credits', id).catch(err => console.error('[Sync] Credit delete failed:', err));
}, []);

// Contacts
const addContact = useCallback(async (contactInput: Omit<Contact, 'id' | 'createdAt'>) => {
    const newContact: Contact = {
        ...contactInput,
        id: generateId(),
        createdAt: new Date().toISOString(),
    };
    const newContacts = [...stateRef.current.contacts, newContact];
    await storage.setContacts(newContacts);
    setState((prev) => ({ ...prev, contacts: newContacts }));
}, []);

const updateContact = useCallback(async (id: string, updates: Partial<Contact>) => {
    const newContacts = stateRef.current.contacts.map((c) => (c.id === id ? { ...c, ...updates } : c));
    await storage.setContacts(newContacts);
    setState((prev) => ({ ...prev, contacts: newContacts }));
}, []);

const deleteContact = useCallback(async (id: string) => {
    const contact = stateRef.current.contacts.find(c => c.id === id);
    if (!contact) return;

    // Check if contact is used in sales or credits
    const hasSales = stateRef.current.sales.some(s => s.customerName === contact.name);
    const hasCredits = stateRef.current.credits.some(c => c.party === contact.name);
    const hasExpenses = stateRef.current.expenses.some(e => e.vendorId === id || e.vendorName === contact.name);

    if (hasSales || hasCredits || hasExpenses) {
        Alert.alert(
            'Cannot Delete Contact',
            'This contact is linked to existing transactions (Sales, Credits, or Expenses). Please delete those transactions first.',
            [{ text: 'OK' }]
        );
        return;
    }

    const newContacts = stateRef.current.contacts.filter((c) => c.id !== id);
    await storage.setContacts(newContacts);
    setState((prev) => ({ ...prev, contacts: newContacts }));
    await syncService.delete('@mathnote_contacts', id).catch(err => console.error('[Sync] Contact delete failed:', err));
}, []);

// Products
const addProduct = useCallback(async (productInput: Omit<Product, 'id' | 'createdAt'>) => {
    const newProduct: Product = {
        ...productInput,
        id: generateId(),
        createdAt: new Date().toISOString(),
    };
    const newProducts = [...stateRef.current.products, newProduct];
    await storage.setProducts(newProducts);
    setState((prev) => ({ ...prev, products: newProducts }));
}, []);

const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    const newProducts = stateRef.current.products.map((p) => (p.id === id ? { ...p, ...updates } : p));
    await storage.setProducts(newProducts);
    setState((prev) => ({ ...prev, products: newProducts }));
}, []);

const deleteProduct = useCallback(async (id: string) => {
    const product = stateRef.current.products.find(p => p.id === id);
    if (!product) return;

    // Check if product is used in sales
    const hasSales = stateRef.current.sales.some(s => s.items?.some(item => item.productId === id));

    if (hasSales) {
        Alert.alert(
            'Cannot Delete Product',
            'This product is linked to existing sales. Please delete those sales first or mark the product as inactive (if supported).',
            [{ text: 'OK' }]
        );
        return;
    }

    const newProducts = stateRef.current.products.filter((p) => p.id !== id);
    await storage.setProducts(newProducts);
    setState((prev) => ({ ...prev, products: newProducts }));
    await syncService.delete('@mathnote_products', id).catch(err => console.error('[Sync] Product delete failed:', err));
}, []);

// Returns
const addReturn = useCallback(async (input: AddReturnInput) => {
    const sale = stateRef.current.sales.find(s => s.id === input.saleId);
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

    const newReturns = [...stateRef.current.returns, newReturn];
    await storage.setReturns(newReturns);

    // Inventory Logic: Increment stock for each item returned
    let updatedProducts = [...stateRef.current.products];
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
    let updatedCredits = [...stateRef.current.credits];
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
}, []);

const deleteReturn = useCallback(async (id: string) => {
    const ret = stateRef.current.returns.find(r => r.id === id);
    if (!ret) return;

    const newReturns = stateRef.current.returns.filter(r => r.id !== id);
    await storage.setReturns(newReturns);

    // Rollback inventory if possible
    let updatedProducts = [...stateRef.current.products];
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
    await syncService.delete('@mathnote_returns', id).catch(err => console.error('[Sync] Return delete failed:', err));
}, []);

// Purchases
const addPurchase = useCallback(async (purchaseInput: Omit<Purchase, 'id'>) => {
    const id = generateId();
    let linkedExpenseId: string | undefined;
    let newExpenses = [...stateRef.current.expenses];

    // Create expense entry if amount is paid
    if (purchaseInput.paidAmount > 0) {
        linkedExpenseId = generateId();
        const newExpense: Expense = {
            id: linkedExpenseId,
            date: purchaseInput.date,
            category: 'Purchase',
            amount: purchaseInput.paidAmount,
            note: `Payment for Purchase from ${purchaseInput.vendorName}`,
            vendorName: purchaseInput.vendorName,
            paymentMethod: purchaseInput.paymentMethod || 'Cash'
        };
        newExpenses = [...newExpenses, newExpense];
        await storage.setExpenses(newExpenses);
    }

    const newPurchase: Purchase = {
        ...purchaseInput,
        id,
        linkedExpenseId
    };

    const newPurchases = [...stateRef.current.purchases, newPurchase];
    await storage.setPurchases(newPurchases);

    // Inventory Logic: Increment stock for each item purchased
    let updatedProducts = [...stateRef.current.products];
    if (purchaseInput.items && purchaseInput.items.length > 0) {
        for (const item of purchaseInput.items) {
            updatedProducts = updatedProducts.map(p =>
                p.id === item.productId
                    ? { ...p, stock: p.stock + item.quantity }
                    : p
            );
        }
        await storage.setProducts(updatedProducts);
    }

    setState((prev) => ({
        ...prev,
        purchases: newPurchases,
        products: updatedProducts,
        expenses: newExpenses
    }));
}, []);

const updatePurchase = useCallback(async (id: string, updates: Partial<Purchase>) => {
    const oldPurchase = stateRef.current.purchases.find(p => p.id === id);
    if (!oldPurchase) return;

    // 1. Rollback old stock
    let updatedProducts = [...stateRef.current.products];
    if (oldPurchase.items && oldPurchase.items.length > 0) {
        for (const item of oldPurchase.items) {
            updatedProducts = updatedProducts.map(p =>
                p.id === item.productId
                    ? { ...p, stock: Math.max(0, p.stock - item.quantity) }
                    : p
            );
        }
    }

    // 2. Handle linked expense
    let newExpenses = [...stateRef.current.expenses];
    let linkedExpenseId = oldPurchase.linkedExpenseId;

    const newPaidAmount = updates.paidAmount ?? oldPurchase.paidAmount;
    const newVendorName = updates.vendorName ?? oldPurchase.vendorName;
    const newDate = updates.date ?? oldPurchase.date;
    const newMethod = updates.paymentMethod ?? oldPurchase.paymentMethod;

    if (newPaidAmount > 0) {
        if (linkedExpenseId) {
            // Update existing expense
            newExpenses = newExpenses.map(e => e.id === linkedExpenseId ? {
                ...e,
                amount: newPaidAmount,
                vendorName: newVendorName,
                date: newDate,
                paymentMethod: newMethod
            } : e);
        } else {
            // Create new expense
            linkedExpenseId = generateId();
            newExpenses.push({
                id: linkedExpenseId,
                date: newDate,
                category: 'Purchase',
                amount: newPaidAmount,
                note: `Payment for Purchase from ${newVendorName}`,
                vendorName: newVendorName,
                paymentMethod: newMethod || 'Cash'
            });
        }
    } else if (linkedExpenseId) {
        // Delete expense if paid amount becomes 0
        newExpenses = newExpenses.filter(e => e.id !== linkedExpenseId);
        linkedExpenseId = undefined;
    }

    await storage.setExpenses(newExpenses);

    // 3. Apply new stock
    const finalItems = updates.items ?? oldPurchase.items;
    if (finalItems && finalItems.length > 0) {
        for (const item of finalItems) {
            updatedProducts = updatedProducts.map(p =>
                p.id === item.productId
                    ? { ...p, stock: p.stock + item.quantity }
                    : p
            );
        }
    }
    await storage.setProducts(updatedProducts);

    // 4. Update purchase
    const newPurchases = stateRef.current.purchases.map((p) => (p.id === id ? { ...p, ...updates, linkedExpenseId } : p));
    await storage.setPurchases(newPurchases);

    setState((prev) => ({
        ...prev,
        purchases: newPurchases,
        products: updatedProducts,
        expenses: newExpenses
    }));
}, []);

const deletePurchase = useCallback(async (id: string) => {
    const purchase = stateRef.current.purchases.find(p => p.id === id);
    if (!purchase) return;

    // 1. Rollback inventory
    let updatedProducts = [...stateRef.current.products];
    if (purchase.items && purchase.items.length > 0) {
        for (const item of purchase.items) {
            updatedProducts = updatedProducts.map(p =>
                p.id === item.productId
                    ? { ...p, stock: Math.max(0, p.stock - item.quantity) }
                    : p
            );
        }
        await storage.setProducts(updatedProducts);
    }

    // 2. Delete linked expense
    let newExpenses = [...stateRef.current.expenses];
    if (purchase.linkedExpenseId) {
        newExpenses = newExpenses.filter(e => e.id !== purchase.linkedExpenseId);
        await storage.setExpenses(newExpenses);
        await syncService.delete('@mathnote_expenses', purchase.linkedExpenseId).catch(err => console.error('[Sync] Expense delete failed:', err));
    }

    const newPurchases = stateRef.current.purchases.filter(p => p.id !== id);
    await storage.setPurchases(newPurchases);

    setState((prev) => ({
        ...prev,
        purchases: newPurchases,
        products: updatedProducts,
        expenses: newExpenses
    }));
    await syncService.delete('@mathnote_purchases', id).catch(err => console.error('[Sync] Purchase delete failed:', err));
}, []);

// Settings
const updateSettings = useCallback(async (updates: Partial<Settings>) => {
    const newSettings = { ...stateRef.current.settings, ...updates };
    await storage.setSettings(newSettings);
    
    // Propagate users to synced table
    if (updates.users) {
        await storage.set('@mathnote_users', updates.users);
    }
    
    // Propagate business profile updates to synced table
    const hasProfileUpdate = 
        updates.businessName !== undefined ||
        updates.businessAddress !== undefined ||
        updates.businessPhone !== undefined ||
        updates.businessGSTIN !== undefined ||
        updates.businessLogo !== undefined ||
        updates.gstEnabled !== undefined ||
        updates.taxType !== undefined;
        
    if (hasProfileUpdate) {
        const authData = (await storage.get<any>('@mathnote_auth')) || {
            businessName: '', ownerName: '', phone: '', email: '', address: '',
            state: '', city: '', pincode: '', gstin: '', panNumber: '',
            category: '', taxType: 'GST', logoBase64: ''
        };
        const updatedAuth = {
            ...authData,
            businessName: updates.businessName ?? authData.businessName,
            address: updates.businessAddress ?? authData.address,
            phone: updates.businessPhone ?? authData.phone,
            gstin: updates.businessGSTIN ?? authData.gstin,
            logoBase64: updates.businessLogo ?? authData.logoBase64,
            taxType: updates.taxType ?? (updates.gstEnabled !== undefined ? (updates.gstEnabled ? 'GST' : 'NON-GST') : authData.taxType),
        };
        await storage.set('@mathnote_auth', updatedAuth);
    }

    setState((prev) => ({ ...prev, settings: newSettings }));
}, []);

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
            purchases: [],
            isLoading: false,
        });
    }
    return success;
}, []);

// Restore data from backup
const restoreData = useCallback(async (data: { sales?: Sale[]; expenses?: Expense[]; credits?: Credit[]; settings?: Settings; contacts?: Contact[]; products?: Product[]; returns?: SaleReturn[]; purchases?: Purchase[] }) => {
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
            purchases: data.purchases || [],
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

const getTodayPurchases = useCallback(() => {
    const today = getToday();
    return state.purchases
        .filter((p) => p.date === today)
        .reduce((sum, p) => sum + (p.paidAmount ?? p.totalAmount ?? 0), 0);
}, [state.purchases]);

const triggerCloudSync = useCallback(async () => {
    if (!state.settings.autoCloudBackup) return;

    try {
        // Using the same mock token as SettingsScreen (USER_ACCESS_TOKEN)
        const mockToken = "USER_ACCESS_TOKEN";
        const success = await googleDriveService.uploadBackup(mockToken);
        if (success) {
            console.log('Auto cloud backup successful');
        }
    } catch (error) {
        console.error('Auto cloud backup error:', error);
    }
}, [state.settings.autoCloudBackup]);

// Automatically trigger sync when data changes
useEffect(() => {
    const hasData = state.sales.length > 0 || state.expenses.length > 0 || state.products.length > 0;
    if (state.settings.autoCloudBackup && hasData) {
        const timer = setTimeout(() => {
            triggerCloudSync();
        }, 5000); // 5s debounce to avoid too many uploads during rapid edits
        return () => clearTimeout(timer);
    }
}, [
    state.sales,
    state.expenses,
    state.credits,
    state.products,
    state.contacts,
    state.returns,
    state.purchases,
    state.settings.autoCloudBackup,
    triggerCloudSync
]);

const getTodayProfit = useCallback(() => {
    const today = getToday();
    return state.sales
        .filter(s => s.date === today)
        .reduce((totalProfit, sale) => {
            const subtotal = sale.subtotal || sale.totalAmount || 0;
            const discount = sale.discountTotal || 0;
            const cost = (sale.items || []).reduce((sum, item) => sum + ((item.costPrice || 0) * item.quantity), 0);
            return totalProfit + (subtotal - discount - cost);
        }, 0);
}, [state.sales]);

const getProfitForRange = useCallback((days?: number) => {
    let filteredSales = state.sales;
    if (days) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        filteredSales = state.sales.filter(s => new Date(s.date) >= cutoff);
    }

    return filteredSales.reduce((totalProfit, sale) => {
        const subtotal = sale.subtotal || sale.totalAmount || 0;
        const discount = sale.discountTotal || 0;
        const cost = (sale.items || []).reduce((sum, item) => sum + ((item.costPrice || 0) * item.quantity), 0);
        return totalProfit + (subtotal - discount - cost);
    }, 0);
}, [state.sales]);

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

    // Purchases subtract from balance
    const totalPurchases = state.purchases.reduce((sum, p) => sum + (p.paidAmount ?? 0), 0);

    return totalSales + creditReceived - totalExpenses - creditPaid - totalReturns - totalPurchases;
}, [state.sales, state.expenses, state.credits, state.returns, state.purchases]);

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

    // Purchases (Cash)
    const purchasesCash = state.purchases
        .filter(p => p.paymentMethod === 'Cash')
        .reduce((sum, p) => sum + (p.paidAmount ?? 0), 0);

    return salesCash + creditReceivedCash - expensesCash - creditPaidCash - returnsCash - purchasesCash;
}, [state.sales, state.expenses, state.credits, state.returns, state.purchases]);

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

    // Purchases (UPI)
    const purchasesUPI = state.purchases
        .filter(p => p.paymentMethod === 'UPI')
        .reduce((sum, p) => sum + (p.paidAmount ?? 0), 0);

    return salesUPI + creditReceivedUPI - expensesUPI - creditPaidUPI - returnsUPI - purchasesUPI;
}, [state.sales, state.expenses, state.credits, state.returns, state.purchases]);

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
            getTodayPurchases,
            getTodayProfit,
            getProfitForRange,
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
            addPurchase,
            updatePurchase,
            deletePurchase,
            getCashBalance,
            getUPIBalance,
            triggerCloudSync,
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
