import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Sale, Expense, Credit } from './storage';

interface ReportData {
    sales: Sale[];
    expenses: Expense[];
    credits: Credit[];
    startDate: string;
    endDate: string;
    currency: string;
}

const categoryLabels: Record<string, string> = {
    food: 'Food',
    transport: 'Transport',
    shopping: 'Shopping',
    utilities: 'Utilities',
    rent: 'Rent',
    salary: 'Salary',
    other: 'Other',
};

// Helper to safely get sale amount
const getSaleAmount = (sale: Sale): number => {
    const amount = sale.paidAmount ?? sale.totalAmount ?? 0;
    return isNaN(amount) ? 0 : amount;
};

export const pdfService = {
    async generateReport(data: ReportData): Promise<string> {
        const { sales, expenses, credits, startDate, endDate, currency } = data;

        const totalSales = sales.reduce((sum, s) => sum + getSaleAmount(s), 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const netProfit = totalSales - totalExpenses;
        const pendingCredits = credits.filter(c => c.status === 'pending');
        const totalPending = pendingCredits.reduce((sum, c) => sum + c.amount, 0);

        // Group expenses by category
        const expensesByCategory = expenses.reduce((acc, e) => {
            acc[e.category] = (acc[e.category] || 0) + (e.amount || 0);
            return acc;
        }, {} as Record<string, number>);

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>MathNote Report</title>
            <style>
                body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
                h1 { color: #1A1A2E; border-bottom: 2px solid #81B29A; padding-bottom: 10px; }
                h2 { color: #1A1A2E; margin-top: 30px; }
                .date-range { color: #666; font-size: 14px; margin-bottom: 20px; }
                .summary-grid { display: flex; gap: 20px; margin: 20px 0; }
                .summary-card { flex: 1; padding: 15px; border-radius: 8px; text-align: center; }
                .sales { background: #81B29A; color: #1A1A2E; }
                .expenses { background: #EC0B43; color: white; }
                .profit { background: #1A1A2E; color: white; }
                .amount { font-size: 24px; font-weight: bold; margin: 10px 0; }
                .label { font-size: 12px; text-transform: uppercase; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
                th { background: #f5f5f5; font-weight: 600; }
                .category-bar { height: 20px; background: #EC0B43; border-radius: 4px; }
                .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; }
            </style>
        </head>
        <body>
            <h1>📊 MathNote Report</h1>
            <p class="date-range">${startDate === endDate ? `Report for ${startDate}` : `${startDate} to ${endDate}`}</p>

            <div class="summary-grid">
                <div class="summary-card sales">
                    <div class="label">Total Sales</div>
                    <div class="amount">${currency}${totalSales.toLocaleString()}</div>
                    <div class="label">${sales.length} transactions</div>
                </div>
                <div class="summary-card expenses">
                    <div class="label">Total Expenses</div>
                    <div class="amount">${currency}${totalExpenses.toLocaleString()}</div>
                    <div class="label">${expenses.length} transactions</div>
                </div>
                <div class="summary-card profit">
                    <div class="label">${netProfit >= 0 ? 'Net Profit' : 'Net Loss'}</div>
                    <div class="amount">${currency}${Math.abs(netProfit).toLocaleString()}</div>
                </div>
            </div>

            <h2>📈 Sales Details</h2>
            <table>
                <tr><th>Date</th><th>Customer</th><th>Amount</th><th>Method</th></tr>
                ${sales.slice(0, 20).map(s => `
                    <tr>
                        <td>${new Date(s.date).toLocaleDateString('en-IN')}</td>
                        <td>${s.customerName || 'Walk-in'}</td>
                        <td>${currency}${getSaleAmount(s).toLocaleString()}</td>
                        <td>${s.paymentMethod || '-'}</td>
                    </tr>
                `).join('')}
                ${sales.length > 20 ? `<tr><td colspan="4" style="text-align:center;color:#999;">...and ${sales.length - 20} more</td></tr>` : ''}
            </table>

            <h2>💸 Expense Breakdown</h2>
            <table>
                <tr><th>Category</th><th>Amount</th></tr>
                ${Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => `
                    <tr>
                        <td>${categoryLabels[cat] || cat}</td>
                        <td>${currency}${amt.toLocaleString()}</td>
                    </tr>
                `).join('')}
            </table>

            ${pendingCredits.length > 0 ? `
            <h2>⏳ Pending Credits</h2>
            <table>
                <tr><th>Party</th><th>Type</th><th>Amount</th><th>Date</th></tr>
                ${pendingCredits.map(c => `
                    <tr>
                        <td>${c.party}</td>
                        <td>${c.type === 'given' ? 'To Receive' : 'To Pay'}</td>
                        <td>${currency}${c.amount.toLocaleString()}</td>
                        <td>${new Date(c.date).toLocaleDateString('en-IN')}</td>
                    </tr>
                `).join('')}
                <tr style="font-weight:bold;background:#f5f5f5;">
                    <td colspan="2">Total Pending</td>
                    <td colspan="2">${currency}${totalPending.toLocaleString()}</td>
                </tr>
            </table>
            ` : ''}

            <div class="footer">
                Generated by MathNote • ${new Date().toLocaleDateString('en-IN')}
            </div>
        </body>
        </html>
        `;

        // Generate PDF
        const { uri } = await Print.printToFileAsync({ html });
        return uri;
    },

    async shareReport(data: ReportData): Promise<void> {
        const uri = await this.generateReport(data);

        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, {
                mimeType: 'application/pdf',
                dialogTitle: 'Share MathNote Report',
                UTI: 'com.adobe.pdf',
            });
        }
    },
};

export default pdfService;
