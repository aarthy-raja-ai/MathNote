export function getFinancialYear(dateStr: string = new Date().toISOString()): string {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
        return 'Unknown';
    }
    const year = date.getFullYear();
    const month = date.getMonth(); // 0 = Jan, 3 = April
    if (month >= 3) { // April to December
        return `${year}-${(year + 1).toString().slice(-2)}`;
    } else { // January to March
        return `${year - 1}-${year.toString().slice(-2)}`;
    }
}

export function getAvailableFYs(sales: any[], purchases: any[], expenses: any[]): string[] {
    const years = new Set<string>();
    const currentFY = getFinancialYear();
    years.add(currentFY);
    
    const addDate = (dateStr?: string) => {
        if (dateStr) {
            const fy = getFinancialYear(dateStr);
            if (fy !== 'Unknown') {
                years.add(fy);
            }
        }
    };
    
    sales.forEach(s => addDate(s.date));
    purchases.forEach(p => addDate(p.date));
    expenses.forEach(e => addDate(e.date));
    
    // Sort descending
    return Array.from(years).sort((a, b) => b.localeCompare(a));
}

export function getNextSequenceNumber(
    records: any[],
    prefix: string,
    numberKey: string,
    activeFY: string,
    companyId?: string
): string {
    // Active FY is like "2026-27"
    // Short year for prefix: "26-27"
    const shortYear = activeFY.split('-').map(y => y.slice(-2)).join('-');
    const yearPrefix = `${prefix}/${shortYear}/`; // e.g., "INV/26-27/"
    
    const matchingRecords = records.filter(r => 
        r[numberKey] && 
        r[numberKey].startsWith(yearPrefix) &&
        (companyId ? r.companyId === companyId : true)
    );
    
    let maxSeq = 0;
    matchingRecords.forEach(r => {
        const val = r[numberKey];
        const parts = val.split('/');
        const seqStr = parts[parts.length - 1];
        const seq = parseInt(seqStr, 10);
        if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
        }
    });
    
    return `${yearPrefix}${String(maxSeq + 1).padStart(4, '0')}`;
}
