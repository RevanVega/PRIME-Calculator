export type AmountDisplayMode = "annual" | "monthly";

export interface ClientInfo {
  name: string;
  currentAge: number;
  projectedRetirementAge: number;
  projectedPlanAge: number;
  currentMonthlyIncomeGoal: number;
  inflationForIncomeGoalPct: number;
}

export interface SpouseInfo {
  name: string;
  currentAge: number;
  projectedRetirementAge: number;
  projectedPlanAge: number;
}

export interface SideIncomeEntry {
  id: string;
  amount: number;
  startAge: number;
  endAge: number;
}

export interface IncomeInputs {
  amountDisplayMode: AmountDisplayMode;
  colaPct: number;
  taxRatePct: number; // tax bracket assumption (income section)
  client: { currentIncomeAnnual: number; stopWorkingAge: number };
  spouse: { currentIncomeAnnual: number; stopWorkingAge: number };
  sideIncomeEntries: SideIncomeEntry[];
}

export interface SocialSecurity {
  monthlyBenefit: number;
  startAge: number;
  colaPct: number;
  taxRatePct: number;
}

export type IncomeOwner = "client" | "spouse";

export interface PensionOrAnnuityIncome {
  id: string;
  type: "pension" | "annuity";
  amount: number;
  startAge: number;
  endAge?: number;
  survivorPct: number;
  colaPct: number;
  taxRatePct: number;
  /** Who receives this income; default client */
  owner?: IncomeOwner;
}

export interface RentalIncome {
  id: string;
  amount: number;
  startAge: number;
  endAge?: number;
  colaPct: number;
  taxRatePct: number;
  /** Who receives this income; default client */
  owner?: IncomeOwner;
}

export interface GuaranteedIncomeInputs {
  socialSecurityClient: SocialSecurity;
  socialSecuritySpouse: SocialSecurity;
  pensions: PensionOrAnnuityIncome[];
  annuities: PensionOrAnnuityIncome[];
  rentals: RentalIncome[];
}

export type AccountType = "qualified" | "roth" | "taxable" | "cash" | "insurance";

export interface AccountBucket {
  id: string;
  type: AccountType;
  label: string;
  balance: number;
  contributions: number; // annual contribution until retirement
  growthRatePct: number;
  distributionRatePct: number;
  taxRatePct: number;
}

export interface AnnuityPrimeInputs {
  premiumAmount: number;
  referencedAccountType: AccountType;
  incomeStartAge: number;
  payoutAmount: number; // flat, no COLA
  carrier?: string;
}

export interface CalculatorState {
  selectedClientId: string | null;
  hasSpouse: boolean;
  client: ClientInfo;
  spouse: SpouseInfo;
  /** Tax rate assumption (Client information section) */
  clientTaxRateAssumptionPct: number;
  /** Default distribution rate for new accounts (used in Accounts section) */
  distributionRateAssumptionPct: number;
  accountsTaxRatePct: number;
  income: IncomeInputs;
  guaranteedIncome: GuaranteedIncomeInputs;
  accounts: AccountBucket[];
  annuityPrime: AnnuityPrimeInputs | null;
}

export const defaultClientInfo: ClientInfo = {
  name: "",
  currentAge: 59,
  projectedRetirementAge: 65,
  projectedPlanAge: 90,
  currentMonthlyIncomeGoal: 0,
  inflationForIncomeGoalPct: 2,
};

export const defaultSpouseInfo: SpouseInfo = {
  name: "",
  currentAge: 57,
  projectedRetirementAge: 65,
  projectedPlanAge: 90,
};

export const defaultIncomeInputs: IncomeInputs = {
  amountDisplayMode: "annual",
  colaPct: 2,
  taxRatePct: 25,
  client: { currentIncomeAnnual: 0, stopWorkingAge: 65 },
  spouse: { currentIncomeAnnual: 0, stopWorkingAge: 65 },
  sideIncomeEntries: [],
};

export const defaultSocialSecurity: SocialSecurity = {
  monthlyBenefit: 0,
  startAge: 65,
  colaPct: 2,
  taxRatePct: 0,
};

export const defaultGuaranteedIncome: GuaranteedIncomeInputs = {
  socialSecurityClient: { ...defaultSocialSecurity },
  socialSecuritySpouse: { ...defaultSocialSecurity },
  pensions: [],
  annuities: [],
  rentals: [],
};

export const defaultCalculatorState: CalculatorState = {
  selectedClientId: null,
  hasSpouse: true,
  client: { ...defaultClientInfo },
  spouse: { ...defaultSpouseInfo },
  clientTaxRateAssumptionPct: 25,
  distributionRateAssumptionPct: 4,
  accountsTaxRatePct: 25,
  income: { ...defaultIncomeInputs },
  guaranteedIncome: { ...defaultGuaranteedIncome },
  accounts: [],
  annuityPrime: null,
};
