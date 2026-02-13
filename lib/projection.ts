import type { CalculatorState } from "./types";
import type { ProjectionRow, ProjectionResult, FutureValuesAtRetirement } from "./projection-types";
import type { AccountType } from "./types";

const COLA = (value: number, colaPct: number, years: number) =>
  value * Math.pow(1 + colaPct / 100, years);

/** Aggregate account balances, contributions, and rates by type */
function aggregateAccountsByType(state: CalculatorState) {
  const agg: Record<AccountType, { balance: number; contributions: number; growthPct: number; distributionPct: number }> = {
    qualified: { balance: 0, contributions: 0, growthPct: 0, distributionPct: 0 },
    roth: { balance: 0, contributions: 0, growthPct: 0, distributionPct: 0 },
    taxable: { balance: 0, contributions: 0, growthPct: 0, distributionPct: 0 },
    cash: { balance: 0, contributions: 0, growthPct: 0, distributionPct: 0 },
    insurance: { balance: 0, contributions: 0, growthPct: 0, distributionPct: 0 },
  };
  for (const a of state.accounts) {
    agg[a.type].balance += a.balance;
    agg[a.type].contributions += a.contributions;
    if (agg[a.type].growthPct === 0) agg[a.type].growthPct = a.growthRatePct;
    if (agg[a.type].distributionPct === 0) agg[a.type].distributionPct = a.distributionRatePct;
  }
  return agg;
}

/** Compute FV at retirement: each year balance = (balance + contributions) * (1 + growth) */
function futureValuesAtRetirement(
  state: CalculatorState,
  retirementAge: number,
  primePremiumDeduction: { type: AccountType; amount: number } | null
): FutureValuesAtRetirement {
  const agg = aggregateAccountsByType(state);
  const years = Math.max(0, retirementAge - state.client.currentAge);
  const fv: FutureValuesAtRetirement = {
    qualified: 0,
    roth: 0,
    taxable: 0,
    cash: 0,
    insurance: 0,
  };
  const types: AccountType[] = ["qualified", "roth", "taxable", "cash", "insurance"];
  for (const t of types) {
    let balance = agg[t].balance;
    if (primePremiumDeduction && primePremiumDeduction.type === t)
      balance = Math.max(0, balance - primePremiumDeduction.amount);
    const g = agg[t].growthPct / 100;
    const contrib = agg[t].contributions;
    for (let y = 0; y < years; y++) {
      balance = (balance + contrib) * (1 + g);
    }
    fv[t] = balance;
  }
  return fv;
}

/** Run full projection: current path (usePrimeAnnuity = false) or PRIME path (usePrimeAnnuity = true) */
export function runProjection(state: CalculatorState, usePrimeAnnuity: boolean): ProjectionResult {
  const startAge = state.client.currentAge;
  const endAge = state.client.projectedPlanAge;
  const retirementAge = state.client.projectedRetirementAge;
  const hasSpouse = state.hasSpouse;
  const spouseStartAge = state.spouse.currentAge;
  const colaPct = state.income.colaPct;

  const primeDeduction =
    usePrimeAnnuity && state.annuityPrime && state.annuityPrime.premiumAmount > 0
      ? { type: state.annuityPrime.referencedAccountType, amount: state.annuityPrime.premiumAmount }
      : null;

  const fv = futureValuesAtRetirement(state, retirementAge, primeDeduction);
  const agg = aggregateAccountsByType(state);

  const rows: ProjectionRow[] = [];
  let qualifiedBalance = fv.qualified;
  let rothBalance = fv.roth;
  let taxableBalance = fv.taxable;
  let cashBalance = fv.cash;
  let insuranceBalance = fv.insurance;

  const primeAnnualPayout =
    usePrimeAnnuity && state.annuityPrime && state.annuityPrime.payoutAmount > 0
      ? state.annuityPrime.payoutAmount * 12
      : 0;
  const primeStartAge = state.annuityPrime?.incomeStartAge ?? 65;

  for (let yearIndex = 0; yearIndex <= endAge - startAge; yearIndex++) {
    const clientAge = startAge + yearIndex;
    const spouseAge = hasSpouse ? spouseStartAge + yearIndex : 0;

    let earnedIncomeClient = 0;
    if (clientAge < state.income.client.stopWorkingAge)
      earnedIncomeClient = COLA(state.income.client.currentIncomeAnnual, colaPct, yearIndex);
    let earnedIncomeSpouse = 0;
    if (hasSpouse && spouseAge < state.income.spouse.stopWorkingAge)
      earnedIncomeSpouse = COLA(state.income.spouse.currentIncomeAnnual, colaPct, yearIndex);
    for (const side of state.income.sideIncomeEntries) {
      if (clientAge >= side.startAge && clientAge <= side.endAge)
        earnedIncomeClient += COLA(side.amount, colaPct, Math.max(0, yearIndex - (side.startAge - startAge)));
    }
    const earnedIncome = earnedIncomeClient + earnedIncomeSpouse;

    const ssClient =
      clientAge >= state.guaranteedIncome.socialSecurityClient.startAge
        ? COLA(
            state.guaranteedIncome.socialSecurityClient.monthlyBenefit * 12,
            state.guaranteedIncome.socialSecurityClient.colaPct,
            clientAge - state.guaranteedIncome.socialSecurityClient.startAge
          )
        : 0;
    const ssSpouse =
      hasSpouse && spouseAge >= state.guaranteedIncome.socialSecuritySpouse.startAge
        ? COLA(
            state.guaranteedIncome.socialSecuritySpouse.monthlyBenefit * 12,
            state.guaranteedIncome.socialSecuritySpouse.colaPct,
            spouseAge - state.guaranteedIncome.socialSecuritySpouse.startAge
          )
        : 0;
    const socialSecurity = ssClient + ssSpouse;

    let pension = 0;
    let pensionOtherRentalClient = 0;
    let pensionOtherRentalSpouse = 0;
    for (const p of state.guaranteedIncome.pensions) {
      if (clientAge >= p.startAge) {
        const amt = COLA(p.amount * 12, p.colaPct, clientAge - p.startAge);
        pension += amt;
        if (p.owner === "spouse") pensionOtherRentalSpouse += amt;
        else pensionOtherRentalClient += amt;
      }
    }
    let otherAnnuities = 0;
    for (const a of state.guaranteedIncome.annuities) {
      if (clientAge >= a.startAge) {
        const amt = COLA(a.amount * 12, a.colaPct, clientAge - a.startAge);
        otherAnnuities += amt;
        if (a.owner === "spouse") pensionOtherRentalSpouse += amt;
        else pensionOtherRentalClient += amt;
      }
    }
    let rental = 0;
    for (const r of state.guaranteedIncome.rentals) {
      if (clientAge >= r.startAge) {
        const amt = COLA(r.amount * 12, r.colaPct, clientAge - r.startAge);
        rental += amt;
        if (r.owner === "spouse") pensionOtherRentalSpouse += amt;
        else pensionOtherRentalClient += amt;
      }
    }

    const guaranteedFromPrime = clientAge >= primeStartAge ? primeAnnualPayout : 0;

    const distQ = agg.qualified.distributionPct / 100;
    const distR = agg.roth.distributionPct / 100;
    const distT = agg.taxable.distributionPct / 100;
    const distC = agg.cash.distributionPct / 100;
    const distI = agg.insurance.distributionPct / 100;
    const growQ = 1 + agg.qualified.growthPct / 100;
    const growR = 1 + agg.roth.growthPct / 100;
    const growT = 1 + agg.taxable.growthPct / 100;
    const growC = 1 + agg.cash.growthPct / 100;
    const growI = 1 + agg.insurance.growthPct / 100;

    let drawQualified = 0,
      drawRoth = 0,
      drawTaxable = 0,
      drawCash = 0,
      drawInsurance = 0;
    if (clientAge >= retirementAge) {
      drawQualified = qualifiedBalance * distQ;
      drawRoth = rothBalance * distR;
      drawTaxable = taxableBalance * distT;
      drawCash = cashBalance * distC;
      drawInsurance = insuranceBalance * distI;
      qualifiedBalance = (qualifiedBalance - drawQualified) * growQ;
      rothBalance = (rothBalance - drawRoth) * growR;
      taxableBalance = (taxableBalance - drawTaxable) * growT;
      cashBalance = (cashBalance - drawCash) * growC;
      insuranceBalance = (insuranceBalance - drawInsurance) * growI;
    }

    const accountDraws = {
      qualified: drawQualified,
      roth: drawRoth,
      taxable: drawTaxable,
      cash: drawCash,
      insurance: drawInsurance,
    };

    const annualTotal =
      earnedIncome +
      socialSecurity +
      pension +
      otherAnnuities +
      rental +
      guaranteedFromPrime +
      drawQualified +
      drawRoth +
      drawTaxable +
      drawCash +
      drawInsurance;

    const monthlyTotal = annualTotal / 12;
    const targetGoalAnnual =
      state.client.currentMonthlyIncomeGoal * 12 * Math.pow(1 + state.client.inflationForIncomeGoalPct / 100, yearIndex);
    const guaranteedDollars =
      socialSecurity + pension + otherAnnuities + rental + guaranteedFromPrime;
    const guaranteedPct = annualTotal > 0 ? (guaranteedDollars / annualTotal) * 100 : 0;

    rows.push({
      yearIndex,
      clientAge,
      spouseAge,
      earnedIncome,
      earnedIncomeClient,
      earnedIncomeSpouse,
      socialSecurity,
      socialSecurityClient: ssClient,
      socialSecuritySpouse: ssSpouse,
      pension,
      otherAnnuities,
      rental,
      pensionOtherRentalClient,
      pensionOtherRentalSpouse,
      guaranteedFromPrime,
      accountDraws,
      annualTotal,
      monthlyTotal,
      targetGoalAnnual,
      guaranteedDollars,
      guaranteedPct,
    });
  }

  return {
    rows,
    futureValuesAtRetirement: futureValuesAtRetirement(state, retirementAge, null),
    retirementAge,
  };
}
