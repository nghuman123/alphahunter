import { FundamentalData, MultiBaggerScore, PillarScore } from '../../src/types/scoring';
import { SectorType } from '../../types';

// ============================================================================
// 1. CONFIGURATION (Sector Thresholds)
// ============================================================================

interface SectorConfig {
    grossMarginTop: number;
    grossMarginMid: number;
    roicTop: number;
    roicMid: number;
}

export const SECTOR_THRESHOLDS: Record<SectorType, SectorConfig> = {
    SaaS: { grossMarginTop: 75, grossMarginMid: 60, roicTop: 20, roicMid: 12 },
    Biotech: { grossMarginTop: 85, grossMarginMid: 70, roicTop: 15, roicMid: 8 }, // High margins if commercial
    SpaceTech: { grossMarginTop: 40, grossMarginMid: 25, roicTop: 15, roicMid: 8 },
    Quantum: { grossMarginTop: 50, grossMarginMid: 30, roicTop: 15, roicMid: 8 },
    Hardware: { grossMarginTop: 45, grossMarginMid: 30, roicTop: 15, roicMid: 8 },
    FinTech: { grossMarginTop: 60, grossMarginMid: 45, roicTop: 18, roicMid: 10 },
    Consumer: { grossMarginTop: 50, grossMarginMid: 35, roicTop: 15, roicMid: 8 },
    Industrial: { grossMarginTop: 35, grossMarginMid: 20, roicTop: 12, roicMid: 6 },
    Other: { grossMarginTop: 50, grossMarginMid: 30, roicTop: 15, roicMid: 8 },
};

// ============================================================================
// 2. PILLAR IMPLEMENTATIONS
// ============================================================================

// --- Pillar A: Growth & TAM (35 pts) ---
function scoreGrowthAndTAM(data: FundamentalData): PillarScore {
    let score = 0;
    const details: string[] = [];

    // A1. 3-Year Revenue CAGR (15 pts)
    // We need to calculate CAGR from revenueHistory. 
    // Assuming revenueHistory is sorted descending by date (newest first).
    // Ideally we want 3 years (12 quarters) of data.
    const history = data.revenueHistory;
    let cagr = 0;

    if (history.length >= 5) { // Need at least start and end points spanning ~1 year to estimate
        // Simple CAGR estimation if we have enough data points.
        // Let's use the oldest available data point up to 3 years back.
        const latest = history[0].value;
        const oldestIndex = Math.min(history.length - 1, 12); // Max 12 quarters (3 years)
        const oldest = history[oldestIndex].value;
        const years = oldestIndex / 4;

        if (oldest > 0 && years > 0) {
            cagr = (Math.pow(latest / oldest, 1 / years) - 1) * 100;
        }
    }

    let cagrScore = 0;
    if (cagr >= 40) cagrScore = 15;
    else if (cagr >= 25) cagrScore = 12;
    else if (cagr >= 15) cagrScore = 8;
    else if (cagr >= 10) cagrScore = 4;

    score += cagrScore;
    details.push(`Revenue CAGR (~${cagr.toFixed(1)}%): +${cagrScore}/15`);

    // A2. Growth Acceleration (10 pts)
    // Compare YoY growth of recent quarters.
    // Need at least 5 quarters to calculate YoY for the last 1 quarter.
    // To check acceleration over 3 quarters, we need ~7-8 quarters of history.
    let accelerationScore = 5; // Default to Flat/Mixed
    let accelStatus = 'Flat/Mixed';

    if (history.length >= 8) {
        const getYoY = (offset: number) => {
            const current = history[offset].value;
            const yearAgo = history[offset + 4].value;
            return yearAgo > 0 ? ((current - yearAgo) / yearAgo) * 100 : 0;
        };

        const q1 = getYoY(0); // Most recent
        const q2 = getYoY(1);
        const q3 = getYoY(2);

        if (q1 > q2 && q2 > q3) {
            accelerationScore = 10;
            accelStatus = 'Accelerating';
        } else if (q1 < q2 && q2 < q3) {
            accelerationScore = 0;
            accelStatus = 'Decelerating';
        }
    } else {
        details.push('Insufficient history for acceleration check (Defaulting to Mixed)');
    }

    score += accelerationScore;
    details.push(`Growth Trend (${accelStatus}): +${accelerationScore}/10`);

    // A3. TAM Penetration (10 pts)
    let tamScore = 0;
    switch (data.tamPenetration) {
        case '1-5%': tamScore = 10; break;
        case '<1%': tamScore = 6; break;
        case '5-10%': tamScore = 6; break;
        case '>10%': tamScore = 2; break;
    }
    score += tamScore;
    details.push(`TAM Penetration (${data.tamPenetration}): +${tamScore}/10`);

    return { score, maxScore: 35, details };
}

// --- Pillar B: Unit Economics (25 pts) ---
function scoreUnitEconomics(data: FundamentalData): PillarScore {
    let score = 0;
    const details: string[] = [];
    const config = SECTOR_THRESHOLDS[data.sector] || SECTOR_THRESHOLDS.Other;

    // B1. Gross Margin Level (10 pts)
    let gmScore = 0;
    const gm = data.grossMargin ?? 0;
    if (gm >= config.grossMarginTop) gmScore = 10;
    else if (gm >= config.grossMarginMid) gmScore = 5;

    score += gmScore;
    details.push(`Gross Margin (${gm.toFixed(1)}% vs Top ${config.grossMarginTop}%): +${gmScore}/10`);

    // B2. Gross Margin Trend (5 pts)
    let gmTrendScore = 0;
    if (data.grossMarginTrend === 'Expanding') gmTrendScore = 5;
    else if (data.grossMarginTrend === 'Stable') gmTrendScore = 2;

    score += gmTrendScore;
    details.push(`GM Trend (${data.grossMarginTrend}): +${gmTrendScore}/5`);

    // B3. Revenue Quality (5 pts)
    let revQualScore = 0;
    switch (data.revenueType) {
        case 'Recurring': revQualScore = 5; break;
        case 'Consumable': revQualScore = 4; break;
        case 'Transactional': revQualScore = 3; break; // "Regular but discretionary" mapped to Transactional
        case 'One-time': revQualScore = 1; break;
        case 'Project-based': revQualScore = 0; break;
    }
    score += revQualScore;
    details.push(`Revenue Type (${data.revenueType}): +${revQualScore}/5`);

    // B4. ROIC / Capital Efficiency (5 pts)
    let roicScore = 0;
    if (data.isProfitable && data.roic !== null) {
        // Profitable path
        if (data.roic > config.roicTop) roicScore = 5;
        else if (data.roic >= config.roicMid) roicScore = 3;
        details.push(`ROIC (${data.roic.toFixed(1)}%): +${roicScore}/5`);
    } else {
        // Pre-profit path (Gross Margin + Revenue Growth proxy)
        // Pre-profit path (Gross Margin + Revenue Growth proxy)
        // Need revenue growth. Using forecast or recent CAGR.
        const growth = data.revenueGrowthForecast; // Using forecast as proxy for current growth trajectory
        const gm = data.grossMargin ?? 0;
        if (gm > 60 && growth > 30) roicScore = 4;
        else if (gm > 50 && growth > 20) roicScore = 2;
        details.push(`Capital Efficiency (Pre-profit Proxy: GM ${gm.toFixed(0)}% / Growth ${growth.toFixed(0)}%): +${roicScore}/5`);
    }
    score += roicScore;

    return { score, maxScore: 25, details };
}

// --- Pillar C: Alignment (20 pts) ---
function scoreAlignment(data: FundamentalData): PillarScore {
    let score = 0;
    const details: string[] = [];

    // C1. Founder/Insider Ownership (10 pts)
    let insiderScore = 0;
    if (data.founderLed) {
        if (data.insiderOwnershipPct > 10) insiderScore = 10; // Relaxed from 15
        else if (data.insiderOwnershipPct >= 3) insiderScore = 7; // Relaxed from 5
        else if (data.insiderOwnershipPct >= 0.5) insiderScore = 3; // Relaxed from 1
    } else {
        // Non-founder led
        if (data.insiderOwnershipPct > 10) insiderScore = 5;
        else if (data.insiderOwnershipPct >= 3) insiderScore = 3;
        else if (data.insiderOwnershipPct >= 0.5) insiderScore = 1;
    }
    score += insiderScore;
    details.push(`Insider Ownership (${data.insiderOwnershipPct.toFixed(1)}%, Founder: ${data.founderLed}): +${insiderScore}/10`);

    // C2. Insider Buying (5 pts)
    let buyingScore = 0;
    if (data.netInsiderBuying === 'Buying') buyingScore = 5;
    else if (data.netInsiderBuying === 'Neutral') buyingScore = 2;
    score += buyingScore;
    details.push(`Insider Activity (${data.netInsiderBuying}): +${buyingScore}/5`);

    // C3. Institutional Ownership (5 pts)
    let instScore = 0;
    const inst = data.institutionalOwnershipPct;
    if (inst >= 30 && inst <= 85) instScore = 5; // Relaxed upper bound from 70
    else if (inst > 85) instScore = 3;
    else if (inst < 30) instScore = 2;
    score += instScore;
    details.push(`Institutional Ownership (${inst.toFixed(1)}%): +${instScore}/5`);

    return { score, maxScore: 20, details };
}

// --- Pillar D: Valuation (10 pts) ---
function scoreValuation(data: FundamentalData): PillarScore {
    let score = 0;
    const details: string[] = [];

    // D1. PSG Ratio (5 pts)
    // PSG = P/S / Growth
    let psg = 0;
    if (data.revenueGrowthForecast > 0) {
        psg = data.psRatio / data.revenueGrowthForecast;
    } else if (data.revenueHistory.length >= 5) {
        // Fallback to historical CAGR if forecast missing
        // Re-calculate CAGR locally or pass it in?
        // Let's assume forecast is populated or 0.
        // If 0, try to use a proxy?
        // Let's just stick to logic: if 0, psg is 0/undefined.
    }

    let psgScore = 0;
    if (psg > 0) {
        if (psg < 0.5) psgScore = 5;
        else if (psg <= 1.0) psgScore = 4;
        else if (psg <= 2.0) psgScore = 2; // Relaxed from 1.5
    }
    score += psgScore;
    details.push(`PSG Ratio (${psg.toFixed(2)}): +${psgScore}/5`);

    // D2. Valuation Trend (5 pts)
    let valTrendScore = 2; // Default Neutral
    if (data.peRatio && data.forwardPeRatio && data.peRatio > 0 && data.forwardPeRatio > 0) {
        const ratio = data.peRatio / data.forwardPeRatio;
        if (ratio > 1.1) valTrendScore = 5; // Relaxed from 1.2
        else if (ratio >= 1.0) valTrendScore = 3;
        else valTrendScore = 0;
        details.push(`P/E Trend (Trailing ${data.peRatio.toFixed(1)} / Fwd ${data.forwardPeRatio.toFixed(1)} = ${ratio.toFixed(2)}): +${valTrendScore}/5`);
    } else {
        // Pre-profit / No P/E -> Neutral (2 pts)
        details.push('P/E Not Meaningful (Default Neutral): +2/5');
    }
    score += valTrendScore;

    return { score, maxScore: 10, details };
}

// --- Pillar E: Catalysts (10 pts) ---
function scoreCatalysts(data: FundamentalData): PillarScore {
    let score = 0;
    const details: string[] = [];

    // E1. Catalyst Density (5 pts)
    let catScore = 0;
    if (data.catalystDensity === 'High') catScore = 5;
    else if (data.catalystDensity === 'Medium') catScore = 3;
    score += catScore;
    details.push(`Catalyst Density (${data.catalystDensity}): +${catScore}/5`);

    // E2. Asymmetry / Optionality (5 pts)
    let asymScore = 0;
    if (data.asymmetryScore === 'High') asymScore = 5;
    else if (data.asymmetryScore === 'Medium') asymScore = 3;

    // Pricing Power adjustment (boost within pillar, but capped)
    if (data.pricingPower === 'Strong') {
        asymScore = Math.min(asymScore + 1, 5); // Small boost
        details.push('Pricing Power Boost: +1');
    } else if (data.pricingPower === 'Weak') {
        asymScore = Math.max(asymScore - 1, 0);
        details.push('Pricing Power Penalty: -1');
    }

    score += asymScore;
    details.push(`Asymmetry (${data.asymmetryScore}): +${asymScore}/5`);

    return { score, maxScore: 10, details };
}

// ============================================================================
// 3. MAIN FUNCTION
// ============================================================================

/**
 * Computes the MultiBaggerScore based on the 5 pillars defined in STRATEGY_PRINCIPLES.md.
 * 
 * Usage:
 * ```ts
 * const score = computeMultiBaggerScore(fundamentalData);
 * console.log(score.totalScore, score.tier);
 * ```
 */
export function computeMultiBaggerScore(data: FundamentalData): MultiBaggerScore {
    const growth = scoreGrowthAndTAM(data);
    const economics = scoreUnitEconomics(data);
    const alignment = scoreAlignment(data);
    const valuation = scoreValuation(data);
    const catalysts = scoreCatalysts(data);

    let totalScore = growth.score + economics.score + alignment.score + valuation.score + catalysts.score;

    // --- QUALITY + GROWTH BONUS ---
    // Reward elite compounders that might be expensive or have low insider % due to size.

    // 1. Capital Efficiency Bonus (Target: AAPL, MSFT)
    // High ROE, High FCF Margin, Positive Growth
    let capitalEfficiencyBonus = 0;
    const isCapitalEfficient = (data.roe >= 0.35) && (data.fcfMargin >= 0.25) && (data.revenueGrowth >= 0.05);

    if (isCapitalEfficient) {
        capitalEfficiencyBonus = 15;
        totalScore += capitalEfficiencyBonus;
        console.log(`[CapitalEfficiency] ${data.ticker}: ROE=${data.roe.toFixed(2)}, FCF=${data.fcfMargin.toFixed(2)}, Growth=${data.revenueGrowth.toFixed(2)} -> BONUS APPLIED`);
    } else {
        console.log(`[CapitalEfficiency] ${data.ticker}: ROE=${data.roe.toFixed(2)}, FCF=${data.fcfMargin.toFixed(2)}, Growth=${data.revenueGrowth.toFixed(2)} -> No Bonus`);
    }

    // 2. SaaS/Cloud Compounder Bonus (Target: DDOG, ZS, CRWD, SNOW)
    // Deterministic check: High CAGR, High Recent Growth, High Gross Margin
    let saasBonus = 0;
    // Extract CAGR from growth pillar details or recalculate? 
    // Let's recalculate locally to be safe and deterministic.
    let cagr3y = 0;
    if (data.revenueHistory.length >= 5) {
        const latest = data.revenueHistory[0].value;
        const oldestIndex = Math.min(data.revenueHistory.length - 1, 12);
        const oldest = data.revenueHistory[oldestIndex].value;
        const years = oldestIndex / 4;
        if (oldest > 0 && years > 0) {
            cagr3y = (Math.pow(latest / oldest, 1 / years) - 1) * 100;
        }
    }

    const gm = data.grossMargin ?? 0;
    const isSaasCompounder = (cagr3y >= 25) && (data.revenueGrowth * 100 >= 20) && (gm >= 70);

    if (isSaasCompounder) {
        saasBonus = 20;
        totalScore += saasBonus;
        console.log(`[GrowthBonus] ${data.ticker}: CAGR3y=${cagr3y.toFixed(1)}%, LastGrowth=${(data.revenueGrowth * 100).toFixed(1)}%, GM=${gm.toFixed(1)}% -> BONUS APPLIED`);
    } else {
        // Debug for key SaaS names
        const debugSaas = ['DDOG', 'ZS', 'CRWD', 'SNOW', 'SHOP'].includes(data.ticker);
        if (debugSaas) {
            console.log(`[GrowthBonus] ${data.ticker}: CAGR3y=${cagr3y.toFixed(1)}%, LastGrowth=${(data.revenueGrowth * 100).toFixed(1)}%, GM=${gm.toFixed(1)}% -> No Bonus`);
        }
    }

    // Legacy Quality Bonus (Keep small or remove if redundant? keeping small for now as backup)
    let qualityBonus = 0;
    const isHighQuality = (data.roic && data.roic > 15) || (gm > 60);
    const isHighGrowth = (growth.score >= 8);

    if (data.isProfitable && isHighQuality && isHighGrowth && !isCapitalEfficient && !isSaasCompounder) {
        // Only apply if not already boosted by the big bonuses
        qualityBonus = 5;
        totalScore += qualityBonus;
    }

    // Cap at 100
    totalScore = Math.min(totalScore, 100);

    let tier: MultiBaggerScore['tier'] = 'Not Interesting';
    if (totalScore >= 80) tier = 'Tier 1'; // Relaxed from 85
    else if (totalScore >= 65) tier = 'Tier 2'; // Relaxed from 70
    else if (totalScore >= 55) tier = 'Tier 3';

    const summary = `
    Total Score: ${totalScore}/100 (${tier}) [CapEff: +${capitalEfficiencyBonus}, SaaS: +${saasBonus}, Qual: +${qualityBonus}]
    ----------------------------------------
    A. Growth & TAM: ${growth.score}/35
    B. Economics:    ${economics.score}/25
    C. Alignment:    ${alignment.score}/20
    D. Valuation:    ${valuation.score}/10
    E. Catalysts:    ${catalysts.score}/10
  `.trim();

    return {
        totalScore,
        tier,
        pillars: {
            growth,
            economics,
            alignment,
            valuation,
            catalysts
        },
        summary
    };
}
