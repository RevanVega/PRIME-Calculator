import type { CalculatorState } from "./types";
import type { ProjectionRow, ProjectionResult, FutureValuesAtRetirement } from "./projection-types";
import type { AccountType } from "./types";

type Owner = "client" | "spouse";

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

/** Aggregate by (type, owner) for per-owner draws */
function aggregateByTypeAndOwner(state: CalculatorState) {
  const types: AccountType[] = ["qualified", "roth", "taxable", "cash", "insurance"];
  const owners: Owner[] = ["client", "spouse"];
  const agg: Record<AccountType, Record<Owner, { balance: number; contributions: number; growthPct: number; distributionPct: number }>> = {} as Record<
    AccountType,
    Record<Owner, { balance: number; contributions: number; growthPct: number; distributionPct: number }>
  >;
  for (const t of types) {
    agg[t] = { client: { balance: 0, contributions: 0, growthPct: 0, distributionPct: 0 }, spouse: { balance: 0, contributions: 0, growthPct: 0, distributionPct: 0 } };
  }
  for (const a of state.accounts) {
    const owner: Owner = a.owner === "spouse" ? "spouse" : "client";
    agg[a.type][owner].balance += a.balance;
    agg[a.type][owner].contributions += a.contributions;
    if (agg[a.type][owner].growthPct === 0) agg[a.type][owner].growthPct = a.growthRatePct;
    if (agg[a.type][owner].distributionPct === 0) agg[a.type][owner].distributionPct = a.distributionRatePct;
  }
  return agg;
}

/** Sum PRIME premium deductions by account type */
function primeDeductionsByType(state: CalculatorState, usePrime: boolean): Map<AccountType, number> {
  const map = new Map<AccountType, number>();
  if (!usePrime || !state.annuityPrimeOptions?.length) return map;
  for (const opt of state.annuityPrimeOptions) {
    if (opt.premiumAmount > 0) {
      const prev = map.get(opt.referencedAccountType) ?? 0;
      map.set(opt.referencedAccountType, prev + opt.premiumAmount);
    }
  }
  return map;
}

/** FV at retirement per (type, owner) */
function futureValuesByTypeAndOwner(
  state: CalculatorState,
  retirementAge: number,
  deductionsByType: Map<AccountType, number>
) {
  const agg = aggregateByTypeAndOwner(state);
  const years = Math.max(0, retirementAge - state.client.currentAge);
  const types: AccountType[] = ["qualified", "roth", "taxable", "cash", "insurance"];
  const owners: Owner[] = ["client", "spouse"];
  const fv: Record<string, number> = {};
  for (const t of types) {
    const deduct = deductionsByType.get(t) ?? 0;
    for (const o of owners) {
      let balance = agg[t][o].balance;
      if (deduct > 0 && o === "client") balance = Math.max(0, balance - deduct);
      const g = agg[t][o].growthPct / 100;
      const contrib = agg[t][o].contributions;
      for (let y = 0; y < years; y++) {
        balance = (balance + contrib) * (1 + g);
      }
      fv[`${t}${o === "client" ? "Client" : "Spouse"}`] = balance;
    }
  }
  return fv;
}

/** Compute FV at retirement: each year balance = (balance + contributions) * (1 + growth) */
function futureValuesAtRetirement(
  state: CalculatorState,
  retirementAge: number,
  deductionsByType: Map<AccountType, number>
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
    const deduct = deductionsByType.get(t) ?? 0;
    if (deduct > 0) balance = Math.max(0, balance - deduct);
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

  const primeDeductions = primeDeductionsByType(state, usePrimeAnnuity);

  const fv = futureValuesAtRetirement(state, retirementAge, primeDeductions);
  const agg = aggregateAccountsByType(state);
  const aggByOwner = aggregateByTypeAndOwner(state);
  const fvByOwner = futureValuesByTypeAndOwner(state, retirementAge, primeDeductions);

  const rows: ProjectionRow[] = [];
  let qualifiedBalance = fv.qualified;
  let rothBalance = fv.roth;
  let taxableBalance = fv.taxable;
  let cashBalance = fv.cash;
  let insuranceBalance = fv.insurance;

  let qualifiedBalanceClient = fvByOwner.qualifiedClient ?? 0;
  let qualifiedBalanceSpouse = fvByOwner.qualifiedSpouse ?? 0;
  let rothBalanceClient = fvByOwner.rothClient ?? 0;
  let rothBalanceSpouse = fvByOwner.rothSpouse ?? 0;
  let taxableBalanceClient = fvByOwner.taxableClient ?? 0;
  let taxableBalanceSpouse = fvByOwner.taxableSpouse ?? 0;
  let cashBalanceClient = fvByOwner.cashClient ?? 0;
  let cashBalanceSpouse = fvByOwner.cashSpouse ?? 0;
  let insuranceBalanceClient = fvByOwner.insuranceClient ?? 0;
  let insuranceBalanceSpouse = fvByOwner.insuranceSpouse ?? 0;

  const primeOptions = usePrimeAnnuity ? (state.annuityPrimeOptions ?? []) : [];

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

    const guaranteedFromPrime = primeOptions
      .filter((opt) => clientAge >= opt.incomeStartAge && opt.payoutAmount > 0)
      .reduce((sum, opt) => sum + opt.payoutAmount, 0);

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

    const distQC = aggByOwner.qualified.client.distributionPct / 100;
    const distQS = aggByOwner.qualified.spouse.distributionPct / 100;
    const distRC = aggByOwner.roth.client.distributionPct / 100;
    const distRS = aggByOwner.roth.spouse.distributionPct / 100;
    const distTC = aggByOwner.taxable.client.distributionPct / 100;
    const distTS = aggByOwner.taxable.spouse.distributionPct / 100;
    const distCC = aggByOwner.cash.client.distributionPct / 100;
    const distCS = aggByOwner.cash.spouse.distributionPct / 100;
    const distIC = aggByOwner.insurance.client.distributionPct / 100;
    const distIS = aggByOwner.insurance.spouse.distributionPct / 100;
    const growQC = 1 + aggByOwner.qualified.client.growthPct / 100;
    const growQS = 1 + aggByOwner.qualified.spouse.growthPct / 100;
    const growRC = 1 + aggByOwner.roth.client.growthPct / 100;
    const growRS = 1 + aggByOwner.roth.spouse.growthPct / 100;
    const growTC = 1 + aggByOwner.taxable.client.growthPct / 100;
    const growTS = 1 + aggByOwner.taxable.spouse.growthPct / 100;
    const growCC = 1 + aggByOwner.cash.client.growthPct / 100;
    const growCS = 1 + aggByOwner.cash.spouse.growthPct / 100;
    const growIC = 1 + aggByOwner.insurance.client.growthPct / 100;
    const growIS = 1 + aggByOwner.insurance.spouse.growthPct / 100;

    let drawQualified = 0,
      drawRoth = 0,
      drawTaxable = 0,
      drawCash = 0,
      drawInsurance = 0;
    let drawQualifiedClient = 0,
      drawQualifiedSpouse = 0,
      drawRothClient = 0,
      drawRothSpouse = 0,
      drawTaxableClient = 0,
      drawTaxableSpouse = 0,
      drawCashClient = 0,
      drawCashSpouse = 0,
      drawInsuranceClient = 0,
      drawInsuranceSpouse = 0;
    if (clientAge >= retirementAge) {
      drawQualifiedClient = qualifiedBalanceClient * distQC;
      drawQualifiedSpouse = qualifiedBalanceSpouse * distQS;
      drawQualified = drawQualifiedClient + drawQualifiedSpouse;
      drawRothClient = rothBalanceClient * distRC;
      drawRothSpouse = rothBalanceSpouse * distRS;
      drawRoth = drawRothClient + drawRothSpouse;
      drawTaxableClient = taxableBalanceClient * distTC;
      drawTaxableSpouse = taxableBalanceSpouse * distTS;
      drawTaxable = drawTaxableClient + drawTaxableSpouse;
      drawCashClient = cashBalanceClient * distCC;
      drawCashSpouse = cashBalanceSpouse * distCS;
      drawCash = drawCashClient + drawCashSpouse;
      drawInsuranceClient = insuranceBalanceClient * distIC;
      drawInsuranceSpouse = insuranceBalanceSpouse * distIS;
      drawInsurance = drawInsuranceClient + drawInsuranceSpouse;

      qualifiedBalanceClient = (qualifiedBalanceClient - drawQualifiedClient) * growQC;
      qualifiedBalanceSpouse = (qualifiedBalanceSpouse - drawQualifiedSpouse) * growQS;
      rothBalanceClient = (rothBalanceClient - drawRothClient) * growRC;
      rothBalanceSpouse = (rothBalanceSpouse - drawRothSpouse) * growRS;
      taxableBalanceClient = (taxableBalanceClient - drawTaxableClient) * growTC;
      taxableBalanceSpouse = (taxableBalanceSpouse - drawTaxableSpouse) * growTS;
      cashBalanceClient = (cashBalanceClient - drawCashClient) * growCC;
      cashBalanceSpouse = (cashBalanceSpouse - drawCashSpouse) * growCS;
      insuranceBalanceClient = (insuranceBalanceClient - drawInsuranceClient) * growIC;
      insuranceBalanceSpouse = (insuranceBalanceSpouse - drawInsuranceSpouse) * growIS;

      qualifiedBalance = qualifiedBalanceClient + qualifiedBalanceSpouse;
      rothBalance = rothBalanceClient + rothBalanceSpouse;
      taxableBalance = taxableBalanceClient + taxableBalanceSpouse;
      cashBalance = cashBalanceClient + cashBalanceSpouse;
      insuranceBalance = insuranceBalanceClient + insuranceBalanceSpouse;
    }

    const accountDraws = {
      qualified: drawQualified,
      roth: drawRoth,
      taxable: drawTaxable,
      cash: drawCash,
      insurance: drawInsurance,
      qualifiedClient: drawQualifiedClient,
      qualifiedSpouse: drawQualifiedSpouse,
      rothClient: drawRothClient,
      rothSpouse: drawRothSpouse,
      taxableClient: drawTaxableClient,
      taxableSpouse: drawTaxableSpouse,
      cashClient: drawCashClient,
      cashSpouse: drawCashSpouse,
      insuranceClient: drawInsuranceClient,
      insuranceSpouse: drawInsuranceSpouse,
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
    futureValuesAtRetirement: futureValuesAtRetirement(state, retirementAge, primeDeductions),
    retirementAge,
  };
}
