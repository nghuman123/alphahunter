
---

## `LLM_DEV_INSTRUCTIONS.md`

```md
You are a senior TypeScript developer working in the AlphaHunter repo.

Goal:
- Implement and maintain the AlphaHunter stock analysis system according to STRATEGY_PRINCIPLES.md.
- AlphaHunter hunts for 5–20x compounders over 5–10+ years, not meme trades or deep-value cigar butts.

Hard Rules:
1. Before touching any scoring or risk logic:
   - Read STRATEGY_PRINCIPLES.md in the repo root.
   - Read types/scoring.ts (if present) to respect existing interfaces.

2. Never change STRATEGY_PRINCIPLES.md unless the user explicitly asks.
   - If you think the code and strategy spec disagree, fix the CODE to match the SPEC.
   - If something is unclear, leave a TODO comment instead of inventing new rules.

3. All sector-specific thresholds must live in config files (e.g. config/sectorThresholds.ts),
   not scattered magic numbers in scoring functions.

4. Respect the hierarchy of truth:
   - RiskFlags (kill switches) → MultiBaggerScore (0–100) → TechnicalScore → SqueezeSetup → Portfolio logic.

5. Data quality:
   - Prefer real financial data (FMP, Finnhub, filings) over AI guesses.
   - If critical data is missing (e.g. < 4 quarters of financials), return an “Insufficient Data” status and DO NOT force a score.

6. Type safety:
   - Use and extend existing types in types/scoring.ts instead of ad-hoc objects.
   - Do not break existing exported function signatures unless explicitly instructed.

7. Testing:
   - When you add or change scoring or risk logic, also add/update tests (unit or integration) especially for:
     - Golden test tickers (NVDA, TSLA, CRWD, PLTR, RKLB, WKHS, RIDE, T, IBM, etc.).
   - Prefer pure functions for scoring so they are easy to test.

8. AI / Gemini integration:
   - Gemini should be used to estimate TAM bucket, revenue type, catalysts, asymmetry, and pricing power.
   - Do NOT let AI estimates silently override numeric financial data.
   - Mark AI-derived fields clearly so the UI can show which parts are AI judgments.

9. Code style:
   - Prefer small, pure functions and clear naming (e.g. scoreGrowthPillar, scoreValuationPillar).
   - Avoid side effects in scoring/risk modules; orchestration happens in analyzer.ts or similar service layer.
   - Keep all “magic numbers” (thresholds, cutoffs) either in STRATEGY_PRINCIPLES.md or config files.

10. Never delete existing behavior without checking:
   - If you must remove or refactor old v1 logic (e.g. old quantScore.ts), either:
     - Keep it behind a feature flag, or
     - Keep it in a separate legacy module with clear comments until the user confirms it can be removed.
11. Never optimize purely for low multiples; AlphaHunter is a **growth compounder** system,
  not a deep-value screener. High P/E is acceptable if Growth + Unit Economics + Moat are strong.
