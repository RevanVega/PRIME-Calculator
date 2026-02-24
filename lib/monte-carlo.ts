import type { ProjectionResult, ProjectionRow } from "./projection-types";

/** Minimal PRIME option shape needed for survivor income */
type PrimeOpt = {
  owner: string;
  benefitOption: string;
  incomeStartAge: number;
  payoutAmount: number;
};

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

/**
 * Survivor Monte Carlo: client dies at deathAge; survivor gets SS = max of two,
 * pension/annuity/rental per survivor % (from survivorPensionByYear),
 * and PRIME only if joint or spouse-owned. Goal = 85% of original.
 *
 * @param survivorPensionByYear - Pre-computed survivor pension income for each year after death.
 *   Callers should use getSurvivorPensionAnnuityRental() to compute this with actual survivorPct values.
 */
export function runSurvivorMonteCarlo(
  projection: ProjectionResult,
  deathAge: number,
  primeOptions: PrimeOpt[],
  historicalReturnsPct: number[],
  numSimulations: number = 1000,
  survivorPensionByYear: number[] = []
): { successRatePct: number; numSuccess: number; numFail: number } | null {
  const survivorRows = projection.rows.filter((r) => r.clientAge >= deathAge);
  if (survivorRows.length === 0) return null;

  const deathRow = projection.rows.find((r) => r.clientAge === deathAge);
  const totalFV = deathRow?.portfolioTotalAtStartOfYear ?? 0;
  if (totalFV <= 0 && survivorRows.some((r) => (r.targetGoalAnnual ?? 0) * 0.85 > 0)) {
    return { successRatePct: 0, numSuccess: 0, numFail: numSimulations };
  }

  const neededFromPortfolioByYear = survivorRows.map((row: ProjectionRow, i: number) => {
    const goal = row.targetGoalAnnual * 0.85;
    const ssSurvivor = Math.max(row.socialSecurityClient ?? 0, row.socialSecuritySpouse ?? 0);
    // Use pre-computed survivor pension income (includes actual survivorPct from each pension/annuity)
    const pensionSurvivor = survivorPensionByYear[i] ?? 0;
    let primeSurvivor = 0;
    for (const opt of primeOptions) {
      if (row.clientAge < opt.incomeStartAge) continue;
      if (
        opt.owner === "client" &&
        opt.benefitOption !== "joint"
      ) continue;
      primeSurvivor += opt.payoutAmount ?? 0;
    }
    const survivorGuaranteed = ssSurvivor + pensionSurvivor + primeSurvivor;
    const earnedSpouse = row.earnedIncomeSpouse ?? 0;
    return Math.max(0, goal - survivorGuaranteed - earnedSpouse);
  });

  const n = historicalReturnsPct.length;
  if (n === 0) return { successRatePct: 0, numSuccess: 0, numFail: numSimulations };

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
      const returnPct = historicalReturnsPct[Math.floor(Math.random() * n)];
      balance = (balance - needed) * (1 + returnPct / 100);
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
