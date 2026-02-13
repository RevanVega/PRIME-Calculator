"use client";

import React, { createContext, useContext, useCallback, useMemo, useState } from "react";
import type {
  CalculatorState,
  ClientInfo,
  SpouseInfo,
  IncomeInputs,
  GuaranteedIncomeInputs,
  AccountBucket,
  AnnuityPrimeInputs,
  PensionOrAnnuityIncome,
  RentalIncome,
  SideIncomeEntry,
} from "@/lib/types";
import {
  defaultCalculatorState,
  defaultClientInfo,
  defaultSpouseInfo,
  defaultIncomeInputs,
  defaultGuaranteedIncome,
  defaultSocialSecurity,
} from "@/lib/types";

type UpdateFn<T> = (prev: T) => T;

export const STEPS = [
  "Client information",
  "Income",
  "Guaranteed income",
  "Accounts",
  "Current income summary",
  "Annuity option",
  "Comparison",
] as const;
export type StepId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface CalculatorContextValue extends CalculatorState {
  currentStep: StepId;
  setCurrentStep: (step: StepId) => void;
  setSelectedClientId: (id: string | null) => void;
  setHasSpouse: (v: boolean) => void;
  setClient: (v: ClientInfo | UpdateFn<ClientInfo>) => void;
  setSpouse: (v: SpouseInfo | UpdateFn<SpouseInfo>) => void;
  setClientTaxRateAssumptionPct: (v: number) => void;
  setDistributionRateAssumptionPct: (v: number) => void;
  setAccountsTaxRatePct: (v: number) => void;
  setIncome: (v: IncomeInputs | UpdateFn<IncomeInputs>) => void;
  addSideIncome: () => void;
  removeSideIncome: (id: string) => void;
  updateSideIncome: (id: string, u: Partial<SideIncomeEntry>) => void;
  setGuaranteedIncome: (v: GuaranteedIncomeInputs | UpdateFn<GuaranteedIncomeInputs>) => void;
  setAccounts: (v: AccountBucket[] | UpdateFn<AccountBucket[]>) => void;
  setAnnuityPrime: (v: AnnuityPrimeInputs | null) => void;
  addPension: () => void;
  addAnnuity: () => void;
  addRental: () => void;
  removePension: (id: string) => void;
  removeAnnuity: (id: string) => void;
  removeRental: (id: string) => void;
  updatePension: (id: string, u: Partial<PensionOrAnnuityIncome>) => void;
  updateAnnuity: (id: string, u: Partial<PensionOrAnnuityIncome>) => void;
  updateRental: (id: string, u: Partial<RentalIncome>) => void;
  addAccount: (type: AccountBucket["type"]) => void;
  updateAccount: (id: string, u: Partial<AccountBucket>) => void;
  removeAccount: (id: string) => void;
  /** Dev only: pre-fill all inputs with sample data for testing */
  loadSampleData: () => void;
}

const CalculatorContext = createContext<CalculatorContextValue | null>(null);

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

export function CalculatorProvider({ children }: { children: React.ReactNode }) {
  const [currentStep, setCurrentStep] = useState<StepId>(1);
  const [state, setState] = useState<CalculatorState>(() => {
    const labels: Record<AccountBucket["type"], string> = {
      qualified: "Qualified",
      roth: "Roth",
      taxable: "Taxable",
      cash: "Cash",
      insurance: "Cash value insurance",
    };
    const defaultTaxRates: Record<AccountBucket["type"], number> = {
      qualified: 25,
      roth: 0,
      taxable: 25,
      cash: 25,
      insurance: 0,
    };
    const types: AccountBucket["type"][] = ["qualified", "roth", "taxable", "cash", "insurance"];
    const accounts: AccountBucket[] = types.map((type) => ({
      id: generateId(),
      type,
      label: labels[type],
      balance: 0,
      contributions: 0,
      growthRatePct: 5,
      distributionRatePct: defaultCalculatorState.distributionRateAssumptionPct,
      taxRatePct: defaultTaxRates[type],
    }));
    return { ...defaultCalculatorState, accounts };
  });

  const setSelectedClientId = useCallback((id: string | null) => {
    setState((s) => ({ ...s, selectedClientId: id }));
  }, []);

  const setHasSpouse = useCallback((v: boolean) => {
    setState((s) => ({ ...s, hasSpouse: v }));
  }, []);

  const setClient = useCallback((v: ClientInfo | UpdateFn<ClientInfo>) => {
    setState((s) => ({ ...s, client: typeof v === "function" ? v(s.client) : v }));
  }, []);

  const setSpouse = useCallback((v: SpouseInfo | UpdateFn<SpouseInfo>) => {
    setState((s) => ({ ...s, spouse: typeof v === "function" ? v(s.spouse) : v }));
  }, []);

  const setClientTaxRateAssumptionPct = useCallback((v: number) => {
    setState((s) => ({ ...s, clientTaxRateAssumptionPct: v }));
  }, []);

  const setDistributionRateAssumptionPct = useCallback((v: number) => {
    setState((s) => ({ ...s, distributionRateAssumptionPct: v }));
  }, []);

  const setAccountsTaxRatePct = useCallback((v: number) => {
    setState((s) => ({ ...s, accountsTaxRatePct: v }));
  }, []);

  const setIncome = useCallback((v: IncomeInputs | UpdateFn<IncomeInputs>) => {
    setState((s) => ({ ...s, income: typeof v === "function" ? v(s.income) : v }));
  }, []);

  const setGuaranteedIncome = useCallback((v: GuaranteedIncomeInputs | UpdateFn<GuaranteedIncomeInputs>) => {
    setState((s) => ({ ...s, guaranteedIncome: typeof v === "function" ? v(s.guaranteedIncome) : v }));
  }, []);

  const setAccounts = useCallback((v: AccountBucket[] | UpdateFn<AccountBucket[]>) => {
    setState((s) => ({ ...s, accounts: typeof v === "function" ? v(s.accounts) : v }));
  }, []);

  const setAnnuityPrime = useCallback((v: AnnuityPrimeInputs | null) => {
    setState((s) => ({ ...s, annuityPrime: v }));
  }, []);

  const addSideIncome = useCallback(() => {
    const item: SideIncomeEntry = { id: generateId(), amount: 0, startAge: 65, endAge: 90 };
    setState((s) => ({ ...s, income: { ...s.income, sideIncomeEntries: [...s.income.sideIncomeEntries, item] } }));
  }, []);

  const removeSideIncome = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      income: { ...s.income, sideIncomeEntries: s.income.sideIncomeEntries.filter((e) => e.id !== id) },
    }));
  }, []);

  const updateSideIncome = useCallback((id: string, u: Partial<SideIncomeEntry>) => {
    setState((s) => ({
      ...s,
      income: {
        ...s.income,
        sideIncomeEntries: s.income.sideIncomeEntries.map((e) => (e.id === id ? { ...e, ...u } : e)),
      },
    }));
  }, []);

  const addPension = useCallback(() => {
    const item: PensionOrAnnuityIncome = {
      id: generateId(),
      type: "pension",
      amount: 0,
      startAge: 65,
      survivorPct: 50,
      colaPct: 2,
      taxRatePct: 25,
    };
    setState((s) => ({
      ...s,
      guaranteedIncome: {
        ...s.guaranteedIncome,
        pensions: [...s.guaranteedIncome.pensions, item],
      },
    }));
  }, []);

  const addAnnuity = useCallback(() => {
    const item: PensionOrAnnuityIncome = {
      id: generateId(),
      type: "annuity",
      amount: 0,
      startAge: 65,
      survivorPct: 50,
      colaPct: 2,
      taxRatePct: 25,
    };
    setState((s) => ({
      ...s,
      guaranteedIncome: {
        ...s.guaranteedIncome,
        annuities: [...s.guaranteedIncome.annuities, item],
      },
    }));
  }, []);

  const addRental = useCallback(() => {
    const item: RentalIncome = { id: generateId(), amount: 0, startAge: 65, colaPct: 2, taxRatePct: 25 };
    setState((s) => ({
      ...s,
      guaranteedIncome: {
        ...s.guaranteedIncome,
        rentals: [...s.guaranteedIncome.rentals, item],
      },
    }));
  }, []);

  const removePension = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      guaranteedIncome: {
        ...s.guaranteedIncome,
        pensions: s.guaranteedIncome.pensions.filter((p) => p.id !== id),
      },
    }));
  }, []);

  const removeAnnuity = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      guaranteedIncome: {
        ...s.guaranteedIncome,
        annuities: s.guaranteedIncome.annuities.filter((a) => a.id !== id),
      },
    }));
  }, []);

  const removeRental = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      guaranteedIncome: {
        ...s.guaranteedIncome,
        rentals: s.guaranteedIncome.rentals.filter((r) => r.id !== id),
      },
    }));
  }, []);

  const updatePension = useCallback((id: string, u: Partial<PensionOrAnnuityIncome>) => {
    setState((s) => ({
      ...s,
      guaranteedIncome: {
        ...s.guaranteedIncome,
        pensions: s.guaranteedIncome.pensions.map((p) => (p.id === id ? { ...p, ...u } : p)),
      },
    }));
  }, []);

  const updateAnnuity = useCallback((id: string, u: Partial<PensionOrAnnuityIncome>) => {
    setState((s) => ({
      ...s,
      guaranteedIncome: {
        ...s.guaranteedIncome,
        annuities: s.guaranteedIncome.annuities.map((a) => (a.id === id ? { ...a, ...u } : a)),
      },
    }));
  }, []);

  const updateRental = useCallback((id: string, u: Partial<RentalIncome>) => {
    setState((s) => ({
      ...s,
      guaranteedIncome: {
        ...s.guaranteedIncome,
        rentals: s.guaranteedIncome.rentals.map((r) => (r.id === id ? { ...r, ...u } : r)),
      },
    }));
  }, []);

  const addAccount = useCallback((type: AccountBucket["type"]) => {
    const labels: Record<AccountBucket["type"], string> = {
      qualified: "Qualified",
      roth: "Roth",
      taxable: "Taxable",
      cash: "Cash",
      insurance: "Cash value insurance",
    };
    const defaultTaxRates: Record<AccountBucket["type"], number> = {
      qualified: 25,
      roth: 0,
      taxable: 25,
      cash: 25,
      insurance: 0,
    };
    setState((s) => {
      const sameTypeCount = s.accounts.filter((a) => a.type === type).length;
      const bucket: AccountBucket = {
        id: generateId(),
        type,
        label: sameTypeCount === 0 ? labels[type] : `${labels[type]} ${sameTypeCount + 1}`,
        balance: 0,
        contributions: 0,
        growthRatePct: 5,
        distributionRatePct: s.distributionRateAssumptionPct,
        taxRatePct: defaultTaxRates[type],
      };
      return { ...s, accounts: [...s.accounts, bucket] };
    });
  }, []);

  const updateAccount = useCallback((id: string, u: Partial<AccountBucket>) => {
    setState((s) => ({
      ...s,
      accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...u } : a)),
    }));
  }, []);

  const removeAccount = useCallback((id: string) => {
    setState((s) => ({ ...s, accounts: s.accounts.filter((a) => a.id !== id) }));
  }, []);

  const loadSampleData = useCallback(() => {
    const labels: Record<AccountBucket["type"], string> = {
      qualified: "Qualified",
      roth: "Roth",
      taxable: "Taxable",
      cash: "Cash",
      insurance: "Cash value insurance",
    };
    const types: AccountBucket["type"][] = ["qualified", "roth", "taxable", "cash", "insurance"];
    setState((s) => ({
      ...s,
      hasSpouse: true,
      client: {
        name: "Ed Arroyo",
        currentAge: 59,
        projectedRetirementAge: 65,
        projectedPlanAge: 90,
        currentMonthlyIncomeGoal: 8000,
        inflationForIncomeGoalPct: 2.5,
      },
      spouse: {
        name: "Rachel",
        currentAge: 57,
        projectedRetirementAge: 65,
        projectedPlanAge: 90,
      },
      clientTaxRateAssumptionPct: 25,
      distributionRateAssumptionPct: 4,
      accountsTaxRatePct: 25,
      income: {
        amountDisplayMode: "annual",
        colaPct: 2,
        taxRatePct: 25,
        client: { currentIncomeAnnual: 0, stopWorkingAge: 65 },
        spouse: { currentIncomeAnnual: 60000, stopWorkingAge: 63 },
        sideIncomeEntries: [],
      },
      guaranteedIncome: {
        socialSecurityClient: { monthlyBenefit: 3250, startAge: 66, colaPct: 2, taxRatePct: 0 },
        socialSecuritySpouse: { monthlyBenefit: 1500, startAge: 67, colaPct: 2, taxRatePct: 0 },
        pensions: [
          {
            id: generateId(),
            type: "pension",
            amount: 1367.58,
            startAge: 65,
            survivorPct: 50,
            colaPct: 0,
            taxRatePct: 0,
          },
        ],
        annuities: [],
        rentals: [],
      },
      accounts: types.map((type) => ({
        id: generateId(),
        type,
        label: labels[type],
        balance: type === "qualified" ? 250000 : type === "roth" ? 250000 : type === "taxable" ? 0 : type === "cash" ? 400000 : 100000,
        contributions: 0,
        growthRatePct: type === "roth" ? 8 : 7,
        distributionRatePct: 4,
        taxRatePct: type === "roth" || type === "insurance" ? 0 : 25,
      })),
      annuityPrime: {
        premiumAmount: 400000,
        referencedAccountType: "qualified",
        incomeStartAge: 65,
        payoutAmount: 2125,
        carrier: "Sample carrier",
      },
    }));
  }, []);

  const value = useMemo<CalculatorContextValue>(
    () => ({
      ...state,
      currentStep,
      setCurrentStep,
      setSelectedClientId,
      setHasSpouse,
      setClient,
      setSpouse,
      setClientTaxRateAssumptionPct,
      setDistributionRateAssumptionPct,
      setAccountsTaxRatePct,
      setIncome,
      addSideIncome,
      removeSideIncome,
      updateSideIncome,
      setGuaranteedIncome,
      setAccounts,
      setAnnuityPrime,
      addPension,
      addAnnuity,
      addRental,
      removePension,
      removeAnnuity,
      removeRental,
      updatePension,
      updateAnnuity,
      updateRental,
      addAccount,
      updateAccount,
      removeAccount,
      loadSampleData,
    }),
    [
      state,
      currentStep,
      setSelectedClientId,
      setHasSpouse,
      setClient,
      setSpouse,
      setClientTaxRateAssumptionPct,
      setDistributionRateAssumptionPct,
      setAccountsTaxRatePct,
      setIncome,
      addSideIncome,
      removeSideIncome,
      updateSideIncome,
      setGuaranteedIncome,
      setAccounts,
      setAnnuityPrime,
      addPension,
      addAnnuity,
      addRental,
      removePension,
      removeAnnuity,
      removeRental,
      updatePension,
      updateAnnuity,
      updateRental,
      addAccount,
      updateAccount,
      removeAccount,
      loadSampleData,
    ]
  );

  return <CalculatorContext.Provider value={value}>{children}</CalculatorContext.Provider>;
}

export function useCalculator() {
  const ctx = useContext(CalculatorContext);
  if (!ctx) throw new Error("useCalculator must be used within CalculatorProvider");
  return ctx;
}
