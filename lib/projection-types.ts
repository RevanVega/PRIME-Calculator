/** One row of the projection (one year) */
export interface ProjectionRow {
  yearIndex: number;
  clientAge: number;
  spouseAge: number;
  /** Earned income (client + spouse) */
  earnedIncome: number;
  /** Earned income client only (annual) */
  earnedIncomeClient: number;
  /** Earned income spouse only (annual) */
  earnedIncomeSpouse: number;
  /** Social Security client + spouse (annual) */
  socialSecurity: number;
  /** Social Security client only (annual) */
  socialSecurityClient: number;
  /** Social Security spouse only (annual) */
  socialSecuritySpouse: number;
  /** Pension(s) annual */
  pension: number;
  /** Pension/annuity/rental attributed to client (annual) */
  pensionOtherRentalClient: number;
  /** Pension/annuity/rental attributed to spouse (annual) */
  pensionOtherRentalSpouse: number;
  /** Other annuities (guaranteed income list) annual */
  otherAnnuities: number;
  /** Rental income annual */
  rental: number;
  /** PRIME: guaranteed from converted premium (flat annual) */
  guaranteedFromPrime: number;
  /** Draws from account buckets by type (annual) */
  accountDraws: { qualified: number; roth: number; taxable: number; cash: number; insurance: number };
  /** Total annual income */
  annualTotal: number;
  /** Monthly total */
  monthlyTotal: number;
  /** Target goal this year (inflation-adjusted monthly goal * 12 for annual) */
  targetGoalAnnual: number;
  /** Guaranteed income $ (annual) */
  guaranteedDollars: number;
  /** Guaranteed income % (0-100) */
  guaranteedPct: number;
}

/** Future value at retirement per account type (before any PRIME premium deduction) */
export interface FutureValuesAtRetirement {
  qualified: number;
  roth: number;
  taxable: number;
  cash: number;
  insurance: number;
}

/** Full projection result */
export interface ProjectionResult {
  rows: ProjectionRow[];
  futureValuesAtRetirement: FutureValuesAtRetirement;
  /** Client age at retirement (when draws start) */
  retirementAge: number;
}
