
/**
 * Valuation Scoring Module
 * 
 * Implements PEG (Price/Earnings to Growth) and PSG (Price/Sales to Growth) scoring.
 * 
 * Philosophy:
 * - Growth is the denominator. High growth justifies higher multiples.
 * - PEG < 1.0 is the gold standard for growth at a reasonable price (GARP).
 * - PSG is a fallback for high-growth companies that are not yet optimized for earnings.
 */

export interface ValuationMetrics {
    pe: number | null;
    ps: number | null;
    revenueCagr3y: number | null; // e.g. 0.25 for 25%
    epsCagr3y?: number | null;
}

function calcGrowthRateForValuation(metrics: {
    revenueCagr3y: number | null;
    epsCagr3y?: number | null;
}): number {
    // Prefer EPS growth if available and positive, as it's the "E" in PEG
    const eps = metrics.epsCagr3y ?? null;
    if (eps && eps > 0) return eps;

    // Fallback to revenue growth
    return metrics.revenueCagr3y ?? 0;
}

export function calcValuationScore(metrics: ValuationMetrics): number {
    // [TASK 3] Safety Valve for Bubble Valuations
    if (metrics.ps && metrics.ps > 50) {
        console.log(`[Valuation] Safety Valve: P/S ${metrics.ps} > 50 -> Score: -10`);
        return -10;
    }

    const growth = calcGrowthRateForValuation(metrics); // 0.20 = 20%

    if (!growth || growth <= 0.05) {
        // No growth / very low growth → multiples are hard to justify
        return -10;
    }

    let score = 0;

    // 1) PEG: P/E divided by Growth Rate (as integer, e.g. 20 for 20%)
    // PEG = PE / (Growth * 100)
    if (metrics.pe && metrics.pe > 0) {
        const peg = metrics.pe / (growth * 100);

        if (peg < 0.5) score += 15;    // “Screaming cheap”
        else if (peg < 1.0) score += 10; // Attractive
        else if (peg < 1.5) score += 5;  // Fair
        else if (peg < 2.0) score += 0;  // Full
        else if (peg < 3.0) score -= 5;  // Expensive
        else score -= 10;                // Very Expensive

        console.log(`[Valuation] PEG=${peg.toFixed(2)} (PE=${metrics.pe}, Growth=${(growth * 100).toFixed(1)}%) -> Score: ${score}`);
        return score;
    }

    // 2) PSG fallback: P/S divided by growth if PE not meaningful
    if ((!metrics.pe || metrics.pe <= 0) && metrics.ps && metrics.ps > 0) {
        const psg = metrics.ps / (growth * 100);

        if (psg < 0.3) score += 10;    // Very attractive
        else if (psg < 0.6) score += 5;
        else if (psg < 1.0) score += 0;
        else if (psg < 1.5) score -= 5;
        else score -= 10;

        console.log(`[Valuation] PSG=${psg.toFixed(2)} (PS=${metrics.ps}, Growth=${(growth * 100).toFixed(1)}%) -> Score: ${score}`);
        return score;
    }

    return 0; // No valid valuation metrics
}
