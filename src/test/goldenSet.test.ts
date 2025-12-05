
import { describe, it, expect, vi } from 'vitest';
import { analyzeStock } from '../../services/analyzer';
import * as fmp from '../../services/api/fmp';
import * as massive from '../../services/api/massive';
import * as gemini from '../../services/ai/gemini';
import { TIER_THRESHOLDS } from '../../config/scoringThresholds';

// Mock dependencies
vi.mock('../../services/api/fmp');
vi.mock('../../services/api/massive');
vi.mock('../../services/ai/gemini');

describe('Golden Set Logic', () => {

    it('should disqualify disasters (WKHS/RIDE) regardless of other scores', async () => {
        // Mock data for a disaster
        vi.mocked(fmp.getCompanyProfile).mockResolvedValue({
            symbol: 'RIDE',
            companyName: 'Lordstown Motors',
            sector: 'Consumer Cyclical',
            industry: 'Auto Manufacturers',
            description: 'EV truck maker',
            ceo: 'Steve Burns',
            ipoDate: '2020-10-26',
            mktCap: 100000000,
            price: 1.5,
            isEtf: false,
            isActivelyTrading: true,
            exchange: 'NASDAQ',
            changes: 0,
            changesPercentage: 0,
            fullTimeEmployees: 100,
            isFund: false
        });
        vi.mocked(fmp.getQuote).mockResolvedValue({
            symbol: 'RIDE',
            price: 1.5,
            marketCap: 100000000,
            pe: null,
            priceToSales: 10,
            yearHigh: 10,
            yearLow: 1,
            changes: 0,
            change: 0,
            changesPercentage: 0,
            dayHigh: 1.6,
            dayLow: 1.4,
            volume: 1000000,
            avgVolume: 1000000,
            eps: -2,
            sharesOutstanding: 100000000
        });
        // Mock financials indicating distress (negative equity, huge losses)
        vi.mocked(fmp.getIncomeStatements).mockResolvedValue([
            {
                date: '2023-12-31', symbol: 'RIDE',
                revenue: 0, netIncome: -100000000,
                grossProfitRatio: -1, operatingIncomeRatio: -1, netIncomeRatio: -1,
                eps: -1, epsdiluted: -1,
                grossProfit: 0, operatingIncome: -50000000, ebitda: -50000000, ebitdaratio: 0,
                weightedAverageShsOut: 100000000, weightedAverageShsOutDil: 100000000
            },
            {
                date: '2022-12-31', symbol: 'RIDE',
                revenue: 0, netIncome: -80000000,
                grossProfitRatio: -1, operatingIncomeRatio: -1, netIncomeRatio: -1,
                eps: -0.8, epsdiluted: -0.8,
                grossProfit: 0, operatingIncome: -40000000, ebitda: -40000000, ebitdaratio: 0,
                weightedAverageShsOut: 100000000, weightedAverageShsOutDil: 100000000
            }
        ]);
        vi.mocked(fmp.getBalanceSheets).mockResolvedValue([
            {
                date: '2023-12-31', symbol: 'RIDE',
                totalAssets: 50000000, totalLiabilities: 100000000, // Negative equity
                totalStockholdersEquity: -50000000,
                cashAndCashEquivalents: 1000000,
                totalCurrentAssets: 2000000, totalCurrentLiabilities: 50000000,
                retainedEarnings: -200000000, totalDebt: 50000000, netDebt: 49000000,
                shortTermInvestments: 0
            },
            {
                date: '2022-12-31', symbol: 'RIDE',
                totalAssets: 60000000, totalLiabilities: 80000000,
                totalStockholdersEquity: -20000000,
                cashAndCashEquivalents: 5000000,
                totalCurrentAssets: 10000000, totalCurrentLiabilities: 40000000,
                retainedEarnings: -100000000, totalDebt: 40000000, netDebt: 35000000,
                shortTermInvestments: 0
            }
        ]);

        // Mock AI to be neutral or even positive (should be ignored)
        vi.mocked(gemini.analyzeAntigravity).mockResolvedValue({
            antigravityScorecard: {
                antigravityVerdict: 'SOFT_PASS',
                suggestedTier: 'Tier 3',
                conviction: 60,
                overallScore: 50,
                qualityScore: 50,
                asymmetryScore: 50,
                timeHorizonYears: 5,
                thesisType: 'speculative'
            },
            summary: { oneLineThesis: 'Risky', category: 'Speculative', confidence: 'low' },
            moatAnalysis: { moatScore: 0, primaryMoatType: 'none', secondaryMoatTypes: [], moatDurability: 'fragile', keyMoatDrivers: [], moatRisks: [] },
            growthAndRunway: { growthScore: 0, coreGrowthDrivers: [], totalAddressableMarket: 'small', reinvestmentOpportunities: 'weak', isWinnerTakeMostMarket: false, growthRisks: [] },
            managementAndCapitalAllocation: { managementScore: 0, isFounderLed: false, insiderOwnershipQuality: 'low', capitalAllocationStyle: 'value_destructive', capitalAllocationNotes: [] },
            riskProfile: { riskScore: 100, keyRisks: [], redFlags: [], downsideScenarios: [] },
            historicalPatternMatch: { patternScore: 0, closestAnalogType: 'bubble', closestPositiveAnalogs: [], closestNegativeAnalogs: [], patternNotes: [] },
            actionableNotes: { bullCase: [], bearCase: [], keyTrackingMetrics: [], whatCouldProveThesisWrong: [] }
        });
        vi.mocked(gemini.analyzeMoatAndThesis).mockResolvedValue({ moat: 'None', thesis: 'None', risks: ['Bankruptcy'] });
        vi.mocked(gemini.analyzeQualitativeFactors).mockResolvedValue({
            tamPenetration: '<1%',
            revenueType: 'Transactional',
            pricingPower: 'Weak',
            catalysts: [], catalystDensity: 'Low', asymmetryScore: 'Low',
            reasoning: 'None'
        });

        const result = await analyzeStock('RIDE');
        expect(result).not.toBeNull();
        if (result) {
            expect(result.riskFlags.disqualified).toBe(true);
            expect(result.finalScore).toBe(0);
            expect(result.overallTier).toBe('Disqualified');
        }
    });

    it('should clamp score for boring stocks (IBM/T) even if AI is optimistic', async () => {
        // Mock IBM-like data
        vi.mocked(fmp.getCompanyProfile).mockResolvedValue({
            symbol: 'IBM', companyName: 'IBM', sector: 'Technology', industry: 'IT Services',
            description: 'Legacy tech', ceo: 'Arvind Krishna', ipoDate: '1911-01-01',
            mktCap: 150000000000, price: 150, isEtf: false, isActivelyTrading: true,
            exchange: 'NYSE', changes: 0, changesPercentage: 0, fullTimeEmployees: 0, isFund: false
        });
        vi.mocked(fmp.getQuote).mockResolvedValue({
            symbol: 'IBM', price: 150, marketCap: 150000000000, pe: 20, priceToSales: 2,
            yearHigh: 160, yearLow: 140,
            changes: 0, change: 0, changesPercentage: 0, dayHigh: 155, dayLow: 145,
            volume: 3000000, avgVolume: 3000000,
            eps: 7.5, sharesOutstanding: 1000000000
        });
        // Decent financials but slow growth
        vi.mocked(fmp.getIncomeStatements).mockResolvedValue([
            {
                date: '2023-12-31', symbol: 'IBM', revenue: 60000000000, netIncome: 8000000000,
                grossProfitRatio: 0.5, operatingIncomeRatio: 0.15, netIncomeRatio: 0.13,
                eps: 8, epsdiluted: 8, grossProfit: 30000000000, operatingIncome: 9000000000,
                ebitda: 12000000000, ebitdaratio: 0.2, weightedAverageShsOut: 1000000000,
                weightedAverageShsOutDil: 1000000000
            },
            {
                date: '2022-12-31', symbol: 'IBM', revenue: 59000000000, netIncome: 7500000000,
                grossProfitRatio: 0.5, operatingIncomeRatio: 0.14, netIncomeRatio: 0.12,
                eps: 7.5, epsdiluted: 7.5, grossProfit: 29500000000, operatingIncome: 8260000000,
                ebitda: 11000000000, ebitdaratio: 0.19, weightedAverageShsOut: 1000000000,
                weightedAverageShsOutDil: 1000000000
            }
        ]);
        vi.mocked(fmp.getBalanceSheets).mockResolvedValue([
            {
                date: '2023-12-31', symbol: 'IBM', totalAssets: 130000000000, totalLiabilities: 110000000000,
                totalStockholdersEquity: 20000000000, cashAndCashEquivalents: 10000000000,
                totalCurrentAssets: 30000000000, totalCurrentLiabilities: 25000000000,
                retainedEarnings: 10000000000, totalDebt: 50000000000, netDebt: 40000000000,
                shortTermInvestments: 0
            },
            {
                date: '2022-12-31', symbol: 'IBM', totalAssets: 125000000000, totalLiabilities: 105000000000,
                totalStockholdersEquity: 20000000000, cashAndCashEquivalents: 9000000000,
                totalCurrentAssets: 28000000000, totalCurrentLiabilities: 24000000000,
                retainedEarnings: 9000000000, totalDebt: 48000000000, netDebt: 39000000000,
                shortTermInvestments: 0
            }
        ]);

        // AI says MONITOR_ONLY (boring)
        vi.mocked(gemini.analyzeAntigravity).mockResolvedValue({
            antigravityScorecard: {
                antigravityVerdict: 'MONITOR_ONLY',
                suggestedTier: 'Tier 3',
                conviction: 50,
                overallScore: 50,
                qualityScore: 50,
                asymmetryScore: 50,
                timeHorizonYears: 5,
                thesisType: 'income'
            },
            summary: { oneLineThesis: 'Boring', category: 'Income', confidence: 'high' },
            moatAnalysis: { moatScore: 50, primaryMoatType: 'brand', secondaryMoatTypes: [], moatDurability: 'durable', keyMoatDrivers: [], moatRisks: [] },
            growthAndRunway: { growthScore: 30, coreGrowthDrivers: [], totalAddressableMarket: 'medium', reinvestmentOpportunities: 'moderate', isWinnerTakeMostMarket: false, growthRisks: [] },
            managementAndCapitalAllocation: { managementScore: 60, isFounderLed: false, insiderOwnershipQuality: 'moderate', capitalAllocationStyle: 'balanced', capitalAllocationNotes: [] },
            riskProfile: { riskScore: 30, keyRisks: [], redFlags: [], downsideScenarios: [] },
            historicalPatternMatch: { patternScore: 50, closestAnalogType: 'mature_compounder', closestPositiveAnalogs: [], closestNegativeAnalogs: [], patternNotes: [] },
            actionableNotes: { bullCase: [], bearCase: [], keyTrackingMetrics: [], whatCouldProveThesisWrong: [] }
        });
        vi.mocked(gemini.analyzeMoatAndThesis).mockResolvedValue({ moat: 'Narrow', thesis: 'Legacy', risks: [] });
        vi.mocked(gemini.analyzeQualitativeFactors).mockResolvedValue({
            tamPenetration: '5-10%',
            revenueType: 'Recurring',
            pricingPower: 'Neutral',
            catalysts: [], catalystDensity: 'Low', asymmetryScore: 'Low',
            reasoning: 'None'
        });

        const result = await analyzeStock('IBM');
        expect(result).not.toBeNull();
        if (result) {
            expect(result.riskFlags.disqualified).toBe(false);
            // Should be clamped at 55
            expect(result.finalScore).toBeLessThan(56);
            expect(result.overallTier).toMatch(/Not Interesting|Tier 3/);
        }
    });

    it('should reward compounders (NVDA) with high scores', async () => {
        // Mock NVDA-like data
        vi.mocked(fmp.getCompanyProfile).mockResolvedValue({
            symbol: 'NVDA', companyName: 'NVIDIA', sector: 'Technology', industry: 'Semiconductors',
            description: 'AI chips', ceo: 'Jensen Huang', ipoDate: '1999-01-22',
            mktCap: 2000000000000, price: 800, isEtf: false, isActivelyTrading: true,
            exchange: 'NASDAQ', changes: 0, changesPercentage: 0, fullTimeEmployees: 20000, isFund: false
        });
        vi.mocked(fmp.getQuote).mockResolvedValue({
            symbol: 'NVDA', price: 800, marketCap: 2000000000000, pe: 60, priceToSales: 30,
            yearHigh: 900, yearLow: 400,
            changes: 0, change: 0, changesPercentage: 0, dayHigh: 810, dayLow: 790,
            volume: 50000000, avgVolume: 50000000,
            eps: 12, sharesOutstanding: 2500000000
        });
        // Strong growth and margins
        vi.mocked(fmp.getIncomeStatements).mockResolvedValue([
            {
                date: '2023-12-31', symbol: 'NVDA', revenue: 60000000000, netIncome: 30000000000,
                grossProfitRatio: 0.75, operatingIncomeRatio: 0.55, netIncomeRatio: 0.50,
                eps: 12, epsdiluted: 12, grossProfit: 45000000000, operatingIncome: 33000000000,
                ebitda: 35000000000, ebitdaratio: 0.58, weightedAverageShsOut: 2500000000,
                weightedAverageShsOutDil: 2500000000
            },
            {
                date: '2022-12-31', symbol: 'NVDA', revenue: 40000000000, netIncome: 15000000000,
                grossProfitRatio: 0.65, operatingIncomeRatio: 0.45, netIncomeRatio: 0.33,
                eps: 6, epsdiluted: 6, grossProfit: 26000000000, operatingIncome: 18000000000,
                ebitda: 20000000000, ebitdaratio: 0.50, weightedAverageShsOut: 2500000000,
                weightedAverageShsOutDil: 2500000000
            }
        ]);
        vi.mocked(fmp.getBalanceSheets).mockResolvedValue([
            {
                date: '2023-12-31', symbol: 'NVDA', totalAssets: 65000000000, totalLiabilities: 20000000000,
                totalStockholdersEquity: 45000000000, cashAndCashEquivalents: 20000000000,
                totalCurrentAssets: 40000000000, totalCurrentLiabilities: 10000000000,
                retainedEarnings: 30000000000, totalDebt: 8000000000, netDebt: -12000000000,
                shortTermInvestments: 0
            },
            {
                date: '2022-12-31', symbol: 'NVDA', totalAssets: 40000000000, totalLiabilities: 15000000000,
                totalStockholdersEquity: 25000000000, cashAndCashEquivalents: 10000000000,
                totalCurrentAssets: 20000000000, totalCurrentLiabilities: 8000000000,
                retainedEarnings: 15000000000, totalDebt: 9000000000, netDebt: -1000000000,
                shortTermInvestments: 0
            }
        ]);
        vi.mocked(fmp.getFinancialGrowth).mockResolvedValue({
            symbol: 'NVDA', revenueGrowth: 1.2, grossProfitGrowth: 1.5, ebitgrowth: 2.0,
            operatingIncomeGrowth: 2.0, netIncomeGrowth: 2.5, epsgrowth: 2.5,
            epsdilutedGrowth: 2.5, weightedAverageSharesGrowth: 0.01,
            weightedAverageSharesDilutedGrowth: 0.01, dividendsperShareGrowth: 0,
            operatingCashFlowGrowth: 1.8, freeCashFlowGrowth: 2.0,
            tenYRevenueGrowthPerShare: 0.3, fiveYRevenueGrowthPerShare: 0.4,
            threeYRevenueGrowthPerShare: 0.5, tenYOperatingCFGrowthPerShare: 0.3,
            fiveYOperatingCFGrowthPerShare: 0.4, threeYOperatingCFGrowthPerShare: 0.5,
            tenYNetIncomeGrowthPerShare: 0.3, fiveYNetIncomeGrowthPerShare: 0.4,
            threeYNetIncomeGrowthPerShare: 0.5, tenYShareholdersEquityGrowthPerShare: 0.2,
            fiveYShareholdersEquityGrowthPerShare: 0.3, threeYShareholdersEquityGrowthPerShare: 0.4,
            tenYDividendperShareGrowthPerShare: 0, fiveYDividendperShareGrowthPerShare: 0,
            threeYDividendperShareGrowthPerShare: 0, receivablesGrowth: 0.1,
            inventoryGrowth: 0.1, assetGrowth: 0.2, bookValueperShareGrowth: 0.3,
            debtGrowth: 0, rdexpenseGrowth: 0.2, sgaexpensesGrowth: 0.1, date: '2023-12-31', period: 'FY'
        });

        // AI says STRONG_PASS
        vi.mocked(gemini.analyzeAntigravity).mockResolvedValue({
            antigravityScorecard: {
                antigravityVerdict: 'STRONG_PASS',
                suggestedTier: 'Tier 1',
                conviction: 90,
                overallScore: 90,
                qualityScore: 90,
                asymmetryScore: 90,
                timeHorizonYears: 10,
                thesisType: 'compounder'
            },
            summary: { oneLineThesis: 'AI King', category: 'Compounder', confidence: 'high' },
            moatAnalysis: { moatScore: 90, primaryMoatType: 'network_effects', secondaryMoatTypes: ['switching_costs'], moatDurability: 'exceptional', keyMoatDrivers: [], moatRisks: [] },
            growthAndRunway: { growthScore: 90, coreGrowthDrivers: [], totalAddressableMarket: 'massive', reinvestmentOpportunities: 'strong', isWinnerTakeMostMarket: true, growthRisks: [] },
            managementAndCapitalAllocation: { managementScore: 90, isFounderLed: true, insiderOwnershipQuality: 'high', capitalAllocationStyle: 'aggressive_growth', capitalAllocationNotes: [] },
            riskProfile: { riskScore: 20, keyRisks: [], redFlags: [], downsideScenarios: [] },
            historicalPatternMatch: { patternScore: 90, closestAnalogType: 'early_compounder', closestPositiveAnalogs: [], closestNegativeAnalogs: [], patternNotes: [] },
            actionableNotes: { bullCase: [], bearCase: [], keyTrackingMetrics: [], whatCouldProveThesisWrong: [] }
        });
        vi.mocked(gemini.analyzeMoatAndThesis).mockResolvedValue({ moat: 'Wide', thesis: 'AI', risks: [] });
        vi.mocked(gemini.analyzeQualitativeFactors).mockResolvedValue({
            tamPenetration: '1-5%',
            revenueType: 'Recurring',
            pricingPower: 'Strong',
            catalysts: ['AI'], catalystDensity: 'High', asymmetryScore: 'High',
            reasoning: 'AI'
        });

        const result = await analyzeStock('NVDA');
        expect(result).not.toBeNull();
        if (result) {
            expect(result.riskFlags.disqualified).toBe(false);
            expect(result.finalScore).toBeGreaterThanOrEqual(TIER_THRESHOLDS.TIER_1);
            expect(result.overallTier).toBe('Tier 1');
        }
    });

});
