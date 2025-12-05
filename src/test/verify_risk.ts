import { calculateRiskFlags } from '../../services/scoring/riskFlags';
import { IncomeStatement, BalanceSheet, CashFlowStatement } from '../../types';

// Mock Data Helpers
const createIncome = (netIncome: number, revenue: number): IncomeStatement => ({
    date: '2025-01-01', symbol: 'TEST',
    revenue, grossProfit: revenue * 0.5, grossProfitRatio: 0.5,
    operatingIncome: netIncome, operatingIncomeRatio: netIncome / revenue,
    netIncome, netIncomeRatio: netIncome / revenue,
    ebitda: netIncome, ebitdaratio: 0, eps: 1, epsdiluted: 1,
    weightedAverageShsOut: 100, weightedAverageShsOutDil: 100
});

const createBalance = (cash: number, debt: number): BalanceSheet => ({
    date: '2025-01-01', symbol: 'TEST',
    cashAndCashEquivalents: cash, shortTermInvestments: 0,
    totalCurrentAssets: cash * 2, totalAssets: cash * 5,
    totalCurrentLiabilities: debt, totalLiabilities: debt,
    totalStockholdersEquity: cash * 4, retainedEarnings: 0,
    totalDebt: debt, netDebt: debt - cash
});

const createCashFlow = (ocf: number, capex: number): CashFlowStatement => ({
    date: '2025-01-01', symbol: 'TEST',
    operatingCashFlow: ocf, capitalExpenditure: capex,
    freeCashFlow: ocf + capex, stockBasedCompensation: 0
});

// Scenario 1: Safe Company (Profitable, Cash Rich, Positive FCF)
const safeIncome = Array(5).fill(createIncome(100, 1000));
const safeBalance = Array(5).fill(createBalance(500, 100));
const safeCashFlow = Array(5).fill(createCashFlow(150, -50)); // FCF = 100

const riskSafe = calculateRiskFlags(safeIncome, safeBalance, safeCashFlow, 10000, 2);
console.log('--- Scenario 1: Safe ---');
console.log('Disqualified:', riskSafe.disqualified);
console.log('Runway:', riskSafe.cashRunwayQuarters);
console.log('QoE Status:', riskSafe.qualityOfEarnings);
console.log('Reasons:', riskSafe.disqualifyReasons);

// Scenario 2: Low Runway (Burning Cash, Low Cash)
// Burn = -(OCF - CapEx) = -(-50 - (-10)) = 40 per quarter
// Cash = 100. Runway = 2.5 quarters. Should Disqualify (< 4).
const riskyIncome = Array(5).fill(createIncome(-20, 100));
const riskyBalance = Array(5).fill(createBalance(100, 50));
const riskyCashFlow = Array(5).fill(createCashFlow(-50, -10));

const riskRunway = calculateRiskFlags(riskyIncome, riskyBalance, riskyCashFlow, 1000, 5);
console.log('\n--- Scenario 2: Low Runway ---');
console.log('Disqualified:', riskRunway.disqualified);
console.log('Runway:', riskRunway.cashRunwayQuarters);
console.log('Reasons:', riskRunway.disqualifyReasons);

// Scenario 3: Quality of Earnings Fail (Net Income > 0, OCF < 0)
const qoeIncome = Array(8).fill(createIncome(50, 1000)); // Profitable
const qoeBalance = Array(8).fill(createBalance(1000, 100));
const qoeCashFlow = Array(8).fill(createCashFlow(-20, -10)); // Negative OCF

const riskQoE = calculateRiskFlags(qoeIncome, qoeBalance, qoeCashFlow, 5000, 2);
console.log('\n--- Scenario 3: QoE Fail ---');
console.log('Disqualified:', riskQoE.disqualified);
console.log('QoE Status:', riskQoE.qualityOfEarnings);
console.log('Consecutive Negative:', riskQoE.consecutiveNegativeFcfQuarters);
console.log('Reasons:', riskQoE.disqualifyReasons);
