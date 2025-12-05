
type Statement = {
    date?: string;
    [key: string]: any;
};

/**
 * Calculates Trailing Twelve Months (TTM) sum for a given key from a list of quarterly statements.
 * Sorts by date (newest first) and sums the latest 4 quarters.
 */
export function calcTTM(
    statements: any[] | undefined,
    key: string,
    maxQuarters = 4
): number | null {
    if (!statements || statements.length === 0) return null;

    // Sort newest first
    const sorted = [...statements].sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return db - da;
    });

    const slice = sorted.slice(0, maxQuarters);

    // If we have fewer than 4 quarters, should we return null or partial sum?
    // Usually for TTM we want 4 quarters. If we have less, it's not a full year.
    // But for young companies we might want what we have. 
    // The prompt implies just summing what we have in the slice.

    const total = slice.reduce((sum, s) => {
        const raw = s[key];
        const val = typeof raw === "number" ? raw : Number(raw ?? 0);
        return sum + (isNaN(val) ? 0 : val);
    }, 0);

    return total;
}
