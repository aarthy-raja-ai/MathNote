
/**
 * Evaluates basic math expressions safely.
 * Supports: +, -, *, /, and parens.
 */
export const evaluateMath = (expression: string): number | null => {
    // Remove all whitespace
    const cleanExpr = expression.replace(/\s+/g, '');

    // Only allow numbers and basic math operators
    if (!/^[0-9+\-*/().]+$/.test(cleanExpr)) return null;

    try {
        // Use Function constructor as a safer alternative to eval for simple math
        // We've already sanitized the input above to only allow math chars
        const result = new Function(`return ${cleanExpr}`)();
        return isFinite(result) ? Number(result) : null;
    } catch (e) {
        return null;
    }
};

/**
 * Enhanced NLP Parser with Math Support
 */
export const parseAmountWithMath = (text: string): number | null => {
    // Look for expressions like "50*3 + 100" or just "500"
    const mathMatch = text.match(/([0-9+\-*/().\s]{2,})/);
    if (!mathMatch) {
        const simpleMatch = text.match(/(\d+)/);
        return simpleMatch ? parseFloat(simpleMatch[0]) : null;
    }

    const result = evaluateMath(mathMatch[0]);
    if (result !== null) return result;

    const simpleMatch = text.match(/(\d+)/);
    return simpleMatch ? parseFloat(simpleMatch[0]) : null;
};
