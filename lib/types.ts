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
  /** Annuity only: current account value; grown at default 2% to retirement for snapshot */
  balance?: number;
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
  /** User-facing name (e.g. "Fidelity", "Current 401k") */
  accountName?: string;
  /** Who owns this account; default client */
  owner?: IncomeOwner;
  balance: number;
  contributions: number; // annual contribution until retirement
  growthRatePct: number;
  distributionRatePct: number;
  taxRatePct: number;
}

export type PrimeBenefitOption = "singleLife" | "joint";
export type PrimeOwnerOption = "client" | "spouse" | "joint";

/** FIA = Fixed Index Annuity (fixed annual payout, no COLA). MYGA = fixed % of principal for a term; principal intact at renewal. */
export type PrimeProductType = "FIA" | "MYGA";

/** MYGA term length (years); rate is fixed for this period then renews, principal unchanged. */
export type MigaTermYears = 3 | 5 | 7;

export interface AnnuityPrimeInputs {
  id: string;
  premiumAmount: number;
  referencedAccountType: AccountType;
  incomeStartAge: number;
  /** Product: FIA (fixed payout) or MYGA (fixed % of principal for term). */
  productType?: PrimeProductType;
  /** FIA: annual payout amount (no COLA). Not used for MYGA. */
  payoutAmount: number;
  /** MYGA: guaranteed rate % (e.g. 5 = 5%). Annual income = premiumAmount × (migaRatePct/100). */
  migaRatePct?: number;
  /** MYGA: term years (rate locked; at end, rate renews, principal intact). */
  migaTermYears?: MigaTermYears;
  carrier?: string;
  /** FIA only: single life or joint. */
  benefitOption: PrimeBenefitOption;
  owner: PrimeOwnerOption;
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
  /** ALIGN options (multiple allowed) */
  annuityPrimeOptions: AnnuityPrimeInputs[];
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
  annuityPrimeOptions: [],
};
