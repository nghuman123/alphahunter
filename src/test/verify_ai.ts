import { analyzeQualitativeFactors } from '../../services/ai/gemini';

const run = async () => {
    console.log('Running AI Qualitative Analysis Verification...');

    // Test with a known ticker
    const ticker = 'PLTR';
    const companyName = 'Palantir Technologies';
    const sector = 'Software';

    console.log(`Analyzing ${companyName} (${ticker})...`);

    const result = await analyzeQualitativeFactors(ticker, companyName, sector);

    console.log('\n--- Qualitative Analysis Result ---');
    console.log(JSON.stringify(result, null, 2));

    // Basic validation
    if (!result.tamPenetration || !result.revenueType || !result.pricingPower) {
        console.error('FAILED: Missing required fields');
        process.exit(1);
    }

    console.log('\nPASSED: Structure is valid.');
};

run().catch(console.error);
