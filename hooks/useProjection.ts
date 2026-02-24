"use client";

import { useMemo } from "react";
import { useCalculator } from "@/context/CalculatorContext";
import { runProjection } from "@/lib/projection";
import type { ProjectionResult } from "@/lib/projection-types";
import { isPrimeOptionValid } from "@/lib/prime-utils";

export function useProjection(options?: { primeOptionsFilter?: "all" | "first" }): {
  current: ProjectionResult;
  prime: ProjectionResult;
  hasPrimePath: boolean;
} {
  const state = useCalculator();
  const primeFilter = options?.primeOptionsFilter ?? "all";

  return useMemo(() => {
    const opts = state.annuityPrimeOptions ?? [];
    const optsForPrime =
      primeFilter === "first" && opts[0] ? [opts[0]] : opts;
    const stateForPrime =
      primeFilter === "first" ? { ...state, annuityPrimeOptions: optsForPrime } : state;

    const current = runProjection(state, false);
    const prime = runProjection(stateForPrime, true);
    const hasPrimePath = optsForPrime.some(isPrimeOptionValid);

    return { current, prime, hasPrimePath };
  }, [
    state.client.currentAge,
    state.client.projectedPlanAge,
    state.client.projectedRetirementAge,
    state.client.currentMonthlyIncomeGoal,
    state.client.inflationForIncomeGoalPct,
    state.hasSpouse,
    state.spouse.currentAge,
    state.spouse.projectedRetirementAge,
    state.distributionRateAssumptionPct,
    state.income.amountDisplayMode,
    state.income.colaPct,
    state.income.client.currentIncomeAnnual,
    state.income.client.stopWorkingAge,
    state.income.spouse.currentIncomeAnnual,
    state.income.spouse.stopWorkingAge,
    JSON.stringify(state.income.sideIncomeEntries),
    JSON.stringify(state.guaranteedIncome),
    JSON.stringify(state.accounts),
    JSON.stringify(state.annuityPrimeOptions),
    primeFilter,
  ]);
}
