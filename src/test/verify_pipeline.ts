process.env.VITE_FMP_API_KEY = 'dummy_key';
process.env.VITE_FINNHUB_API_KEY = 'dummy_key';
process.env.VITE_MASSIVE_API_KEY = 'dummy_key';
process.env.API_KEY = 'dummy_key'; // Gemini
import { analyzeStock } from '../../services/analyzer';

const run = async () => {
    console.log('Running Strategy V2 Pipeline Verification...');

    // Test with a known ticker
    const ticker = 'AAPL';
    const result = await analyzeStock(ticker);

    if (!result) {
        console.error('Analysis returned null. Check API keys or data availability.');
        return;
    }

    console.log('\n--- Analysis Result ---');
    console.log(`Ticker: ${result.ticker}`);
    console.log(`Verdict: ${result.verdict}`);
    console.log(`Final Score: ${result.finalScore}`);
    console.log(`Tier: ${result.overallTier}`);
    console.log(`Position Size: ${result.suggestedPositionSize}`);

    console.log('\n--- MultiBagger Score ---');
    console.log(`Total: ${result.multiBaggerScore.totalScore}`);
    console.log(`Tier: ${result.multiBaggerScore.tier}`);

    console.log('\n--- Technical Score ---');
    console.log(`Total: ${result.technicalScore.totalScore}/25`);
    console.log(result.technicalScore.details);

    console.log('\n--- Squeeze Setup ---');
    console.log(`Status: ${result.squeezeSetup.squeezeScore}`);
    console.log(result.squeezeSetup.details);

    console.log('\n--- Risk Flags ---');
    console.log(`Disqualified: ${result.riskFlags.disqualified}`);
    console.log(`Reasons: ${result.riskFlags.disqualifyReasons}`);
    console.log(`Warnings: ${result.riskFlags.warnings}`);
    console.log(`QoE: ${result.riskFlags.qualityOfEarnings}`);
    console.log(`Runway: ${result.riskFlags.cashRunwayQuarters}`);

};

run().catch(console.error);
