import type { ProjectionResult } from "./projection-types";

/**
 * Monte Carlo: withdraw only what's needed to meet the income goal each year
 * (goal − guaranteed income). No fixed assumptions — we cap portfolio withdrawals
 * at the amount required to hit the goal. Bootstrap historical returns.
 * Success = portfolio never runs out before we can fund the goal every year.
 */
export function runMonteCarlo(
  projection: ProjectionResult,
  historicalReturnsPct: number[],
  numSimulations: number = 1000
): { successRatePct: number; numSuccess: number; numFail: number } {
  const retirementRows = projection.rows.filter(
    (r) => r.clientAge >= projection.retirementAge
  );
  if (retirementRows.length === 0) {
    return { successRatePct: 0, numSuccess: 0, numFail: numSimulations };
  }

  const fv = projection.futureValuesAtRetirement;
  const totalFV =
    fv.qualified + fv.roth + fv.taxable + fv.cash + fv.insurance;

  // Each year: only withdraw from portfolio what's needed to reach income goal
  // (goal − guaranteed income). No excess withdrawals.
  const neededFromPortfolioByYear = retirementRows.map((row) => {
    const goal = row.targetGoalAnnual;
    const guaranteed = row.guaranteedDollars;
    return Math.max(0, goal - guaranteed);
  });

  const n = historicalReturnsPct.length;
  if (n === 0) {
    return { successRatePct: 0, numSuccess: 0, numFail: numSimulations };
  }

  let numSuccess = 0;
  const numYears = neededFromPortfolioByYear.length;

  for (let sim = 0; sim < numSimulations; sim++) {
    let balance = totalFV;
    let success = true;
    for (let y = 0; y < numYears; y++) {
      const needed = neededFromPortfolioByYear[y];
      if (balance < needed) {
        success = false;
        break;
      }
      const withdrawal = needed;
      const returnPct = historicalReturnsPct[Math.floor(Math.random() * n)];
      balance = (balance - withdrawal) * (1 + returnPct / 100);
      if (balance < 0) {
        success = false;
        break;
      }
    }
    if (success) numSuccess++;
  }

  const numFail = numSimulations - numSuccess;
  const successRatePct = (numSuccess / numSimulations) * 100;
  return { successRatePct, numSuccess, numFail };
}
