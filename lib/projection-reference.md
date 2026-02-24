# Projection structure (from Ed Arroyo Income Summary CSV)

Reference: `Excel Templates/Ed Arroyo - Income Summary - for Upload .csv`

## Row / column layout

- **Row 1**: Title (e.g. "Ed & Rachel Current Income Summary").
- **Row 2**: Headers — Ages (2 cols), Ed Social Security, Rachel Income & Social Security, Ed Pension, Guaranteed Income From 401k (2 cols), 401k, IRA, Roth, Rachel 401k, Annual Total, Monthly Total, Target Goal with Inflation, Guaranteed Income (%).
- **Row 3**: Assumptions — growth rates 7%, 7%, 8%, 7% for the account columns; 2.50% for target goal inflation.
- **Row 4**: Starting ages (59, 57) and **initial balances**: 401k, IRA, Roth, Rachel 401k (e.g. 250000, 250000, 400000, 100000).
- **Row 5**: Optional row (e.g. tax rate, fixed amount).
- **Row 7**: Pre-retirement or FV row — zeros for SS/pension, then **future values at retirement** for 401k, IRA, Roth, Rachel 401k (e.g. 514885, 114490, 116640, 0) after growth from current age to retirement.
- **Row 8+**: One row per year (ages 60–83). Columns:
  - Client age, Spouse age.
  - Client Social Security (starts at 66 in example; $39,000 then COLA).
  - Spouse income (earned income with COLA until retirement, then drops; e.g. $60k → $36k at 63).
  - Spouse SS or combined income column (e.g. $56,400).
  - Client pension (flat $16,411).
  - Guaranteed income from 401k (annuity slice): $16,411.
  - 401k draw, IRA draw, Roth draw, Spouse 401k draw (start at retirement age).
  - Annual total, Monthly total, Target goal (inflation-adjusted), Guaranteed income %.

## Logic to replicate in engine

1. **Ages**: Run from client current age to projected plan age; each row = one year, client age and spouse age both increment.
2. **Earned income**: Client and spouse current income, grown by COLA each year, until respective “stop working” age.
3. **Social Security**: Start at projected SS start age; monthly benefit × 12 (or stored annual), then COLA each year.
4. **Pension**: Fixed amount from start age (no COLA in this example; could add COLA if needed).
5. **Guaranteed income from 401k**: Fixed annuity slice (e.g. from ALIGN conversion) — flat amount from start age.
6. **Account buckets**: Initial balance + growth (e.g. 7% / 8%) from current age to retirement → **FV at retirement**. After retirement, apply **distribution rate** (e.g. % of prior-year balance or amortization) to get annual draw. Draw columns = 401k, IRA, Roth, spouse 401k.
7. **Annual total**: Sum of all income columns for that year.
8. **Monthly total**: Annual total / 12.
9. **Target goal with inflation**: Monthly income goal × (1 + inflation)^(year - base). Compare to monthly total.
10. **Guaranteed income %**: (SS + pension + guaranteed from 401k + any other guaranteed) / annual total, as %.

## Mapping to app state

- **Client / Spouse**: `client.*`, `spouse.*` (ages, retirement age, plan age).
- **Income**: `income.client.currentIncomeAnnual`, `income.spouse.currentIncomeAnnual`, `income.colaPct`, stop working ages.
- **SS**: `guaranteedIncome.socialSecurityClient`, `guaranteedIncome.socialSecuritySpouse` (monthly benefit, start age, COLA).
- **Pension**: `guaranteedIncome.pensions[]` (amount, start age, survivor).
- **Guaranteed from 401k**: ALIGN annuity — `annuityPrime.payoutAmount`, `annuityPrime.incomeStartAge` (flat, no COLA).
- **Accounts**: `accounts[]` (type qualified/roth/cash/insurance, balanceOrContributions, growthRatePct, distributionRatePct). Multiple accounts per type possible; CSV has one 401k, one IRA, one Roth, one Rachel 401k.
- **Target goal**: `client.currentMonthlyIncomeGoal`, `client.inflationForIncomeGoalPct`.

## What would still help (optional)

- A second CSV or sheet that shows the **ALIGN path** (after moving a premium into an annuity): same columns but with “Guaranteed Income From 401k” increased and one account balance reduced, to verify the comparison view.
- Confirmation of whether “Guaranteed Income From 401k” in the CSV is exactly the ALIGN annuity (flat payout from converted premium) or a separate pension/annuity source.
