import { computeTechnicalScore } from '../../services/scoring/technicalScore';
import { computeSqueezeSetup } from '../../services/scoring/squeezeSetup';
import { PriceHistoryData } from '../../src/types/scoring';

// --- Technical Score Tests ---

const mockHistory = (currentPrice: number, price1YearAgo: number): PriceHistoryData => ({
    price: currentPrice,
    history: Array(250).fill({ date: '2024-01-01', close: price1YearAgo }), // Mock history
    sma200: 100,
    week52High: 150,
    week52Low: 80
});

console.log('--- Technical Score Tests ---');

// Case 1: Strong Trend (>20% RS, >200DMA, Near High)
// Price 140 (vs 100 1Y ago = +40%), > SMA 100, High 150 (diff 6.6%)
const strongTrend = mockHistory(140, 100);
const scoreStrong = computeTechnicalScore(strongTrend);
console.log('Strong Trend Score:', scoreStrong.totalScore, '/ 25');
console.log(scoreStrong.details);

// Case 2: Weak Trend (<0% RS, <200DMA, Far from High)
// Price 90 (vs 100 1Y ago = -10%), < SMA 100, High 150 (diff 40%)
const weakTrend = mockHistory(90, 100);
const scoreWeak = computeTechnicalScore(weakTrend);
console.log('\nWeak Trend Score:', scoreWeak.totalScore, '/ 25');
console.log(scoreWeak.details);


// --- Squeeze Setup Tests ---

console.log('\n--- Squeeze Setup Tests ---');

// Case 1: Strong Squeeze (Score 80, SI 25%, DTC 6)
const strongSqueeze = computeSqueezeSetup({
    multiBaggerScore: 80,
    shortInterestPct: 25,
    daysToCover: 6
});
console.log('Strong Squeeze:', strongSqueeze.squeezeScore);
console.log(strongSqueeze.details);

// Case 2: Watch Squeeze (Score 60, SI 12%, DTC 2)
const watchSqueeze = computeSqueezeSetup({
    multiBaggerScore: 60,
    shortInterestPct: 12,
    daysToCover: 2
});
console.log('\nWatch Squeeze:', watchSqueeze.squeezeScore);
console.log(watchSqueeze.details);

// Case 3: Trap (Score 40, SI 30%)
const trapSqueeze = computeSqueezeSetup({
    multiBaggerScore: 40,
    shortInterestPct: 30,
    daysToCover: 10
});
console.log('\nTrap (Low Quality):', trapSqueeze.squeezeScore);
console.log(trapSqueeze.details);
