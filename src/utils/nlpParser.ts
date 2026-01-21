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
}

export const parseMagicNote = (text: string): ParsedTransaction | null => {
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
        let party = '';
        // "Sold 500 to Rahul" or "Sold to Rahul 500"
        const partyMatch = input.match(/to\s+([a-zA-Z\s]+?)(?=\s+for|\s+on|\s+cash|\s+upi|$)/i);
        if (partyMatch) party = partyMatch[1].trim();

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
