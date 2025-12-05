# AlphaHunter – Multi-Bagger Stock Discovery

AlphaHunter is a **rules-based stock discovery platform** focused on finding potential **5–20× compounders over 5–10+ years**, not meme trades or binary lottery bets.

## Features

- **Fundamental MultiBaggerScore Engine**
  - Growth & TAM
  - Unit Economics & Capital Efficiency
  - Alignment & Sponsorship (insiders / institutions)
  - Valuation & Asymmetry (PSG, valuation trend)
  - Catalysts & Optionality (incl. pricing power)

- **Risk Engine (Kill Switches)**
  - Cash runway & burn
  - Extreme dilution
  - Beneish M-Score (fraud risk)
  - Altman Z-Score (bankruptcy risk)
  - Quality of earnings (NI vs FCF)

- **Technical & Squeeze Overlay**
  - Relative strength vs SPY/QQQ
  - 200-DMA & proximity to 52-week high
  - Short-squeeze setup (short interest, days-to-cover)

- **AI-Assisted Analysis (Gemini)**
  - TAM bucket & penetration
  - Revenue type classification
  - Catalysts & asymmetry
  - Pricing power
  - Moat & high-level thesis

- **Data Providers**
  - **Financial Modeling Prep (FMP Starter)** – quotes, financial statements, ratios, insider trades, etc.
  - **Finnhub (optional)** – short interest & days-to-cover when configured.
  - **Massive (optional)** – alt-data / sentiment if you decide to use it.

---

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Backend / Scripts:** Node + TypeScript
- **AI:** Google Gemini (1.5 / 2.5 models)

---

## Prerequisites

- **Node.js 18+**
- **npm** or **yarn**
- API keys for:
  - **FMP** (Starter or above)
  - **Gemini**
  - Optional: **Finnhub**, **Massive**

---

- **Point-in-Time, Sector-Normalized Factors**: Z-score / percentile-based factor model with no       look-ahead bias, plus an AI overlay to recognize true compounders.


## Environment Configuration

Create `.env` or `.env.local` in the project root:

```env
# === Required ===
FMP_API_KEY=your_fmp_api_key_here
GEMINI_API_KEY=your_gemini_key_here
# or, if existing code expects this name:
API_KEY=${GEMINI_API_KEY}

# === Optional ===
# Only if you want short interest / days-to-cover
FINNHUB_API_KEY=your_finnhub_api_key_here

# Only if you wire in Massive alt-data
MASSIVE_API_KEY=your_massive_api_key_here

# === Frontend (Vite) ===
# Use only if the browser needs direct access – prefer backend proxy
VITE_FMP_API_KEY=${FMP_API_KEY}
VITE_GEMINI_API_KEY=${GEMINI_API_KEY}

Note: Node code (e.g. scripts/runGoldenSet.ts, services/api/fmp.ts) should read process.env.FMP_API_KEY.
Frontend code should only use import.meta.env.VITE_* keys.

Quick Start

Clone and install

git clone <your-repo-url>
cd alphahunter
npm install


Configure environment

Create .env.local as shown above with your real keys.

Run the app

npm run dev


Then open:

http://localhost:5173

Golden Test Set / Backtesting

You can run the Golden Test Set against live FMP data to verify scoring and risk behavior across known tickers (NVDA, TSLA, CRWD, PLTR, RKLB, WKHS, RIDE, T, IBM, etc.).

Typical command (adjust if you have a script in package.json):

npx tsx scripts/runGoldenSet.ts
# or
npm run golden-set


This should:

Fetch data once per ticker via the FMP wrapper.

Run the Risk Engine, MultiBaggerScore, TechnicalScore, and SqueezeSetup.

Print a summary showing:

Tier (1/2/3/disqualified)

Key risk flags

Pillar breakdown

Documentation

Strategy Spec: STRATEGY_PRINCIPLES.md – source of truth for pillars, thresholds, risk rules, tiers, and portfolio guidelines.

Developer Guide: INSTRUCTIONS.md – how to extend the system, data sources, and architectural rules.

LLM Prompt: LLM_DEV_INSTRUCTIONS.md – system prompt for LLM agents working inside this repo.

Keep these docs in sync with implementation. When you change scoring or risk logic, update tests first and treat STRATEGY_PRINCIPLES.md as the spec.


---

## `INSTRUCTIONS.md`

```md
# AlphaHunter Developer Instructions

You are a **senior TypeScript + Node + React developer** working in the AlphaHunter repo.

Your job is to evolve AlphaHunter into a disciplined, rules-based, **multi-bagger discovery system** – **not** a meme-trading toy.

---

## 1. Core Goal

- Implement and maintain the AlphaHunter stock analysis system according to **STRATEGY_PRINCIPLES.md**.
- AlphaHunter hunts for **5–20× compounders over 5–10+ years**, not:
  - Meme trades
  - Deep-value cigar butts
  - Binary lottery biotech

---

## 2. Data Sources & Environment

AlphaHunter is built around **low-cost, low-call usage** with:

### 2.1 Providers

1. **Financial Modeling Prep (FMP – Starter plan)**  
   Single source of truth for:

   - Quotes & historical prices  
   - Financial statements (IS / BS / CF)  
   - TTM metrics & ratios  
   - Insider trades & basic ownership  
   - Earnings, splits, news (where needed)

   All FMP access must go through a **single API wrapper module**  
   (e.g. `services/api/fmp.ts`) – **no ad-hoc `fetch` scattered around**.

2. **Gemini (Google GenAI)**  

   Used **only** for qualitative / judgment tasks:

   - TAM bucket & penetration
   - Revenue type classification
   - Catalysts & optionality
   - Pricing power
   - Moat / thesis / risks
   - Pattern-match vs historic winners (e.g. “similar to NVDA 2016”)

   It **must never override hard numeric data** (revenue, margins, etc.).

3. **Finnhub / Massive (optional only)**  

   - **Finnhub** – may be used **only for short interest / days-to-cover** if a valid key is present.  
   - **Massive** – optional alt-data provider (e.g. news sentiment), ideally behind a feature flag.  
   - The system must **still work** when `FINNHUB_API_KEY` and `MASSIVE_API_KEY` are missing:
     - No crashes, no infinite retries.
     - Mark those fields as `"dataUnavailable"` or similar.

### 2.2 Environment Variables

**Backend / scripts (Node, `tsx`, tests):**

- `FMP_API_KEY` – **primary** FMP key for all server-side code.
- `GEMINI_API_KEY` or `API_KEY` – Gemini key (keep using whatever is already wired).
- Optional:
  - `FINNHUB_API_KEY`
  - `MASSIVE_API_KEY`

**Frontend (Vite):**

- `VITE_FMP_API_KEY` – only if the browser actually needs direct FMP access.
- `VITE_GEMINI_API_KEY` – for any front-end Gemini usage.
- Prefer to **proxy** FMP calls through your backend where possible to avoid exposing keys.

> Practical rule:  
> - Node code (e.g. `scripts/runGoldenSet.ts`, `services/api/fmp.ts`) should read `process.env.FMP_API_KEY`.  
> - You can keep **both** `FMP_API_KEY` and `VITE_FMP_API_KEY` in `.env` pointing to the same value.

### 2.3 FMP Legacy vs Latest Endpoints

- If any FMP call returns a **“Legacy Endpoint”** error, treat that as a **bug in our API wrapper**.
- Fix it by:
  - Updating the endpoint path to the **“Latest Endpoint”** from FMP docs.
  - Keeping all endpoint URLs + params inside `services/api/fmp.ts`.
- Never hardcode FMP URLs outside that module.

---

## 3. Hard Rules (Do Not Break)

1. **Strategy First**

   - Before touching any scoring or risk logic:
     - Read `STRATEGY_PRINCIPLES.md` (root).
     - Read `types/scoring.ts` to respect existing interfaces.

2. **Don’t Edit Strategy Spec by Accident**

   - Never change `STRATEGY_PRINCIPLES.md` unless the **user explicitly asks**.
   - If code and strategy disagree, **fix the CODE** to match the SPEC.
   - If something is unclear, leave a `// TODO(strategy):` comment instead of inventing new rules.

3. **Config, Not Magic Numbers**

   - All sector-specific thresholds must live in config files  
     (e.g. `config/sectorThresholds.ts`), not scattered magic numbers in scoring functions.

4. **Hierarchy of Truth**

   - `RiskFlags` (kill switches) → `MultiBaggerScore` (0–100) → `TechnicalScore` → `SqueezeSetup` → Portfolio logic.
   - If `riskFlags.disqualified === true`, **ignore everything below**.

5. **Data Quality & Minimum Requirements**

   - Prefer reported financial data (FMP) over AI guesses.
   - If critical data is missing (e.g. `< 4` quarters of financials, no current price), return an **“Insufficient Data”** status and **do not force a score**.
   - When 3rd-party APIs error or are missing (Finnhub, Massive), fail **softly**:
     - Keep going with whatever data is available.
     - Add warnings in the result.

6. **Type Safety**

   - Use and extend existing types in `types/scoring.ts` instead of ad-hoc objects.
   - Do not break existing exported function signatures unless explicitly instructed.
   - Prefer **pure, typed functions** in scoring/risk modules.

7. **Testing & Golden Set**

   - When you add or change scoring or risk logic, also add/update tests, especially for:
     - Golden test tickers: `NVDA`, `TSLA`, `CRWD`, `PLTR`, `RKLB`, `WKHS`, `RIDE`, `T`, `IBM`, etc.
   - Keep scoring functions **pure** so tests are easy.
   - `scripts/runGoldenSet.ts` must be able to:
     - Run against **real FMP data** when keys are valid.
     - Run against **local mocks** when API calls fail or keys are invalid.

8. **AI / Gemini Integration**

   - Gemini is used to estimate:
     - TAM bucket
     - Revenue type (recurring vs transactional, etc.)
     - Catalysts & asymmetry
     - Pricing power
     - Moat & high-level thesis
   - AI-derived fields:
     - Must be tagged clearly (e.g. `source: 'ai'` or `isAIJudgment: true`).
     - Must **not** overwrite numeric data from FMP.

9. **Code Style**

   - Prefer small, pure functions and clear naming:
     - e.g. `scoreGrowthPillar`, `computeCashRunway`, `buildRiskFlags`.
   - Avoid side effects in scoring/risk modules; orchestration happens in `analyzer.ts` or similar.
   - Keep all thresholds in either:
     - `STRATEGY_PRINCIPLES.md`, or
     - `config/*.ts`.

10. **Legacy Logic**

    - Never delete existing behavior without checking.
    - If you must remove or refactor old v1 logic (e.g. `quantScore.ts`):
      - Keep it behind a feature flag, or
      - Move it to a clearly-marked legacy module until the user confirms it can be removed.

11. **API-Call Budget & Caching**

    - Minimize paid API calls:
      - Centralize all FMP calls in `services/api/fmp.ts`.
      - Prefer **bulk** / batched FMP endpoints when scanning multiple tickers.
      - Cache results per ticker during a run so different modules don’t refetch the same data.
    - No scoring function should directly call HTTP; it should accept **already-fetched data**.

12. **Graceful Failure**

    - On 401/403/429 or network errors from any provider:
      - Log a concise warning.
      - Mark the relevant section as unavailable.
      - Either:
        - Use mock data (in dev/test), or
        - Return `DataUnavailable` with a clear warning.

---

## 4. How to Work on This Repo (Mental Model)

1. **Read the Strategy**

   - Skim `STRATEGY_PRINCIPLES.md` to understand:
     - Pillars (Growth, Unit Economics, Alignment, Valuation, Catalysts).
     - Risk kill switches (cash runway, dilution, fraud/bankruptcy risk, earnings quality).
     - Tier definitions (Tier 1/2/3, disqualified).

2. **Check the Types**

   - Open `types/scoring.ts`, `types/api.ts`, etc.
   - Understand:
     - `MultiBaggerScore` shape.
     - `RiskFlags` shape.
     - Sector enums, revenue type enums, etc.

3. **Flow of Data (Typical Analysis Run)**

   - `scripts/runGoldenSet.ts` or a service calls:
     - `analyzeStock('NVDA')` in `services/analyzer.ts`.
   - `analyzeStock`:
     - Calls FMP wrapper to fetch all needed data for that ticker (ideally in 1–3 grouped calls).
     - Optionally calls Finnhub/Massive if keys are present.
     - Optionally calls Gemini with a **single prompt** that includes:
       - Company profile & sector
       - Revenue history / growth
       - Any news/transcript snippets (if available)
   - Then it:
     - Runs the **Risk Engine**.
     - Computes pillar scores → `MultiBaggerScore`.
     - Computes `TechnicalScore` and `SqueezeSetup`.
     - Assembles a final `AnalysisResult` object.

---

## 5. Gemini Prompt Shape (High-Level Guidance)

When you build/update the Gemini integration, prompts should roughly:

- Remind the model of the AlphaHunter philosophy (compounders, risk first).
- Provide **structured input**:
  - FMP profile & sector
  - Revenue history / growth stats
  - Basic margin & unit-economics info
  - Recent news / transcript snippets (if any)
- Ask for a **strict JSON** response, e.g.:

```jsonc
{
  "tamBucket": "1-5% penetration",
  "revenueType": "subscription",
  "pricingPower": "strong",
  "catalysts": ["...", "..."],
  "asymmetry": "high"
}
Make sure the function that calls Gemini:

Parses and validates the JSON.

Tags the result as AI-derived (source: 'ai').

Does not overwrite numeric FMP fields.

Keep the Gemini prompts and returned JSON in sync with the fields used in scoring, especially for:

TAM & TAM penetration (Pillar A)

Revenue type (Pillar B)

Catalysts, asymmetry, pricing power (Pillar E)

Moat/thesis (used for narrative, not raw score)

sql
Copy code

