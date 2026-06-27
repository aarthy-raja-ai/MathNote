import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
    SALES: '@mathnote_sales',
    EXPENSES: '@mathnote_expenses',
    CREDITS: '@mathnote_credits',
    SETTINGS: '@mathnote_settings',
    CONTACTS: '@mathnote_contacts',
    PRODUCTS: '@mathnote_products',
    RETURNS: '@mathnote_returns',
    PURCHASES: '@mathnote_purchases',
    USERS: '@mathnote_users',
    AUTH: '@mathnote_auth',
};

export const storage = {
    // Sync listener
    onSet: null as ((key: string, value: any) => void) | null,

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

            // Intercept users/auth updates and propagate to settings
            if (key === STORAGE_KEYS.USERS || key === STORAGE_KEYS.AUTH) {
                const settingsStr = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
                const settings = settingsStr ? JSON.parse(settingsStr) : { theme: 'light', currency: '₹', lock: false };
                
                if (key === STORAGE_KEYS.USERS) {
                    settings.users = value;
                } else if (key === STORAGE_KEYS.AUTH) {
                    const profile = value as any;
                    if (profile) {
                        settings.businessName = profile.businessName || settings.businessName;
                        settings.businessAddress = profile.address || settings.businessAddress;
                        settings.businessPhone = profile.phone || settings.businessPhone;
                        settings.businessGSTIN = profile.gstin || settings.businessGSTIN;
                        settings.businessLogo = profile.logoBase64 || settings.businessLogo;
                        settings.businessState = profile.state || settings.businessState;
                        if (profile.taxType) {
                            settings.taxType = profile.taxType;
                            settings.gstEnabled = profile.taxType !== 'NON-GST';
                        }
                    }
                }
                await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
            }

            // Trigger listener if set
            if (this.onSet) {
                this.onSet(key, value);
            }
            return true;
        } catch (error) {
            console.error('Storage set error:', error);
            return false;
        }
    },

    // Sales
    async getSales() {
        return (await this.get<Sale[]>(STORAGE_KEYS.SALES)) || [];
    },

    async setSales(sales: Sale[]) {
        return this.set(STORAGE_KEYS.SALES, sales);
    },

    // Expenses
    async getExpenses() {
        return (await this.get<Expense[]>(STORAGE_KEYS.EXPENSES)) || [];
    },

    async setExpenses(expenses: Expense[]) {
        return this.set(STORAGE_KEYS.EXPENSES, expenses);
    },

    // Credits
    async getCredits() {
        return (await this.get<Credit[]>(STORAGE_KEYS.CREDITS)) || [];
    },

    async setCredits(credits: Credit[]) {
        return this.set(STORAGE_KEYS.CREDITS, credits);
    },

    // Settings
    async getSettings() {
        return await this.get<Settings>(STORAGE_KEYS.SETTINGS);
    },

    async setSettings(settings: Settings) {
        return this.set(STORAGE_KEYS.SETTINGS, settings);
    },

    // Contacts
    async getContacts() {
        return (await this.get<Contact[]>(STORAGE_KEYS.CONTACTS)) || [];
    },

    async setContacts(contacts: Contact[]) {
        return this.set(STORAGE_KEYS.CONTACTS, contacts);
    },

    // Products
    async getProducts() {
        return (await this.get<Product[]>(STORAGE_KEYS.PRODUCTS)) || [];
    },

    async setProducts(products: Product[]) {
        return this.set(STORAGE_KEYS.PRODUCTS, products);
    },

    // Returns
    async getReturns() {
        return (await this.get<SaleReturn[]>(STORAGE_KEYS.RETURNS)) || [];
    },

    async setReturns(returns: SaleReturn[]) {
        return this.set(STORAGE_KEYS.RETURNS, returns);
    },

    // Purchases
    async getPurchases() {
        return (await this.get<Purchase[]>(STORAGE_KEYS.PURCHASES)) || [];
    },

    async setPurchases(purchases: Purchase[]) {
        return this.set(STORAGE_KEYS.PURCHASES, purchases);
    },

    // Backup
    async exportAllData() {
        const [sales, expenses, credits, settings, contacts, products, returns, purchases] = await Promise.all([
            this.getSales(),
            this.getExpenses(),
            this.getCredits(),
            this.getSettings(),
            this.getContacts(),
            this.getProducts(),
            this.getReturns(),
            this.getPurchases(),
        ]);
        return { sales, expenses, credits, settings, contacts, products, returns, purchases, exportedAt: new Date().toISOString() };
    },

    // Restore from backup
    async importAllData(data: { sales?: Sale[]; expenses?: Expense[]; credits?: Credit[]; settings?: Settings; contacts?: Contact[]; products?: Product[]; returns?: SaleReturn[]; purchases?: Purchase[] }) {
        try {
            const operations: Promise<boolean>[] = [];

            if (data.sales && Array.isArray(data.sales)) {
                operations.push(this.setSales(data.sales));
            }
            if (data.expenses && Array.isArray(data.expenses)) {
                operations.push(this.setExpenses(data.expenses));
            }
            if (data.credits && Array.isArray(data.credits)) {
                operations.push(this.setCredits(data.credits));
            }
            if (data.settings) {
                operations.push(this.setSettings(data.settings));
            }
            if (data.contacts && Array.isArray(data.contacts)) {
                operations.push(this.setContacts(data.contacts));
            }
            if (data.products && Array.isArray(data.products)) {
                operations.push(this.setProducts(data.products));
            }
            if (data.returns && Array.isArray(data.returns)) {
                operations.push(this.setReturns(data.returns));
            }
            if (data.purchases && Array.isArray(data.purchases)) {
                operations.push(this.setPurchases(data.purchases));
            }

            await Promise.all(operations);
            return true;
        } catch (error) {
            console.error('Failed to import data:', error);
            return false;
        }
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
export interface SaleItem {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    costPrice?: number;
    // Discount & Tax
    discountPercent?: number;
    discountAmount?: number;
    taxRate?: number;
    taxAmount?: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    hsnCode?: string;
    taxMode?: 'exclusive' | 'inclusive';
}

export interface Sale {
    id: string;
    date: string;
    customerName: string;           // Customer name for the sale
    customerState?: string;
    customerAddress?: string;
    customerGSTIN?: string;
    customerPhone?: string;
    totalAmount: number;            // Total sale amount (after discount & tax)
    paidAmount: number;             // Amount paid at time of sale
    paymentMethod: 'Cash' | 'UPI';
    note: string;
    linkedCreditId?: string;        // Reference to auto-created credit (if partial payment)
    items?: SaleItem[];             // Linked inventory items
    // Invoice & Billing
    invoiceNumber?: string;
    subtotal?: number;              // Before discount & tax
    discountTotal?: number;
    discountType?: 'percent' | 'flat';
    taxTotal?: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    gstRate?: number;
    taxMode?: 'exclusive' | 'inclusive';
    returnIds?: string[];
}

export interface Expense {
    id: string;
    date: string;
    category: string;
    amount: number;
    note: string;
    vendorName?: string;
    vendorId?: string;
    paymentMethod?: 'Cash' | 'UPI';
}

export interface CreditPayment {
    id: string;
    amount: number;
    date: string;
    note?: string;
    paymentMode: 'Cash' | 'UPI';
}

export interface Credit {
    id: string;
    party: string;
    type: 'given' | 'taken';
    amount: number;         // Total original amount
    paidAmount: number;     // Sum of all payments
    status: 'paid' | 'pending';
    date: string;
    linkedSaleId?: string;
    payments?: CreditPayment[]; // History of partial payments
    paymentMode?: 'Cash' | 'UPI';  // Default payment mode for the credit
}

export type UserRole = 'owner' | 'manager' | 'staff';

export interface User {
    id: string;
    name: string;
    username?: string;
    password?: string;
    role: UserRole;
    pin: string;
    createdAt: string;
}

export interface Settings {
    theme: 'light' | 'dark';
    currency: string;
    lock: boolean;
    biometricEnabled?: boolean;
    autoCloudBackup?: boolean;
    // Business Profile
    businessName?: string;
    businessAddress?: string;
    businessPhone?: string;
    businessGSTIN?: string;
    businessLogo?: string; // base64 or URI
    businessState?: string;
    taxType?: 'GST' | 'NON-GST' | 'Composition';
    // GST Settings
    gstEnabled?: boolean;
    gstRate?: number; // 5, 12, 18, 28
    gstType?: 'intra' | 'inter'; // CGST+SGST or IGST
    taxMode?: 'exclusive' | 'inclusive';
    // Invoice Settings
    invoicePrefix?: string; // e.g., "INV"
    lastInvoiceNumber?: number;
    invoiceTemplate?: 'classic' | 'modern' | 'minimal';
    invoicePrintSize?: 'A4' | 'A5' | 'thermal80' | 'thermal58';
    // User Roles & Access Control
    users?: User[];
    currentUserId?: string;
    remindersEnabled?: boolean;
}

export interface Contact {
    id: string;
    name: string;
    phone?: string;
    type: 'Customer' | 'Vendor' | 'Both';
    notes?: string;
    createdAt: string;
    address?: string;
    state?: string;
    gstin?: string;
}

export interface Product {
    id: string;
    name: string;
    stock: number;
    unitPrice: number;
    costPrice?: number;
    category?: string;
    minStockLevel?: number;
    createdAt: string;
    barcode?: string;
}

export interface SaleReturn {
    id: string;
    saleId: string;
    date: string;
    party: string;
    amount: number;
    note: string;
    items?: SaleItem[];
}

export interface Purchase {
    id: string;
    date: string;
    vendorName: string;
    totalAmount: number;
    paidAmount: number;
    paymentMethod: 'Cash' | 'UPI';
    note: string;
    items?: SaleItem[];
    subtotal?: number;
    discountTotal?: number;
    discountType?: 'percent' | 'flat';
    taxTotal?: number;
    gstRate?: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    invoiceNumber?: string;
    linkedExpenseId?: string;
}

export default storage;
