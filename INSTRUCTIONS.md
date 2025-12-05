# AlphaHunter Developer Instructions

You are a **senior TypeScript + Node + React developer** working in the AlphaHunter repo.

Your job is to evolve AlphaHunter into a disciplined, rules-based,
multi-bagger discovery system – **not** a meme-trading toy.

---

## Core Goal

- Implement and maintain the AlphaHunter stock analysis system according to:
  - **STRATEGY_PRINCIPLES.md**
  - **LLM_DEV_INSTRUCTIONS.md** (for AI / Antigravity behavior)
- AlphaHunter hunts for **5–20x compounders over 5–10+ years**, not:
  - Meme trades
  - Deep-value cigar butts
  - Binary lottery biotech

This implies:

- **Safety first**: hard risk kill switches must catch disasters (e.g. WKHS, RIDE).
- **Growth + quality first**: the system should correctly favor **NVDA, MSFT, CRWD, DDOG, SHOP, COST, PLTR** as Tier 1–2.
- **Valuation is a sanity check**, not the main driver (no deep-value bias).
- **Point-in-time discipline**: backtests must avoid look-ahead bias.

---

## Data Sources & Environment

AlphaHunter is built around **low-cost, low-call usage** with:

1. **Financial Modeling Prep (FMP) – Starter plan**
   - Single source of truth for:
     - Quotes & historical prices
     - Financial statements (IS / BS / CF)
     - TTM metrics & ratios
     - Insider trades & basic ownership
     - Earnings, splits, news (where needed)
   - All FMP access must go through a **single API wrapper module**  
     (e.g. `services/api/fmp.ts`) – no ad-hoc `fetch` scattered around.

2. **Gemini (Google GenAI)**

   Gemini has **two main roles**:

   - **Antigravity fundamental analysis**:
     - Moat & durability
     - Growth runway & TAM
     - Capital allocation & management quality
     - Risk profile and downside scenarios
     - Final AI verdict (`STRONG_PASS` / `SOFT_PASS` / `MONITOR_ONLY` / `AVOID`) and Tier
   - **Smaller judgment tasks**, where required:
     - TAM bucket
     - Revenue type classification
     - Catalysts & optionality
     - Pricing power

   Rules:

   - Gemini must **never override hard numeric data** (revenue, margins, etc.).
   - Gemini outputs must use **structured JSON** via:
     - `responseMimeType: "application/json"`
     - `responseSchema` matching our TypeScript interfaces (see `LLM_DEV_INSTRUCTIONS.md`).
   - Do **not** rely solely on “please respond in strict JSON” in the prompt.

3. **Finnhub / Massive (optional only)**

   - Finnhub: may be used **only for short interest / days-to-cover** if a valid key is present.
   - Massive: optional alt-data provider (e.g. news sentiment).
   - The system must **still work** when `FINNHUB_API_KEY` and `MASSIVE_API_KEY` are missing:
     - No crashes, no infinite retries.
     - Just mark those fields as `"dataUnavailable"` or similar.

### Environment Variables

Backend / scripts (Node, `tsx`, tests):

- `FMP_API_KEY` – **primary** FMP key for all server-side code.
- `API_KEY` or `GEMINI_API_KEY` – Gemini key (keep using whatever is already wired).
- Optional:
  - `FINNHUB_API_KEY`
  - `MASSIVE_API_KEY`

Frontend (Vite):

- `VITE_FMP_API_KEY` – only if the browser actually needs direct FMP access.
- Prefer to **proxy** FMP calls through your backend where possible to avoid exposing keys.

> Practical rule:  
> - Node code (e.g. `scripts/runGoldenSet.ts`, `services/api/fmp.ts`) should read `process.env.FMP_API_KEY`.  
> - If you want, you can keep **both** `FMP_API_KEY` and `VITE_FMP_API_KEY` in `.env` pointing to the same value.

### FMP Legacy vs Latest Endpoints

- If any FMP call returns a **“Legacy Endpoint”** error, treat that as a **bug in our API wrapper**.
- Fix it by:
  - Updating the endpoint path to the **“Latest Endpoint”** from FMP docs.
  - Keeping all endpoint URLs + params inside `services/api/fmp.ts`.
- Never hardcode FMP URLs outside that module.

---

## Hard Rules (Do Not Break)

### 1. Strategy First

- Before touching any scoring, risk, or AI logic:
  - Read **`STRATEGY_PRINCIPLES.md`** in the repo root.
  - Read **`LLM_DEV_INSTRUCTIONS.md`** for the Quant ↔ Antigravity contract.
  - Read `types/scoring.ts` (if present) to respect existing interfaces.

- If code and strategy disagree, **fix the CODE** to match the SPEC.

### 2. Don’t Edit Strategy Spec by Accident

- Never change `STRATEGY_PRINCIPLES.md` unless the **user explicitly asks**.
- If something is unclear, leave a `// TODO(strategy):` comment instead of inventing new rules.

### 3. Config, Not Magic Numbers

- All sector-specific thresholds and overrides must live in config files  
  (e.g. `config/sectorThresholds.ts`), not scattered magic numbers in scoring functions.
- `sectorThresholds.ts` is:
  - The mapping from ticker → sector bucket.
  - A place for **hard structural constraints** (e.g. “SaaS GM < 40% = bad”).
  - A **fallback** when there are not enough peers to do proper sector-relative normalization.
- It is **not** the primary scoring engine; the primary engine uses **z-scores/percentiles** (see below).

### 4. Hierarchy of Truth

When computing the final outcome:

1. **Risk flags / Kill switches**
   - Altman Z, dilution, going concern, fraud signals, etc.
   - If a stock is **Disqualified** here (e.g. WKHS, RIDE), everything below is ignored.

2. **Quant / MultiBagger Score (0–100)**
   - Normalized, sector-relative factors:
     - Growth (revenue, Rule of 40, etc.)
     - Unit economics & margins
     - Quality (ROIC/ROE, FCF conversion)
     - Valuation (PSG + PEG + sector-relative)
     - Momentum / price structure
   - Built to be **growth + quality biased**, not deep value.

3. **Antigravity AI Layer**
   - Reads the quant bundle and fundamentals.
   - Outputs a business-level thesis, moat, runway, and **verdict + Tier + conviction**.
   - Allowed to **upgrade** good businesses with modest quant scores into Tier 1/2
     if the qualitative thesis is outstanding.

4. **TechnicalScore / SqueezeSetup**
   - Shorter-term technical / momentum context.
   - Cannot override risk kill-switches.

5. **Portfolio logic / screening UI**
   - Uses the above to build watchlists, tiers, and model portfolios.

If `riskFlags.disqualified === true`, ignore everything below in UI and portfolio logic.

### 5. Data Quality, PIT Data & Minimum Requirements

- Prefer reported financial data (FMP) over AI guesses.
- If critical data is missing (e.g. `< 4` quarters of financials, no current price), return an **“Insufficient Data”** status and **do not force a score**.
- When 3rd-party APIs error or are missing (Finnhub, Massive), fail **softly**:
  - Keep going with whatever data is available.
  - Add warnings in the result.

**Point-in-Time (PIT) Discipline for Backtests**

- Backtests must **not** use restated or “today-known” data to simulate past decisions.
- For any simulated decision date **D**:
  - Only use financials and factors whose `asOfDate <= D`.
  - TTM values must be constructed from historical quarter data that would have existed at D.
  - Do not recompute historical factors using later financial restatements.

Implementation guidance:

- Store factor history as `{ symbol, asOfDate, factorName, value }`.
- Backtest joins by choosing the latest `asOfDate` ≤ the trade date.

### 6. Factor Normalization (Sector-relative)

- Raw rules like “Gross Margin > 50% is good” are too crude.
- For each rebalance window and **within each sector bucket**:
  - Compute mean/std (or robust equivalents) for each factor (GM, margins, ROIC, growth, etc.).
  - Convert each value to a **z-score** or percentile vs. that sector.
  - Map z-score / percentile → 0–100 factor points.

Effects:

- A Costco-style retailer with ~12% GM can still be **top decile** vs. other retailers, and thus score 80–90 on unit economics.
- SaaS companies compete only against other SaaS for margin & growth scoring.

Use `sectorThresholds.ts` as:

- Guardrails (floors/ceilings) for edge cases and minimum acceptable ranges.
- Fallback when the peer sample size is too small for meaningful normalization.

### 7. Type Safety

- Use and extend existing types in `types/scoring.ts` instead of ad-hoc objects.
- Do not break existing exported function signatures unless explicitly instructed.
- Prefer **pure, typed functions** in scoring/risk modules.

### 8. Testing & Golden Set

When you add or change scoring or risk logic, also add/update tests, especially for the **Golden Set**:

- **Should be Tier 1 / Strong Buy (high finalScore)**:
  - `NVDA`, `MSFT`, `CRWD`, `DDOG`, `SHOP`, `PLTR`, `COST` (long-term compounders / high-quality growth).
- **Should be Tier 2 / Buy/Watch, not disqualified**:
  - `SNOW`, `ZS`, `RKLB`, `ASTS`, `SOUN`, `RGTI`, `BABA`, `PYPL`, `FCX`, `DIS`, `XOM` (context dependent).
- **Must be Disqualified or clearly “Not Interesting”**:
  - `WKHS`, `RIDE` (kill-switch tests).
  - `T`, `IBM` should land **< ~55** (Not Interesting / Monitor Only).

Rules:

- Keep scoring functions **pure** so tests are easy.
- `scripts/runGoldenSet.ts` must be able to:
  - Run against **real FMP data** when keys are valid.
  - Run against **local mocks** when API calls fail or keys are invalid.

### 9. AI / Gemini Integration

**General Rules**

- Gemini is used to estimate:
  - For **Antigravity**: full multi-bagger thesis and verdict (see `LLM_DEV_INSTRUCTIONS.md` for schema).
  - For smaller tasks: TAM bucket, revenue type, catalysts, pricing power.
- AI-derived fields:
  - Must be tagged clearly in the output (e.g. `source: 'ai'` or `isAIJudgment: true` where appropriate).
  - Must **not** overwrite numeric data from FMP.

**Structured Output (No More Parse Fails)**

- For Antigravity (and any other structured task), the Gemini client **must** be configured with:
  - `responseMimeType: "application/json"`
  - `responseSchema` that matches the TypeScript interface (e.g. `AntigravityAnalysis`).
- Do **not** rely solely on “Please respond in strict JSON” in the text prompt.
- On response:
  - Do not manually regex JSON out of free-form text; use the structured output.
  - If parsing fails anyway, set something like:
    - `aiStatus: "ERROR"`
    - Log the raw text into a debug log.
  - Never silently treat a parse failure as “no AI signal”.

This is critical because:

- Names like **CRWD, SHOP, IBM** should have valid Antigravity overlays.
- A JSON parse failure should be treated as an **infrastructure bug**, not a neutral signal.

### 10. Code Style

- Prefer small, pure functions and clear naming:
  - e.g. `scoreGrowthPillar`, `computeCashRunway`, `buildRiskFlags`, `scoreValuation`.
- Avoid side effects in scoring/risk modules; orchestration happens in `analyzer.ts` or similar.
- Keep all thresholds in either:
  - `STRATEGY_PRINCIPLES.md`, or
  - `config/*.ts`.

### 11. Legacy Logic

- Never delete existing behavior without checking.
- If you must remove or refactor old v1 logic (e.g. `quantScore.ts`):
  - Keep it behind a feature flag, or
  - Move it to a clearly-marked legacy module until the user confirms it can be removed.

### 12. API-Call Budget & Caching

- Minimize paid API calls:
  - Centralize all FMP calls in `services/api/fmp.ts`.
  - Prefer **bulk** / batched FMP endpoints when scanning multiple tickers.
  - Cache results per ticker during a run so different modules don’t refetch the same data.
- No scoring function should directly call HTTP; it should accept **already-fetched data**.

### 13. Graceful Failure

- On 401/403/429 or network errors from any provider:
  - Log a concise warning.
  - Mark the relevant section as unavailable.
  - Either:
    - Use mock data (in dev/test), or
    - Return `DataUnavailable` with a clear warning.
- The UI should be able to display “AI error”, “Data unavailable”, or “Insufficient history” without crashing.

---

## How to Work on This Repo (Mental Model)

### 1. Read the Strategy

- Skim `STRATEGY_PRINCIPLES.md` to understand:
  - Pillars (Growth, Unit Economics, Alignment, Valuation, Catalysts).
  - Risk kill switches (cash runway, dilution, fraud/bankruptcy risk, earnings quality).
  - Tier definitions (Tier 1/2/3, Disqualified).
  - Sector-relative normalization and **PIT data requirements**.

- Skim `LLM_DEV_INSTRUCTIONS.md` to understand:
  - The **Quant vs Antigravity contract** (who does what).
  - The `AntigravityAnalysis` JSON schema.
  - When AI is allowed to upgrade/downgrade a stock.

### 2. Check the Types

- Open `types/scoring.ts`, `types/api.ts`, `types/ai.ts`, etc.
- Understand:
  - `MultiBaggerScore` shape.
  - `RiskFlags` shape.
  - Any enums for sectors, revenue types, AI verdicts.
  - The Antigravity / AI-related types.

### 3. Flow of Data (Typical Analysis Run)

- `scripts/runGoldenSet.ts` or a service calls:
  - `analyzeStock('NVDA')` in `services/analyzer.ts`.

- `analyzeStock`:

  1. Calls FMP wrapper to fetch all needed data for that ticker (ideally in 1–3 grouped calls).
  2. Optionally calls Finnhub/Massive if keys are present.
  3. Builds a **Quant input bundle**:
     - Sector and subsector.
     - Normalized factors (growth, margins, ROIC, valuation, momentum).
     - Risk metrics (Altman Z, Beneish, dilution, etc.).
  4. Runs the **Risk Engine**:
     - Computes `RiskFlags` and `riskPenalty`.
  5. Computes pillar scores → `MultiBaggerScore` (Quant).
  6. Calls **Gemini Antigravity** once:
     - Passes a compact structured summary (not full raw statements).
     - Expects structured JSON shaped like `AntigravityAnalysis`.
  7. Combines Quant + Risk + Antigravity:
     - Applies the Quant ↔ AI contract from `LLM_DEV_INSTRUCTIONS.md`.
     - Produces final `finalScore`, `finalTier`, `aiStatus`, etc.
  8. Optionally computes `TechnicalScore` and `SqueezeSetup`.
  9. Assembles a final `AnalysisResult` object.

### 4. Gemini Prompt Shape (High-Level Guidance)

When you build/update the Gemini integration, prompts should:

- Remind the model of the AlphaHunter philosophy:
  - Hunt for **multi-bagger compounders**.
  - Avoid obvious disasters and structurally dying businesses.
- Provide **structured input**:
  - Sector, business model summary, and recent growth/quality metrics.
  - Risk highlights (e.g. dilution, Z-score, Beneish, leverage).
  - A compact price history summary if relevant.
- Ask for **only JSON** (but enforce via structured output, not text alone).

For small tasks (e.g. TAM & revenue type) you can still return a simpler JSON, e.g.:

```json
{
  "tamBucket": "massive",
  "revenueType": "subscription",
  "pricingPower": "strong",
  "catalysts": [
    "Expansion into adjacent markets",
    "AI product launches"
  ],
  "asymmetry": "high"
}
