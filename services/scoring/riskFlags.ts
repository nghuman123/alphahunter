
/**
 * Risk Flag / Kill Switch Calculator
 * Calculates Beneish M-Score, Altman Z-Score, dilution rate
 * Auto-disqualifies stocks that fail safety checks
 */

import type { IncomeStatement, BalanceSheet, CashFlowStatement, RiskFlags } from '../../types';

/**
 * Beneish M-Score Components
 * Score > -1.78 indicates high probability of earnings manipulation
 */
const calculateBeneishMScore = (
  currentIncome: IncomeStatement,
  priorIncome: IncomeStatement,
  currentBalance: BalanceSheet,
  priorBalance: BalanceSheet
): number => {

  // Safely handle division
  const safeDivide = (a: number, b: number) => b === 0 ? 0 : a / b;

  // DSRI: Days Sales in Receivables Index
  // (Receivables_t / Sales_t) / (Receivables_t-1 / Sales_t-1)
  // FMP doesn't provide receivables directly, estimate from current assets
  const dsri = 1.0; // Simplified - would need receivables data

  // GMI: Gross Margin Index
  const gm_prior = priorIncome.grossProfitRatio || 0;
  const gm_current = currentIncome.grossProfitRatio || 0;
  const gmi = gm_prior > 0 ? safeDivide(gm_prior, gm_current) : 1.0;

  // AQI: Asset Quality Index
  const aqi = 1.0; // Simplified

  // SGI: Sales Growth Index
  const sgi = safeDivide(currentIncome.revenue, priorIncome.revenue);

  // DEPI: Depreciation Index
  const depi = 1.0; // Simplified

  // SGAI: SG&A Index
  const sgai = 1.0; // Simplified

  // TATA: Total Accruals to Total Assets
  const tata = safeDivide(
    (currentIncome.netIncome - (currentBalance.cashAndCashEquivalents - priorBalance.cashAndCashEquivalents)),
    currentBalance.totalAssets
  );

  // LVGI: Leverage Index
  const leverage_current = safeDivide(currentBalance.totalLiabilities, currentBalance.totalAssets);
  const leverage_prior = safeDivide(priorBalance.totalLiabilities, priorBalance.totalAssets);
  const lvgi = leverage_prior > 0 ? safeDivide(leverage_current, leverage_prior) : 1.0;

  // M-Score Formula
  const mScore = -4.84
    + (0.92 * dsri)
    + (0.528 * gmi)
    + (0.404 * aqi)
    + (0.892 * sgi)
    + (0.115 * depi)
    - (0.172 * sgai)
    + (4.679 * tata)
    - (0.327 * lvgi);

  return mScore;
};

/**
 * Altman Z-Score for bankruptcy risk
 * Z > 2.99: Safe
 * 1.81 < Z < 2.99: Grey zone
 * Z < 1.81: Distress
 */
const calculateAltmanZScore = (
  income: IncomeStatement,
  balance: BalanceSheet,
  marketCap: number
): number => {

  const safeDivide = (a: number, b: number) => b === 0 ? 0 : a / b;

  const totalAssets = balance.totalAssets || 1;

  // X1: Working Capital / Total Assets
  const workingCapital = balance.totalCurrentAssets - balance.totalCurrentLiabilities;
  const x1 = safeDivide(workingCapital, totalAssets);

  // X2: Retained Earnings / Total Assets
  const x2 = safeDivide(balance.retainedEarnings, totalAssets);

  // X3: EBIT / Total Assets
  const x3 = safeDivide(income.operatingIncome, totalAssets);

  // X4: Market Cap / Total Liabilities
  const x4 = safeDivide(marketCap, balance.totalLiabilities || 1);

  // X5: Sales / Total Assets
  const x5 = safeDivide(income.revenue, totalAssets);

  // Z-Score formula
  const zScore = (1.2 * x1) + (1.4 * x2) + (3.3 * x3) + (0.6 * x4) + (1.0 * x5);

  return zScore;
};

/**
 * Evaluate Altman Z-Score with Market Cap context
 * Hard kill only for small/mid caps (<$20B) with negative Z-Score
 */
const evaluateAltmanZ = (
  altmanZScore: number,
  marketCap: number,
  addWarning: (msg: string) => void,
  hardKill: (msg: string) => void
) => {
  const isSmallOrMidCap = marketCap < 20_000_000_000; // 20B cutoff
  if (altmanZScore < 0) {
    console.log(`[RiskDebug] Altman Check: Z=${altmanZScore}, Cap=${marketCap}, IsSmall=${isSmallOrMidCap}`);
  }

  // HARD KILL only if Altman < 0 AND small/mid cap
  if (altmanZScore < 0 && isSmallOrMidCap) {
    hardKill(`Altman Z-Score ${altmanZScore.toFixed(2)} < 0 (severe distress)`);
    return;
  }

  // Otherwise treat as a warning
  if (altmanZScore < 1.8) {
    addWarning(`Altman Z-Score ${altmanZScore.toFixed(2)} < 1.8 (distress zone)`);
  }
};

/**
 * Calculate dilution rate (YoY share count increase)
 */
const calculateDilutionRate = (
  currentIncome: IncomeStatement,
  priorYearIncome: IncomeStatement
): number => {
  const currentShares = currentIncome.weightedAverageShsOutDil || 0;
  const priorShares = priorYearIncome.weightedAverageShsOutDil || 0;

  if (priorShares === 0) return 0;

  return ((currentShares - priorShares) / priorShares) * 100;
};

/**
 * Calculate cash runway in quarters
 * Formula: (Cash + ST Investments) / Avg Quarterly Burn
 * Burn = -(OCF - CapEx)
 */
const calculateCashRunway = (
  balance: BalanceSheet,
  cashFlows: CashFlowStatement[]
): number => {
  const cash = (balance.cashAndCashEquivalents || 0) + (balance.shortTermInvestments || 0);

  // Need at least 1 quarter of cash flow to estimate, ideally 4
  if (cashFlows.length === 0) return 0; // Unknown/Risk

  // Calculate burn for last 4 quarters (or fewer if not available)
  const quarters = Math.min(cashFlows.length, 4);
  let totalBurn = 0;
  let positiveFCFCount = 0;

  for (let i = 0; i < quarters; i++) {
    const cf = cashFlows[i];
    // Free Cash Flow = OCF - CapEx (CapEx is usually negative in FMP, so OCF + CapEx? No, FMP CapEx is negative number usually. Let's check formula: OCF - CapEx. If CapEx is negative, it's OCF - (-CapEx) = OCF + CapEx. Wait.
    // FMP: capitalExpenditure is usually negative (cash outflow).
    // FreeCashFlow = operatingCashFlow + capitalExpenditure.
    // Let's use the provided freeCashFlow field if available, or calc it.
    const fcf = cf.freeCashFlow;

    if (fcf > 0) {
      positiveFCFCount++;
    } else {
      totalBurn += Math.abs(fcf); // Burn is the negative FCF
    }
  }

  // If consistently positive FCF (e.g. 3 out of 4 quarters), treat as infinite runway
  if (positiveFCFCount >= 3) return 999;

  const avgBurn = totalBurn / (quarters - positiveFCFCount); // Average burn of burning quarters? Or average over all?
  // Strategy says: "Average of last 4 quarters of [-(Operating Cash Flow - CapEx)]"
  // If sum is positive (net generator), then infinite.

  let netFCF = 0;
  for (let i = 0; i < quarters; i++) {
    netFCF += cashFlows[i].freeCashFlow;
  }
  const avgFCF = netFCF / quarters;

  if (avgFCF >= 0) return 999; // Self-funding on average

  const burnRate = Math.abs(avgFCF);
  if (burnRate === 0) return 999;

  return cash / burnRate;
};

/**
 * Quality of Earnings (FCF vs Net Income)
 * Flag if Net Income > 0 but OCF < 0 (or much lower) for >= 2 years
 */
const calculateQualityOfEarnings = (
  incomes: IncomeStatement[],
  cashFlows: CashFlowStatement[]
): { status: 'Pass' | 'Fail' | 'Warn'; consecutiveNegative: number; conversionRatio: number } => {

  if (incomes.length < 4 || cashFlows.length < 4) {
    return { status: 'Warn', consecutiveNegative: 0, conversionRatio: 1 };
  }

  let consecutiveDivergence = 0;
  const periods = Math.min(incomes.length, cashFlows.length, 8); // Check last 2 years

  for (let i = 0; i < periods; i++) {
    const ni = incomes[i].netIncome;
    const ocf = cashFlows[i].operatingCashFlow;

    // Divergence: NI Positive AND (OCF Negative OR OCF < 0.5 * NI)
    if (ni > 0 && (ocf < 0 || ocf < ni * 0.5)) {
      consecutiveDivergence++;
    } else {
      consecutiveDivergence = 0; // Reset if streak broken? Or just count total? Spec says "for >= 2 consecutive years"
      // If we want consecutive, we should break or track max streak.
      // But loop goes backwards in time (0 is newest).
      // So if 0 and 1 are divergent, that's 2 quarters.
      // We need to check if the *most recent* streak is >= 6 quarters.
    }
  }

  // Re-check logic: "Net Income consistently positive while OCF negative... for >= 2 consecutive years (or >= 6 quarters)"
  // Let's count consecutive from most recent.
  let currentStreak = 0;
  for (let i = 0; i < periods; i++) {
    const ni = incomes[i].netIncome;
    const ocf = cashFlows[i].operatingCashFlow;
    if (ni > 0 && (ocf < 0 || ocf < ni * 0.5)) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Conversion Ratio (TTM)
  const ttmNI = incomes.slice(0, 4).reduce((sum, i) => sum + i.netIncome, 0);
  const ttmFCF = cashFlows.slice(0, 4).reduce((sum, c) => sum + c.freeCashFlow, 0);
  const conversionRatio = ttmNI > 0 ? ttmFCF / ttmNI : 1; // Default to 1 if NI negative (not applicable)

  let status: 'Pass' | 'Fail' | 'Warn' = 'Pass';
  if (currentStreak >= 6) status = 'Fail';
  else if (currentStreak >= 4) status = 'Warn';

  return { status, consecutiveNegative: currentStreak, conversionRatio };
};

// ============ MAIN RISK FUNCTION ============

export const calculateRiskFlags = (
  incomeStatements: IncomeStatement[],
  balanceSheets: BalanceSheet[],
  cashFlowStatements: CashFlowStatement[],
  marketCap: number,
  ttmRevenue: number, // [NEW]
  shortInterestPct: number = 0
): RiskFlags => {

  const hardKillFlags: string[] = [];
  const warningFlags: string[] = [];
  let riskPenalty = 0;

  // Get current and prior periods
  const currentIncome = incomeStatements[0];
  const priorIncome = incomeStatements[4] || incomeStatements[1]; // 1 year ago or prior quarter
  const currentBalance = balanceSheets[0];
  const priorBalance = balanceSheets[4] || balanceSheets[1];

  // Calculate scores
  const beneishMScore = calculateBeneishMScore(currentIncome, priorIncome, currentBalance, priorBalance);
  const altmanZScore = calculateAltmanZScore(currentIncome, currentBalance, marketCap);
  const dilutionRate = calculateDilutionRate(currentIncome, priorIncome);
  const cashRunwayQuarters = calculateCashRunway(currentBalance, cashFlowStatements);
  const qoe = calculateQualityOfEarnings(incomeStatements, cashFlowStatements);

  // Check kill switches & warnings

  // 1. Beneish M-Score (Fraud)
  // Relax for tiny/early-stage companies (< $50M Revenue)
  const isEarlyStage = ttmRevenue < 50_000_000;

  if (beneishMScore > -0.5) {
    if (isEarlyStage) {
      // Soften to warning for early stage
      warningFlags.push(`Beneish M-Score ${beneishMScore.toFixed(2)} > -0.5 (high manipulation risk, but early stage)`);
      riskPenalty -= 10; // Heavy penalty but not kill
      console.log(`[RiskDebug] Beneish: ${beneishMScore} (WARNING - Early Stage, Rev $${(ttmRevenue / 1e6).toFixed(1)}M)`);
    } else {
      hardKillFlags.push(`Beneish M-Score ${beneishMScore.toFixed(2)} > -0.5 (extreme manipulation risk)`);
      console.log(`[RiskDebug] Beneish: ${beneishMScore} (HARD KILL, Rev $${(ttmRevenue / 1e6).toFixed(1)}M)`);
    }
  } else if (beneishMScore > -1.78) {
    warningFlags.push(`Beneish M-Score ${beneishMScore.toFixed(2)} > -1.78 (possible manipulation)`);
    riskPenalty -= 5;
    console.log(`[RiskDebug] Beneish: ${beneishMScore} (WARNING)`);
  } else {
    console.log(`[RiskDebug] Beneish: ${beneishMScore} (PASS)`);
  }

  // 2. Dilution
  if (dilutionRate > 300) {
    hardKillFlags.push(`Dilution rate ${dilutionRate.toFixed(1)}% > 300% (massive dilution)`);
  } else if (dilutionRate > 25) {
    warningFlags.push(`Dilution rate ${dilutionRate.toFixed(1)}% > 25% (high dilution)`);
    riskPenalty -= 10;
  } else if (dilutionRate > 10) {
    warningFlags.push(`Dilution rate ${dilutionRate.toFixed(1)}% > 10% (moderate dilution)`);
    riskPenalty -= 5;
  }

  // 3. Cash Runway
  if (cashRunwayQuarters < 4 && cashRunwayQuarters !== 999) {
    if (currentIncome.netIncome < 0) {
      if (cashRunwayQuarters < 1) {
        hardKillFlags.push(`Cash runway ${cashRunwayQuarters.toFixed(1)} quarters < 1 (imminent insolvency risk)`);
      } else {
        warningFlags.push(`Cash runway tight: ${cashRunwayQuarters.toFixed(1)} quarters`);
        riskPenalty -= 10;
      }
    } else {
      warningFlags.push(`Cash runway low: ${cashRunwayQuarters.toFixed(1)} quarters`);
      riskPenalty -= 5;
    }
  }

  // 4. Altman Z-Score
  evaluateAltmanZ(
    altmanZScore,
    marketCap,
    (msg) => {
      warningFlags.push(msg);
      riskPenalty -= 5;
    },
    (msg) => hardKillFlags.push(msg)
  );

  // 5. Short Interest
  if (shortInterestPct > 25) {
    warningFlags.push(`Short interest ${shortInterestPct.toFixed(1)}% > 25% (extreme bearish sentiment)`);
    riskPenalty -= 5;
  } else if (shortInterestPct > 15) {
    warningFlags.push(`High Short Interest: ${shortInterestPct.toFixed(1)}%`);
    // No penalty for > 15? Maybe small? Let's leave it as warning.
  }

  // 6. Quality of Earnings
  if (qoe.status === 'Fail') {
    warningFlags.push(`Quality of Earnings Fail: ${qoe.consecutiveNegative} consecutive quarters of divergence`);
    riskPenalty -= 5;
  } else if (qoe.status === 'Warn') {
    warningFlags.push(`Quality of Earnings Warning: ${qoe.consecutiveNegative} consecutive quarters of divergence`);
  }

  const disqualified = hardKillFlags.length > 0;

  return {
    beneishMScore,
    dilutionRate,
    cashRunwayQuarters,
    altmanZScore,
    shortInterestPct,
    disqualified,
    disqualifyReasons: hardKillFlags, // Map hard kills to reasons for backward compat if needed, or just use new fields
    warnings: warningFlags,
    riskPenalty, // New field
    qualityOfEarnings: qoe.status,
    fcfConversionRatio: qoe.conversionRatio,
    consecutiveNegativeFcfQuarters: qoe.consecutiveNegative
  };
};
