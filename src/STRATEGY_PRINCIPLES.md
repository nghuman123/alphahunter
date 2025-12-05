# AlphaHunter Strategy Principles

**File:** `STRATEGY_PRINCIPLES.md`  
**Document Version:** 1.0  
**Last Updated:** 2025-11-30  
**Authors:** Nirvair + LLM Co-pilot

This document is the **source of truth** for how AlphaHunter evaluates and ranks stocks.  
All scoring logic, prompts, and refactors **must** remain consistent with this specification.

---

## 1. Philosophy

AlphaHunter is a **compounder-hunting system**.

> **Goal:** Find *compounder-type multi-baggers* (5–20x) over 5–10+ years.  
> **Not:** Meme trades, deep-value cigar butts, or binary lottery biotech.

Core beliefs:

1. Big winners share common DNA:
   - Relatively **small starting base**
   - **Massive TAM** with low penetration
   - Strong **unit economics** and **capital efficiency**
   - **Aligned insiders** (founder-led, skin in the game)
   - A **reasonable entry price**, not necessarily “cheap”
2. **Risk first, score second:**  
   If fundamental risk is unacceptable, the stock is discarded regardless of upside.
3. **Technicals & short interest** are used for **timing and position sizing**,  
   **not** to define business quality.

---

## 2. Hierarchy of Truth (Decision Order)

AlphaHunter always follows this hierarchy:

1. **Risk Engine** → Kill switches and major red flags  
2. **MultiBaggerScore (0–100)** → Fundamental quality & upside  
3. **TechnicalScore (0–25) & SqueezeSetup (0–10)** → Timing / setup  
4. **Portfolio Construction Rules** → Position sizing & diversification

If the Risk Engine disqualifies a stock, **everything below it is ignored**.

---

## 3. Universe & Exclusions

AlphaHunter does **not** attempt to score every listed security.

### 3.1 Universe Filter (Approximate Guidelines)

- Minimum **market cap** threshold (to avoid illiquid micro-pennies).
- Minimum **liquidity** (e.g. daily dollar volume).
- Basic exclusions via screener (e.g. FMP):
  - Sub-$1 penny stock junk (unless explicitly whitelisted).
  - Active bankruptcy / delisting proceedings.
  - Obvious shell companies.

These filters can be refined over time, but they should exist **before** scoring.

---

## 4. Risk Engine Principles (Kill Switches)

The **Risk Engine** produces `RiskFlags`. Its job is to answer:

> “Is this business structurally too dangerous for our strategy?”

If `riskFlags.disqualified === true`, the stock is **out**, regardless of its MultiBaggerScore.

### 4.1 Hard Disqualifiers

Disqualify if **any** of the following are true (with sector-specific thresholds where noted):

#### Cash Runway

**Cash Runway Calculation:**

- **Quarterly Cash Burn**  
  `Quarterly Burn = Average of last 4 quarters of [-(Operating Cash Flow - CapEx)]`  
  (i.e. cash *used* by operations and investments)

- **Cash Runway (quarters)**  
  `Runway = (Cash + Short-Term Investments) / Quarterly Burn`

- If Operating Cash Flow is **positive** and exceeds CapEx (sustained) →  
  Company is effectively self-funding → treat runway as **“sufficient / infinite”** for this system.

**Disqualify when:**

- For non-profitable / heavy R&D businesses:
  - Runway < **6 quarters** → Disqualify.
- For more stable/profitable names:
  - Runway < **4 quarters** → Disqualify.
- For early-stage biotech / deep tech:
  - Runway < **18 months** *and* no late-stage (Phase 2+) or analogous assets → Disqualify.

#### Extreme Dilution

- Share count CAGR > **~10–12%** over 3–5 years **without clear justification** → Disqualify or mark with strong `disqualifyReasons`.

#### Beneish M-Score (Fraud Risk)

Use Beneish as a fraud *signal*, not a blunt hammer.

- For mature, cash-flow positive companies  
  (e.g. revenue ≥ ~$200M **and** sustainably positive operating cash flow):

  - M > 0.0 → **Hard Disqualifier** (strong fraud/accounting red flag).
  - -0.5 ≤ M ≤ 0.0 → **Red Warning** (do not auto-disqualify, but reduce conviction/size).
  - < -0.5 → No action from Beneish alone.

- For pre-revenue / early-stage / deep-tech / SPAC-type names  
  (revenue < ~$200M or clearly in heavy investment phase):

  - Never hard-disqualify *solely* on Beneish.
  - Treat high M-scores as **warnings** and lean more on:
    - Cash runway
    - Dilution
    - Quality-of-earnings patterns

#### Altman Z-Score (Bankruptcy Risk)

- For small/mid caps (Market Cap < ~$20B):
  - Z < 0.0 → **Hard Disqualifier** (structural distress).
  - 0.0 ≤ Z < 1.8 → **Warning** (distress zone; reduce conviction/size).

- For large caps (Market Cap ≥ ~$20B) with strong business franchises:
  - Z < 1.8 → **Warning only**, not an automatic disqualification.
  - Rely more on:
    - Cash generation
    - Interest coverage
    - Debt maturity profile


#### Quality of Earnings (FCF vs Net Income)

- **Pattern:** Net Income consistently **positive** while Operating Cash Flow is **negative** or much lower for **≥ 2 consecutive years** (or ≥ 6 quarters).
  - Interpretation: Potential aggressive revenue recognition / accounting tricks.
  - Action: Set `qualityOfEarnings = 'Fail'` and Disqualify or add strong `disqualifyReasons`.

### 4.2 Warnings (Yellow Flags)

Generate `warnings` but **do not automatically disqualify** for:

- Elevated but not catastrophic **short interest**.
- High leverage but manageable runway and strong cash generation.
- Customer concentration, governance concerns, or other significant but not fatal issues.

Warnings should **reduce conviction and position size**, but not kill the idea alone.

---

## 5. MultiBaggerScore (0–100)

The **MultiBaggerScore** measures the **fundamental attractiveness** of a stock  
as a long-term compounder.

It is composed of five pillars:

1. **Growth & TAM** – 35 pts  
2. **Unit Economics & Capital Efficiency** – 25 pts  
3. **Alignment & Sponsorship** – 20 pts  
4. **Valuation & Asymmetry** – 10 pts  
5. **Catalysts & Optionality (incl. Pricing Power)** – 10 pts  

Total: **0–100**.

---

### 5.1 Pillar A – Growth & TAM (35 pts)

**Question:** Is this getting big fast, with a long runway?

#### A1. 3-Year Revenue CAGR (15 pts)

Score based on 3-year revenue CAGR:

- ≥ 40% → 15  
- 25–40% → 12  
- 15–25% → 8  
- 10–15% → 4  
- < 10% → 0  

#### A2. Growth Acceleration (10 pts)

**Definition:** Compare **YoY revenue growth** across the **last 4–8 quarters**.

- **Accelerating (10 pts):**  
  - At least **3 consecutive quarters** where YoY growth rate is **increasing**.
- **Flat / Mixed (5 pts):**  
  - No clear trend; some up, some down, overall stable.
- **Decelerating (0 pts):**
  - At least **3 consecutive quarters** where YoY growth rate is **decreasing**.

**Example:**

- Q1: +25%, Q2: +28%, Q3: +32%, Q4: +35% → **Accelerating** → 10 pts  
- Q1: +30%, Q2: +28%, Q3: +25%, Q4: +22% → **Decelerating** → 0 pts  

#### A3. TAM Penetration (10 pts)

Use AI + research (Gemini) to estimate TAM and penetration bucket.

- 1–5% penetration (sweet spot) → 10  
- < 1% (very early, more execution risk) → 6  
- 5–10% → 6  
- > 10% (maturity; deceleration likely) → 2  

---

### 5.2 Pillar B – Unit Economics & Capital Efficiency (25 pts)

**Question:** Does each incremental dollar of growth create a lot of value?

Sector-specific thresholds are handled via config (see §7).

#### B1. Gross Margin Level (10 pts)

Sector-adjusted:

- Top-tier margin for sector → 10  
- Mid-range → 5  
- Low margin for sector → 0  

#### B2. Gross Margin Trend (5 pts)

- Expanding → 5  
- Stable → 2  
- Contracting → 0  

#### B3. Revenue Quality Type (5 pts)

Classify revenue (via AI or rule-based classification):

- Recurring / subscription / usage-based → 5  
- Consumable / high-frequency repeat (razor/blades, consumables) → 4  
- Regular but discretionary consumer → 3  
- One-time hardware → 1  
- Project-based / lumpy → 0  

#### B4. ROIC (Simplified) (5 pts)

We distinguish between **profitable** and **pre-profit / high-growth** companies.

**For profitable companies (positive earnings, meaningful ROIC):**

- ROIC > 15% → 5  
- ROIC 8–15% → 3  
- ROIC < 8% → 0  

**For pre-profit / high-growth companies (negative or non-meaningful ROIC):**

Use **Gross Margin + Revenue Growth** as a proxy for capital efficiency:

- Gross Margin > 60% **AND** Revenue Growth > 30% → 4  
- Gross Margin > 50% **AND** Revenue Growth > 20% → 2  
- Otherwise → 0  

This prevents penalizing truly early-stage high-quality growth companies solely because they are still investing heavily.

---

### 5.3 Pillar C – Alignment & Sponsorship (20 pts)

**Question:** Are the right people aligned and involved?

#### C1. Founder / Insider Ownership (10 pts)

- Founder-led **and** insiders own:
  - > 15% → 10  
  - 5–15% → 7  
  - 1–5% → 3  
  - < 1% → 0  

#### C2. Insider Buying (Last 6–12 Months) (5 pts)

- Net insider **buying** (by dollar value) → 5  
- Mixed / neutral → 2  
- Net **heavy selling** → 0  

#### C3. Institutional Ownership (Simplified v1) (5 pts)

Use institutional ownership % as a proxy:

- 30–70% → 5 (sweet spot: owned but not over-owned)  
- > 70% → 3 (crowded; upside more limited)  
- < 30% → 2 (under-discovered; higher risk, but possible upside)

More granular 13F-based accumulation can be added later as v2.

---

### 5.4 Valuation (Pillar D) – Growth-Adjusted

For multi-baggers, **valuation must be tied to growth and quality**, not raw “cheapness”.

We use a hierarchy:

1. **PSG (Price-to-Sales relative to Growth)** – best for:
   - High-growth, still-scaling SaaS / platforms where EPS is noisy.
   - Rule of 40 type names.

2. **PEG (Price-to-Earnings relative to Growth)** – best for:
   - Profitable compounders with relatively stable earnings (AAPL, MSFT, COST, etc.).

3. **Fallbacks** – when neither PSG nor PEG are reliable:
   - Use sector-normalized EV/EBITDA or FCF Yield, but only as a **weak** signal.

#### 5.4.1 Combined Growth-Adjusted Valuation Score

For each stock:

- Compute `psgScore` from PSG relative to sector peers (z-scores / percentiles).
- If we have a **reasonable EPS and growth estimate**, also compute `pegScore` relative to sector peers.
- If both exist:
  - `valuationScore = 0.5 * psgScore + 0.5 * pegScore`
- If only one exists:
  - `valuationScore = that one score`

This prevents names like META/GOOGL/AAPL from being punished just because their raw P/S looks “high” relative to deep value, while also avoiding “PSG worship” for cyclicals and mature compounders.

#### 5.4.2 Valuation Weight in Overall Quant Score

For **multi-bagger discovery**, valuation is a **sanity check**, not the primary driver:

- Growth × Quality: ~60%
- Valuation: ~20%
- Momentum & Ownership: ~20%

We explicitly **do not** want a deep-value bias that would down-rank NVDA/TSLA/AAPL purely because they trade at premium multiples vs. the broader market, so long as:
- growth is strong,
- ROIC/ROE is high, and
- moats and reinvestment runways are intact.


### 5.5 Pillar E – Catalysts & Optionality (10 pts)

**Question:** Is there meaningful upside beyond what’s already priced in?

AI (Gemini) is used to read news, filings, and transcripts.

#### E1. Catalyst Density (5 pts)

- 3+ clear catalysts in next 6–24 months → 5  
- 1–2 solid catalysts → 3  
- No obvious catalysts → 0  

Examples: major product launches, large new contracts, regulatory approvals, new geographies, step-change platform deals.

#### E2. Asymmetry / Optionality (5 pts)

AI-assessed:

- High asymmetry (big upside if catalysts succeed, manageable downside if they fail) → 5  
- Medium → 3  
- Low (mostly defensive / incremental) → 0  

#### Pricing Power (Included Within This Pillar)

Gemini should explicitly analyze **pricing power**:

- Evidence of successful price increases with stable volumes/churn → treat as stronger catalysts/optionality (small boost within this pillar).
- Persistent discounting/promos and margin compression → reduce effective score or add warnings.

Pillar E total should still be capped at **10 points** overall.

---

### 5.6 Final Score & Tiers

- **MultiBaggerScore = sum of all pillar scores (0–100).**

Tier definitions:

- **Tier 1 (Core Multi-Bagger Candidates):**  
  `MultiBaggerScore ≥ 85`
- **Tier 2 (Strong Candidates / Watchlist):**  
  `70–84`
- **Tier 3 (Speculative / Early / Incomplete Data):**  
  `55–69`
- **Below 55:**  
  Not interesting for this strategy.

---

## 6. Technical & Squeeze Overlay

Technicals and squeeze dynamics **do not change the MultiBaggerScore**.  
They influence **timing** and **position sizing** only.

### 6.1 TechnicalScore (0–25)

**Goal:** Is the stock in a constructive trend?

Sub-components:

1. **Relative Strength vs SPY/QQQ (0–10)**  
   Outperformance over ~12 months:

   - > 20% → 10  
   - 5–20% → 7  
   - 0–5% → 3  
   - Underperforming → 0  

2. **Above 200-Day Moving Average (0–10)**  

   - Price > 200-DMA → 10  
   - Within ±5% of 200-DMA → 5  
   - Clearly below 200-DMA → 0  

3. **Proximity to 52-Week High (0–5)**  

   - Within 15% of 52-week high → 5  
   - 15–30% below → 3  
   - > 30% below → 1  

A high TechnicalScore indicates a supportive trend and can justify faster accumulation.

### 6.2 SqueezeSetup (0–10)

**Goal:** Identify high-quality names that might have **asymmetric short-squeeze setups**.

Tiered conditions:

- **Strong Setup**
  - MultiBaggerScore ≥ 75  
  - Short interest ≥ 20%  
  - Days-to-cover ≥ 5  
  - → High `squeezeScore`, label `"Strong"`.

- **Moderate Setup**
  - MultiBaggerScore ≥ 65  
  - Short interest ≥ 15%  
  - Days-to-cover ≥ 3  
  - → Medium `squeezeScore`, label `"Moderate"`.

- **Watch Setup**
  - MultiBaggerScore ≥ 55  
  - Short interest ≥ 10%  
  - → Low `squeezeScore`, label `"Watch"`.

If fundamentals are weak (low MultiBaggerScore or disqualified), **high short interest is a warning**, not an opportunity.

---

## 7. Sector Context & Factor Normalization

Raw thresholds like “Gross Margin > 50%” are not robust across time or sectors.  
Instead, the Quant engine should treat most metrics as **sector-relative factors**, normalized every rebalance period.

### 7.1 Sector Buckets

We still group companies into broad buckets:

- Software / SaaS
- Semiconductors
- Consumer Platforms (e-commerce, marketplaces)
- Consumer Staples / Retail (incl. Costco-style membership)
- Industrials / Energy / Materials
- Financials / Fintech
- “Other / Mixed” for edge cases

`config/sectorThresholds.ts` remains the **configuration brain** for:

- mapping tickers → sector bucket
- specifying **minimum data requirements** per sector (e.g. min margin years)
- providing **fallback thresholds** when we do not have enough peers for proper normalization

### 7.2 Factor Normalization (Z-Scores / Percentiles)

For each rebalance date:

1. **Within each sector bucket**, compute:
   - Mean and standard deviation for each continuous factor (e.g. Gross Margin, Operating Margin, Revenue Growth, ROIC, Rule of 40, etc.).
   - Optionally use robust stats (median / MAD) later; for now mean / std is acceptable.

2. **Convert raw values to sector-relative scores**:
   - `z = (value − sectorMean) / sectorStd`
   - Or directly map to **percentiles** within the sector.

3. **Map z-scores / percentiles to 0–100 factor points**:
   - Bottom 10% of sector → ~0–20 points
   - Median sector player → ~45–55 points
   - Top 10% of sector → ~80–100 points

4. **Interpretation**:
   - A Costco-style retailer with ~12% gross margin can still score **80–90** on “Gross Margin” if it sits in the top decile vs. other retailers.
   - A SaaS name with 78% GM might only get ~60 points if the entire sector has very high margins and it is only average.

### 7.3 Role of `sectorThresholds.ts`

`config/sectorThresholds.ts` is still critical but its role is now:

- Specify any **hard structural constraints** per sector:
  - e.g. “SaaS Gross Margin < 40% ⇒ cap unit-economics score”
  - e.g. “Retail Gross Margin < 5% ⇒ unit-economics floor of 0”
- Provide **minimum sample sizes** for normalization:
  - If a sector has fewer than N peers with valid data, fall back to configured absolute thresholds rather than z-scores.
- Document **edge-case overrides**, e.g.:
  - “Banks: ignore Gross Margin factor; substitute NIM or ROE factor.”

The default behavior for mature sectors (Software, Semis, Consumer Platforms, Retail, etc.) should be:

> “Use sector-relative normalized scores first, then apply sectorThresholds as guardrails and floors/ceilings – not as the *primary* scoring method.”


Principle:
All sector-specific thresholds live in config, not hardcoded throughout scoring logic.

8. Portfolio Construction Principles

Once Risk, MultiBaggerScore, TechnicalScore, and SqueezeSetup are known:

8.1 Position Sizing by Tier

Guidelines:

Tier 1 (≥ 85):

5–8% position each (core holdings).

Tier 2 (70–84):

3–5% positions (strong but slightly less conviction or higher risk).

Tier 3 (55–69):

1–3% starter positions / watchlist names.

Disqualified or <55:

0% (no new position).

TechnicalScore and SqueezeSetup influence whether to immediately size to the top of the range, or accumulate slowly.

8.2 Diversification & Risk Limits

Max 25% of portfolio in any single sector.

Max 40% in one broad theme (e.g. AI, semis, space).

Total positions roughly 10–25.

Limit the number of very early-stage / high-spec names (e.g. Tier 3 with weak cash flow) to a small slice of the portfolio.

8.3 Sell / Trim Guidelines

Consider trimming or exiting when:

MultiBaggerScore drops below ~60 and does not recover.

RiskFlags move to disqualified (new severe risk).

Growth structurally collapses or pricing power is clearly lost.

Valuation becomes extremely stretched while fundamentals decelerate.

Better ideas exist with clearly superior scores and cleaner risk.

9. Data Quality & AI Usage
9.1 Minimum Data Requirements

To generate a valid MultiBaggerScore, require at minimum:

≥ 4 quarters of income statement data.

Current price and market cap.

Current gross margin.

Revenue history sufficient to compute at least 2 years of growth (ideally 3-year CAGR).

If critical data is missing:

If < 4 quarters of financials → Do not score; mark as "Insufficient Data".

If insider ownership unavailable → Use 0 for C1 and add a data quality warning.

If TAM cannot be reasonably estimated → Default TAM score to 5 (neutral) and mark as AI-estimated in data quality.

9.2 Data Quality Principles

Real data > AI estimates
Prefer reported financials (FMP, Finnhub, filings).

Low data quality = lower conviction
Heavy reliance on AI estimates should:

Push names toward Tier 3 or smaller position sizes.

Be clearly labeled in the analysis.

AI is used to enhance:

TAM estimation

Revenue type classification

Catalysts & asymmetry

Pricing power assessment

It must not silently override real numbers.

10. Change Management & Testing

Any changes to these principles must follow this process:

Spec First

Update this STRATEGY_PRINCIPLES.md with the new rule or weighting.

Implementation Second

Update scoring/risk code to match the spec (no ad-hoc logic).

Testing

Add/adjust unit tests for new scoring logic.

Run a golden set of known tickers (see Appendix) through the system:

Tier 1 should mostly be historic winners.

Disqualified / low scores should align with known disasters.

Backtesting

Compare performance vs previous versions and benchmarks.

Deployment

Only after passing tests and backtests should real-money decisions use the new logic.

This ensures AlphaHunter remains a disciplined, rules-based system, not a collection of ad-hoc tweaks.

Appendix: Golden Test Set

Use this Golden Set to validate that scoring logic matches real-world intuition and historical outcomes.

Expected Tier 1 (Historic Winners)

These should generally score Tier 1 (≥ 85) during their strong compounding phases:

NVDA (2016–2020) – Explosive growth, high margins, huge TAM.

TSLA (2019–2021) – Hyper-growth, improving margins, large TAM.

CRWD (2020–2022) – High growth, recurring revenue, strong unit economics.

Expected Tier 2 / Tier 3 (Good but Flawed / Higher Risk)

These should score in the 70–84 (Tier 2) or 55–69 (Tier 3) range:

PLTR – Strong moat/story, but growth/valuation/earnings quality trade-offs.

RKLB – Good story and TAM, but execution and funding risk.

Expected Disqualified (Historic Disasters / Frauds)

These should trigger disqualification via risk flags or at least extremely low scores:

WKHS – Dilution plus weak fundamentals; should fail dilution/runway checks.

RIDE – Accounting/viability concerns; should fail quality-of-earnings/fraud-related checks.

(Analogous names for future: businesses failing cash runway + dilution + quality-of-earnings tests.)

Expected Low Score / Not Interesting

These should not appear as attractive multi-baggers:

T (AT&T) – Low growth, limited TAM expansion; likely low Growth & TAM scores.

IBM (pre-2020) – Declining or stagnant revenue; likely poor acceleration and TAM.

### Point-in-Time (PIT) Data – No Look-Ahead

All backtests **must** use point-in-time (PIT) data, not today’s restated fundamentals.

- **Why it matters**
  - A real investor in 2017 didn’t know 2024 revenue, margins, or “cleaned up” restatements.
  - Using today’s TTM or revised statements to simulate a 2017 decision introduces **look-ahead bias** and makes the strategy look unrealistically good.

- **Requirements**
  - For each backtest decision date **D**, only use financials and key metrics that were **available as of D**:
    - Quarterly income statement, balance sheet, cash flow up to and including the last reported quarter before D.
    - Trailing 12-month (TTM) values **constructed from those quarters** (not from a later API snapshot).
    - Growth rates computed from **historical** values up to D, not using future quarters.

- ### Quant vs Antigravity (AI) – Who Wins?

- The **Quant engine** is:
  - A **safety net** (kill bad balance sheets / fraud / garbage dilution).
  - A **prior** for growth, quality, valuation, and momentum.

- The **Antigravity AI layer** is:
  - A **pattern matcher** trained (via prompts + examples) to recognize early compounders and asymmetric bets.
  - Allowed to “override” modest quant scores when:
    - `antigravityVerdict = "STRONG_PASS"`
    - `conviction ≥ 80`
    - Moat, growth runway, and capital allocation are all scored highly.

**Policy:**

- If AI says **STRONG_PASS, Tier 1, conviction ≥ 80**:
  - Final Tier must be **Tier 1**.
  - Final Score should land in roughly the **75–95** range, even if raw quantScore is only 40–60.
- If AI says **MONITOR_ONLY** or conviction is low:
  - Final Tier should lean more heavily on quantScore and risk penalties.
- If the AI call **fails (e.g. JSON parse error)**:
  - Treat this as an **infrastructure bug** – log loudly – rather than silently pretending “no AI signal”.
  - The Golden Set calibration assumes that high-quality names like CRWD/SHOP actually receive AI overlays.


