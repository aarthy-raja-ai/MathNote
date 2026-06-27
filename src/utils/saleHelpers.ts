import { Sale } from './storage';

/**
 * Consistently extracts the display amount for a sale.
 * Handles legacy data formats where different fields may be populated.
 */
export const getSaleAmount = (sale: Sale): number => {
    return sale.paidAmount ?? sale.totalAmount ?? 0;
};

/**
 * Gets the full invoice value for a sale (before considering partial payments).
 */
export const getSaleTotal = (sale: Sale): number => {
    return sale.totalAmount ?? 0;
};
