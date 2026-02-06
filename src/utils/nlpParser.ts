import { evaluateMath } from './mathEvaluator';

export interface ParsedTransaction {
    type: 'sale' | 'expense' | 'credit';
    amount: number;
    paidAmount?: number;
    party?: string;
    category?: string;
    note?: string;
    paymentMethod: 'Cash' | 'UPI';
    creditType?: 'given' | 'taken';
    date?: string;
    items?: { productId: string; quantity: number; productName: string; unitPrice: number; costPrice: number }[];
}

export const parseMagicNote = (text: string, products: any[] = []): ParsedTransaction | null => {
    const input = text.toLowerCase();

    // Default values
    let amount = 0;
    let paymentMethod: 'Cash' | 'UPI' = 'Cash';

    // Check payment method
    if (input.includes('upi')) paymentMethod = 'UPI';
    else if (input.includes('cash')) paymentMethod = 'Cash';

    // Extract amount with math support
    // Find segments that look like math: e.g. "50*3", "100+200", or just "500"
    // We look for digits followed by math operators
    const mathRegex = /(\d+[\+\-\*\/]\d+([\+\-\*\/]\d+)*)/;
    const mathMatch = input.match(mathRegex);

    if (mathMatch) {
        const calculated = evaluateMath(mathMatch[0]);
        if (calculated !== null) amount = calculated;
    } else {
        const amountMatch = input.match(/(\d+)/);
        if (amountMatch) amount = parseFloat(amountMatch[0]);
    }

    if (amount === 0 && !input.match(/0/)) return null;

    // Identification logic
    // SALE: "sold", "sale", "received"
    if (input.includes('sold') || input.includes('sale') || input.includes('received')) {
        // Try to match products in the text
        // E.g. "Sold 2 Laptop" or "Sold Laptop 2"
        const foundItems: any[] = [];
        let totalAmountFromItems = 0;

        products.forEach(p => {
            const pName = p.name.toLowerCase();
            if (input.includes(pName)) {
                // Try to find quantity near the product name
                // Pattern: "2 Laptop" or "Laptop 2" 
                // Using word boundaries to avoid partial matches (e.g. "Pen" matching "Pencil")
                const qtyRegex = new RegExp(`(\\d+)\\s+${pName}\\b|\\b${pName}\\s+(\\d+)`, 'i');
                const qtyMatch = input.match(qtyRegex);
                const quantity = qtyMatch ? parseInt(qtyMatch[1] || qtyMatch[2]) : 1;

                foundItems.push({
                    productId: p.id,
                    productName: p.name,
                    quantity: quantity,
                    unitPrice: p.unitPrice,
                    costPrice: p.costPrice,
                });
                totalAmountFromItems += (p.unitPrice * quantity);
            }
        });

        let party = '';
        // "Sold 500 to Rahul" or "Sold to Rahul 500"
        const partyMatch = input.match(/to\s+([a-zA-Z\s]+?)(?=\s+for|\s+on|\s+cash|\s+upi|$)/i);
        if (partyMatch) party = partyMatch[1].trim();

        if (foundItems.length > 0) {
            return {
                type: 'sale',
                amount: totalAmountFromItems || amount,
                paidAmount: totalAmountFromItems || amount,
                party: party || 'Walk-in',
                items: foundItems,
                paymentMethod
            };
        }

        let note = '';
        const itemMatch = input.match(/(?:sold|sale)\s+(?:.*?)\s+([a-zA-Z\s]+?)(?=\s+to|\s+for|\s+on|\s+cash|\s+upi|$)/i);
        if (itemMatch && isNaN(parseFloat(itemMatch[1]))) note = itemMatch[1].trim();

        return {
            type: 'sale',
            amount,
            paidAmount: amount,
            party: party || 'Walk-in',
            note: note,
            paymentMethod
        };
    }

    // EXPENSE: "spent", "paid", "expense", "bought"
    if (input.includes('spent') || input.includes('paid') || input.includes('expense') || input.includes('bought')) {
        let category = 'Other';
        // "Spent 500 on Petrol"
        const catMatch = input.match(/on\s+([a-zA-Z\s]+?)(?=\s+for|\s+to|\s+cash|\s+upi|$)/i);
        if (catMatch) category = catMatch[1].trim();

        return {
            type: 'expense',
            amount,
            category: category,
            paymentMethod
        };
    }

    // CREDIT: "credit", "lent", "borrowed", "due"
    if (input.includes('credit') || input.includes('lent') || input.includes('borrowed') || input.includes('due')) {
        let party = '';
        const partyMatch = input.match(/(?:to|from)\s+([a-zA-Z\s]+?)(?=\s+for|\s+on|\s+cash|\s+upi|$)/i);
        if (partyMatch) party = partyMatch[1].trim();

        const creditType = (input.includes('borrowed') || input.includes('received credit from')) ? 'taken' : 'given';

        return {
            type: 'credit',
            amount,
            party: party || 'Unknown',
            creditType,
            paymentMethod
        };
    }

    return null;
};

export const parseReceiptText = (text: string): Partial<ParsedTransaction> => {
    const lines = text.split('\n');
    let amount = 0;
    let category = 'other';
    let date = new Date().toISOString().split('T')[0];
    let note = '';

    // 1. Find Amount (Look for "Total", "Net", "Amt", or just large numbers)
    // We look for patterns like "Total: 500" or just "500.00"
    const amountRegex = /(?:total|net|sum|amount|amt|paid|due)[\s:]*([0-9.,]+)/i;
    const allAmounts: number[] = [];

    // Extract all numbers that look like currency
    const moneyRegex = /([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/g;
    const moneyMatches = text.match(moneyRegex);
    if (moneyMatches) {
        moneyMatches.forEach(m => {
            const val = parseFloat(m.replace(/,/g, ''));
            if (!isNaN(val)) allAmounts.push(val);
        });
    }

    // Heuristic: The largest number is often the total
    if (allAmounts.length > 0) {
        amount = Math.max(...allAmounts);
    }

    // 2. Identify Category
    const textLower = text.toLowerCase();
    if (textLower.includes('petrol') || textLower.includes('fuel') || textLower.includes('diesel')) category = 'fuel';
    else if (textLower.includes('hotel') || textLower.includes('restaurant') || textLower.includes('food') || textLower.includes('pizza') || textLower.includes('coffee')) category = 'food';
    else if (textLower.includes('taxi') || textLower.includes('uber') || textLower.includes('ola') || textLower.includes('train')) category = 'transport';
    else if (textLower.includes('bill') || textLower.includes('electricity') || textLower.includes('water')) category = 'utilities';
    else if (textLower.includes('medical') || textLower.includes('hospital') || textLower.includes('pharmacy')) category = 'health';
    else if (textLower.includes('amazon') || textLower.includes('flipkart') || textLower.includes('store') || textLower.includes('mart')) category = 'shopping';

    // 3. Extract Date
    const dateRegex = /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/;
    const dateMatch = text.match(dateRegex);
    if (dateMatch) {
        // Simple normalization (not perfect but helpful)
        const d = dateMatch[0].replace(/\//g, '-');
        // Try to convert to YYYY-MM-DD
        const parts = d.split('-');
        if (parts.length === 3) {
            if (parts[2].length === 2) parts[2] = '20' + parts[2];
            // Handle DD-MM-YYYY or MM-DD-YYYY depends on region, we'll store as is if valid
            date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
    }

    // 4. Note (Try to find a store name on the first few lines)
    if (lines.length > 0) {
        note = lines[0].trim().substring(0, 30);
    }

    return { amount, category, date, note, type: 'expense' };
};
