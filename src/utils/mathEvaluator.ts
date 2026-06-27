
/**
 * Evaluates basic math expressions safely using a recursive descent parser.
 * Supports: +, -, *, /, and parentheses.
 * No eval() or new Function() — fully safe from code injection.
 */
export const evaluateMath = (expression: string): number | null => {
    // Remove all whitespace
    const cleanExpr = expression.replace(/\s+/g, '');

    // Only allow numbers and basic math operators
    if (!/^[0-9+\-*/().]+$/.test(cleanExpr)) return null;

    try {
        let pos = 0;

        const peek = (): string => cleanExpr[pos] || '';
        const consume = (): string => cleanExpr[pos++];

        // Grammar: expr -> term (('+' | '-') term)*
        const parseExpr = (): number => {
            let result = parseTerm();
            while (peek() === '+' || peek() === '-') {
                const op = consume();
                const right = parseTerm();
                result = op === '+' ? result + right : result - right;
            }
            return result;
        };

        // term -> factor (('*' | '/') factor)*
        const parseTerm = (): number => {
            let result = parseFactor();
            while (peek() === '*' || peek() === '/') {
                const op = consume();
                const right = parseFactor();
                result = op === '*' ? result * right : result / right;
            }
            return result;
        };

        // factor -> '(' expr ')' | number
        const parseFactor = (): number => {
            if (peek() === '(') {
                consume(); // '('
                const result = parseExpr();
                if (peek() === ')') consume(); // ')'
                return result;
            }
            // Parse number (including decimals)
            let numStr = '';
            while (/[0-9.]/.test(peek())) {
                numStr += consume();
            }
            if (numStr === '') throw new Error('Expected number');
            return parseFloat(numStr);
        };

        const result = parseExpr();
        // Ensure we consumed the entire expression
        if (pos !== cleanExpr.length) return null;
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

