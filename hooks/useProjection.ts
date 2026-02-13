"use client";

import { useMemo } from "react";
import { useCalculator } from "@/context/CalculatorContext";
import { runProjection } from "@/lib/projection";
import type { ProjectionResult } from "@/lib/projection-types";

export function useProjection(): {
  current: ProjectionResult;
  prime: ProjectionResult;
  hasPrimePath: boolean;
} {
  const state = useCalculator();

  return useMemo(() => {
    const current = runProjection(state, false);
    const prime = runProjection(state, true);
    const opts = state.annuityPrimeOptions ?? [];
    const hasPrimePath = opts.some(
      (o) => o.premiumAmount > 0 && o.payoutAmount > 0
    );

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
  ]);
}
