import 'dotenv/config';
import { analyzeStock } from '../services/analyzer.ts';
import { WATCHLIST } from '../data/tickers.ts';
import Table from 'cli-table3';

// Helper: Delay function
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Serial Concurrency Limiter
const pLimit = (concurrency: number) => {
    let active = 0;
    const queue: any[] = [];
    const run = async (fn: any) => {
        active++;
        try { await fn(); } finally { active--; if (queue.length) queue.shift()(); }
    };
    return (fn: any) => new Promise((resolve, reject) => {
        const task = () => run(fn).then(resolve, reject);
        active < concurrency ? task() : queue.push(task);
    });
};

const run = async () => {
    const args = process.argv.slice(2);
    const uniqueTickers = args.length > 0 ? args : [...new Set(WATCHLIST)];
    console.log(`\n🚀 Starting AlphaHunter Scan for ${uniqueTickers.length} stocks...`);
    console.log(`⏳ Throttling enabled: 1 stock every 2 seconds (Safe Mode)\n`);

    // FORCE SERIAL EXECUTION (Limit 1) to save API credits
    const limit = pLimit(1);
    const results: any[] = [];

    await Promise.all(uniqueTickers.map(ticker => limit(async () => {
        try {
            // 1. Throttle: Wait 2 seconds between stocks
            await delay(2000);

            // 2. Analyze (Silence internal logs ONLY if batch mode)
            const originalLog = console.log;
            if (args.length === 0) {
                console.log = () => { };
            }

            process.stdout.write(`Scanning ${ticker}... `);

            const analysis = await analyzeStock(ticker);

            if (args.length === 0) {
                console.log = originalLog;
            }

            if (!analysis) {
                console.log(`Failed`);
                return;
            }
            console.log(`Done (Score: ${analysis.finalScore})`);

            results.push(analysis);

        } catch (e) {
            console.error(e);
            console.log(`Error`);
        }
    })));

    // [NEW] Build and Print Table
    const table = new Table({
        head: ['Ticker', 'Score', 'Tier', 'Verdict', 'Warning / Catalyst'],
        colWidths: [10, 8, 15, 15, 80],
        wordWrap: true
    });

    results.sort((a, b) => b.finalScore - a.finalScore);

    results.forEach((analysis: any) => {
        const score = analysis.finalScore.toString();
        const tierStr = analysis.overallTier;
        const verdict = analysis.verdict.replace('Strong Buy', 'STRONG').replace('Buy', 'BUY');
        // Use warningFull if available, otherwise fallback
        const note = analysis.warningFull || (analysis.antigravityResult?.warningSummary || "—");

        table.push([analysis.ticker, score, tierStr, verdict, note]);
    });

    console.log('\n' + table.toString());
    console.log(`\n📊 SCAN COMPLETE: Scanned ${results.length} stocks.`);
};

run().catch(console.error);
