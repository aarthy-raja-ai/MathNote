import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Sale, Expense, Credit } from './storage';

export interface ExportOptions {
    sales?: Sale[];
    expenses?: Expense[];
    credits?: Credit[];
    startDate?: string;
    endDate?: string;
    currency?: string;
}

// Convert array of objects to CSV string
const arrayToCSV = (data: any[], headers: string[]): string => {
    const headerRow = headers.join(',');
    const rows = data.map(item =>
        headers.map(header => {
            const value = item[header];
            // Handle undefined/null
            if (value === undefined || value === null) return '';
            // Escape quotes and wrap in quotes if contains comma
            const str = String(value);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        }).join(',')
    );
    return [headerRow, ...rows].join('\n');
};

// Format date for display
const formatDate = (dateStr: string): string => {
    try {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch {
        return dateStr;
    }
};

// Export sales to CSV
export const exportSalesCSV = async (
    sales: Sale[],
    currency: string = '₹',
    filename?: string
): Promise<boolean> => {
    try {
        const data = sales.map(s => ({
            Date: formatDate(s.date),
            'Invoice No': s.invoiceNumber || '-',
            Customer: s.customerName || 'Walk-in',
            Subtotal: s.subtotal || s.totalAmount,
            Discount: s.discountTotal || 0,
            CGST: s.cgst || 0,
            SGST: s.sgst || 0,
            IGST: s.igst || 0,
            'Tax Total': s.taxTotal || 0,
            'Grand Total': s.totalAmount,
            'Paid Amount': s.paidAmount,
            'Due Amount': s.totalAmount - s.paidAmount,
            'Payment Method': s.paymentMethod,
            Note: s.note || '-'
        }));

        const headers = ['Date', 'Invoice No', 'Customer', 'Subtotal', 'Discount', 'CGST', 'SGST', 'IGST', 'Tax Total', 'Grand Total', 'Paid Amount', 'Due Amount', 'Payment Method', 'Note'];
        const csv = arrayToCSV(data, headers);

        const fileName = filename || `MathNote_Sales_${new Date().toISOString().split('T')[0]}.csv`;
        const filePath = `${FileSystem.cacheDirectory}${fileName}`;

        await FileSystem.writeAsStringAsync(filePath, csv, { encoding: FileSystem.EncodingType.UTF8 });

        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(filePath, { mimeType: 'text/csv', dialogTitle: 'Export Sales' });
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error exporting sales CSV:', error);
        return false;
    }
};

// Export expenses to CSV
export const exportExpensesCSV = async (
    expenses: Expense[],
    currency: string = '₹',
    filename?: string
): Promise<boolean> => {
    try {
        const data = expenses.map(e => ({
            Date: formatDate(e.date),
            Category: e.category,
            Amount: e.amount,
            Vendor: e.vendorName || '-',
            Note: e.note || '-'
        }));

        const headers = ['Date', 'Category', 'Amount', 'Vendor', 'Note'];
        const csv = arrayToCSV(data, headers);

        const fileName = filename || `MathNote_Expenses_${new Date().toISOString().split('T')[0]}.csv`;
        const filePath = `${FileSystem.cacheDirectory}${fileName}`;

        await FileSystem.writeAsStringAsync(filePath, csv, { encoding: FileSystem.EncodingType.UTF8 });

        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(filePath, { mimeType: 'text/csv', dialogTitle: 'Export Expenses' });
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error exporting expenses CSV:', error);
        return false;
    }
};

// Export credits to CSV
export const exportCreditsCSV = async (
    credits: Credit[],
    currency: string = '₹',
    filename?: string
): Promise<boolean> => {
    try {
        const data = credits.map(c => ({
            Date: formatDate(c.date),
            Party: c.party,
            Type: c.type === 'given' ? 'Credit Given' : 'Credit Taken',
            Amount: c.amount,
            'Paid Amount': c.paidAmount || 0,
            'Due Amount': c.amount - (c.paidAmount || 0),
            Status: c.status,
            'Payment Mode': c.paymentMode || '-'
        }));

        const headers = ['Date', 'Party', 'Type', 'Amount', 'Paid Amount', 'Due Amount', 'Status', 'Payment Mode'];
        const csv = arrayToCSV(data, headers);

        const fileName = filename || `MathNote_Credits_${new Date().toISOString().split('T')[0]}.csv`;
        const filePath = `${FileSystem.cacheDirectory}${fileName}`;

        await FileSystem.writeAsStringAsync(filePath, csv, { encoding: FileSystem.EncodingType.UTF8 });

        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(filePath, { mimeType: 'text/csv', dialogTitle: 'Export Credits' });
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error exporting credits CSV:', error);
        return false;
    }
};

// Export all data to single CSV (combined report)
export const exportAllDataCSV = async (
    options: ExportOptions
): Promise<boolean> => {
    try {
        const { sales = [], expenses = [], credits = [], currency = '₹' } = options;

        // Create combined transaction list
        const transactions: any[] = [];

        sales.forEach(s => {
            transactions.push({
                Date: formatDate(s.date),
                Type: 'Sale',
                Party: s.customerName || 'Walk-in',
                'Invoice/Ref': s.invoiceNumber || '-',
                'Credit (+)': s.paidAmount,
                'Debit (-)': '',
                Notes: s.note || '-'
            });
        });

        expenses.forEach(e => {
            transactions.push({
                Date: formatDate(e.date),
                Type: 'Expense',
                Party: e.vendorName || e.category,
                'Invoice/Ref': '-',
                'Credit (+)': '',
                'Debit (-)': e.amount,
                Notes: e.note || '-'
            });
        });

        credits.forEach(c => {
            if (c.type === 'given') {
                transactions.push({
                    Date: formatDate(c.date),
                    Type: 'Credit Given',
                    Party: c.party,
                    'Invoice/Ref': '-',
                    'Credit (+)': c.paidAmount || 0,
                    'Debit (-)': '',
                    Notes: `Amount: ${c.amount}, Status: ${c.status}`
                });
            } else {
                transactions.push({
                    Date: formatDate(c.date),
                    Type: 'Credit Taken',
                    Party: c.party,
                    'Invoice/Ref': '-',
                    'Credit (+)': '',
                    'Debit (-)': c.paidAmount || 0,
                    Notes: `Amount: ${c.amount}, Status: ${c.status}`
                });
            }
        });

        // Sort by date
        transactions.sort((a, b) => {
            const dateA = new Date(a.Date.split(' ').reverse().join(' '));
            const dateB = new Date(b.Date.split(' ').reverse().join(' '));
            return dateB.getTime() - dateA.getTime();
        });

        const headers = ['Date', 'Type', 'Party', 'Invoice/Ref', 'Credit (+)', 'Debit (-)', 'Notes'];
        const csv = arrayToCSV(transactions, headers);

        const fileName = `MathNote_Report_${new Date().toISOString().split('T')[0]}.csv`;
        const filePath = `${FileSystem.cacheDirectory}${fileName}`;

        await FileSystem.writeAsStringAsync(filePath, csv, { encoding: FileSystem.EncodingType.UTF8 });

        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(filePath, { mimeType: 'text/csv', dialogTitle: 'Export Report' });
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error exporting all data CSV:', error);
        return false;
    }
};

export default {
    exportSalesCSV,
    exportExpensesCSV,
    exportCreditsCSV,
    exportAllDataCSV,
};
