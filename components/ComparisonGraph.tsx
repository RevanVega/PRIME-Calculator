"use client";

import { useMemo, useState } from "react";
import { useCalculator } from "@/context/CalculatorContext";
import { runProjection } from "@/lib/projection";
import { runMonteCarlo, runSurvivorMonteCarlo } from "@/lib/monte-carlo";
import { HISTORICAL_RETURNS_PCT } from "@/lib/historical-returns";
import { getSurvivorPensionAnnuityRental } from "@/lib/survivor-income";
import { getPrimeOptionAnnualPayout, isPrimeOptionValid } from "@/lib/prime-utils";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function ComparisonGraph() {
  const state = useCalculator();
  const { income, client, annuityPrimeOptions, hasSpouse } = state;

  // Live toggles for comparison page (local state, don't persist to main calculator)
  const [selectedPrimeOptionId, setSelectedPrimeOptionId] = useState<string | "all" | null>(null);
  const [retirementAgeOverride, setRetirementAgeOverride] = useState<number | null>(null);
  const [incomeGoalOverride, setIncomeGoalOverride] = useState<number | null>(null);
  const [prematureDeathAge, setPrematureDeathAge] = useState<number | null>(null);
  const [showPrematureDeath, setShowPrematureDeath] = useState(false);
  // Show/hide scenario panels (below Monte Carlo) to avoid overcrowding
  const [showWorkingLonger, setShowWorkingLonger] = useState(false);
  const [showIncomeGoal, setShowIncomeGoal] = useState(false);
  const [showRateOfReturn, setShowRateOfReturn] = useState(false);
  const [showAdditionalSavings, setShowAdditionalSavings] = useState(false);
  const [showPrematureDeathPanel, setShowPrematureDeathPanel] = useState(false);
  // Rate-of-return scenario: add this % to all account growth before retirement
  const [rateOfReturnBumpPct, setRateOfReturnBumpPct] = useState(0);
  // Additional-savings scenario: extra annual contribution to taxable (for comparison only)
  const [additionalSavingsAnnual, setAdditionalSavingsAnnual] = useState(0);

  const opts = annuityPrimeOptions ?? [];
  const validOptions = opts.filter(isPrimeOptionValid);
  const baseRetirementAge = client?.projectedRetirementAge ?? 65;
  const baseIncomeGoal = client?.currentMonthlyIncomeGoal ?? 0;

  const retirementAge = retirementAgeOverride ?? baseRetirementAge;
  const incomeGoal = incomeGoalOverride ?? baseIncomeGoal;

  const stateWithOverrides = useMemo(() => {
    let s = { ...state };

    if (selectedPrimeOptionId === null) {
      s = { ...s, annuityPrimeOptions: [] };
    } else if (selectedPrimeOptionId !== "all") {
      const filtered = opts.filter((o) => o.id === selectedPrimeOptionId);
      s = { ...s, annuityPrimeOptions: filtered };
    }

    if (retirementAgeOverride != null) {
      s = {
        ...s,
        client: { ...s.client, projectedRetirementAge: retirementAgeOverride },
        income: {
          ...s.income,
          client: { ...s.income.client, stopWorkingAge: retirementAgeOverride },
          spouse: { ...s.income.spouse, stopWorkingAge: retirementAgeOverride },
        },
      };
    }

    if (incomeGoalOverride != null) {
      s = { ...s, client: { ...s.client, currentMonthlyIncomeGoal: incomeGoalOverride } };
    }

    return s;
  }, [state, selectedPrimeOptionId, retirementAgeOverride, incomeGoalOverride, opts]);

  const stateWithRateBump = useMemo(() => {
    if (rateOfReturnBumpPct <= 0) return stateWithOverrides;
    return {
      ...stateWithOverrides,
      accounts: stateWithOverrides.accounts.map((a) => ({
        ...a,
        growthRatePct: a.growthRatePct + rateOfReturnBumpPct,
      })),
    };
  }, [stateWithOverrides, rateOfReturnBumpPct]);

  const stateWithExtraSavings = useMemo(() => {
    if (additionalSavingsAnnual <= 0) return stateWithOverrides;
    const taxableIndex = stateWithOverrides.accounts.findIndex((a) => a.type === "taxable");
    if (taxableIndex < 0) return stateWithOverrides;
    return {
      ...stateWithOverrides,
      accounts: stateWithOverrides.accounts.map((a, i) =>
        i === taxableIndex ? { ...a, contributions: a.contributions + additionalSavingsAnnual } : a
      ),
    };
  }, [stateWithOverrides, additionalSavingsAnnual]);

  /** Combined scenario: all toggles applied (working longer, income goal, rate bump, extra savings) for one Monte Carlo: Current vs PRIME */
  const stateCombined = useMemo(() => {
    let s = stateWithRateBump;
    if (additionalSavingsAnnual <= 0) return s;
    const taxableIndex = s.accounts.findIndex((a) => a.type === "taxable");
    if (taxableIndex < 0) return s;
    return {
      ...s,
      accounts: s.accounts.map((a, i) =>
        i === taxableIndex ? { ...a, contributions: a.contributions + additionalSavingsAnnual } : a
      ),
    };
  }, [stateWithRateBump, additionalSavingsAnnual]);

  const { current, prime, hasPrimePath } = useMemo(() => {
    const currentProj = runProjection(stateWithOverrides, false);
    const primeProj = runProjection(stateWithOverrides, true);
    const hasPrime = validOptions.length > 0 && selectedPrimeOptionId != null;
    return { current: currentProj, prime: primeProj, hasPrimePath: hasPrime };
  }, [stateWithOverrides, validOptions.length, selectedPrimeOptionId]);

  const isMonthly = income.amountDisplayMode === "monthly";

  const chartData = current.rows.map((row, i) => {
    const valueCurrent = isMonthly ? row.monthlyTotal : row.annualTotal;
    const valuePrime = prime.rows[i]
      ? isMonthly
        ? prime.rows[i].monthlyTotal
        : prime.rows[i].annualTotal
      : valueCurrent;
    const target = isMonthly ? row.targetGoalAnnual / 12 : row.targetGoalAnnual;
    const guaranteedCurrent = isMonthly ? row.guaranteedDollars / 12 : row.guaranteedDollars;
    const guaranteedPrime = prime.rows[i]
      ? isMonthly
        ? prime.rows[i].guaranteedDollars / 12
        : prime.rows[i].guaranteedDollars
      : guaranteedCurrent;
    return {
      age: row.clientAge,
      current: Math.round(valueCurrent),
      prime: Math.round(valuePrime),
      target: incomeGoal > 0 ? Math.round(target) : undefined,
      guaranteedPct: Math.round(row.guaranteedPct),
      guaranteedCurrent: Math.round(guaranteedCurrent),
      guaranteedPrime: Math.round(guaranteedPrime),
    };
  });

  const hasTarget = chartData.some((d) => d.target != null && d.target > 0);

  // First year of retirement = row where client age equals retirement age
  const retirementRowIndex = current.rows.findIndex((r) => r.clientAge === current.retirementAge);
  const retirementRow =
    retirementRowIndex >= 0 ? current.rows[retirementRowIndex] : current.rows[0];
  const primeRetirementRow =
    hasPrimePath && retirementRowIndex >= 0 && prime.rows[retirementRowIndex]
      ? prime.rows[retirementRowIndex]
      : prime.rows[0];

  // Rows at age 70 and 80
  const rowAt70 = current.rows.find((r) => r.clientAge === 70) ?? retirementRow;
  const rowAt80 = current.rows.find((r) => r.clientAge === 80) ?? retirementRow;
  const primeRowAt70 =
    hasPrimePath && prime.rows.length > 0 ? prime.rows.find((r) => r.clientAge === 70) ?? primeRetirementRow : null;
  const primeRowAt80 =
    hasPrimePath && prime.rows.length > 0 ? prime.rows.find((r) => r.clientAge === 80) ?? primeRetirementRow : null;

  const currentYear = new Date().getFullYear();
  const retirementYear =
    client?.currentAge != null && current.retirementAge != null
      ? currentYear + (current.retirementAge - client.currentAge)
      : currentYear;

  const monteCarloResults = useMemo(() => {
    if (current.rows.length === 0) return null;
    const currentResult = runMonteCarlo(current, HISTORICAL_RETURNS_PCT, 1000);
    const primeResult =
      hasPrimePath && prime.rows.length > 0
        ? runMonteCarlo(prime, HISTORICAL_RETURNS_PCT, 1000)
        : null;
    return { current: currentResult, prime: primeResult };
  }, [current, prime, hasPrimePath]);

  const rateBumpProj = useMemo(
    () => (rateOfReturnBumpPct > 0 ? runProjection(stateWithRateBump, false) : null),
    [stateWithRateBump, rateOfReturnBumpPct]
  );
  const rateBumpMonteCarlo = useMemo(
    () => (rateBumpProj?.rows.length ? runMonteCarlo(rateBumpProj, HISTORICAL_RETURNS_PCT, 1000) : null),
    [rateBumpProj]
  );

  const extraSavingsProj = useMemo(
    () => (additionalSavingsAnnual > 0 ? runProjection(stateWithExtraSavings, false) : null),
    [stateWithExtraSavings, additionalSavingsAnnual]
  );
  const extraSavingsMonteCarlo = useMemo(
    () => (extraSavingsProj?.rows.length ? runMonteCarlo(extraSavingsProj, HISTORICAL_RETURNS_PCT, 1000) : null),
    [extraSavingsProj]
  );

  const hasAnyScenarioAdjustment =
    retirementAgeOverride != null ||
    incomeGoalOverride != null ||
    rateOfReturnBumpPct > 0 ||
    additionalSavingsAnnual > 0;

  const { currentCombined, primeCombined } = useMemo(() => {
    const cur = runProjection(stateCombined, false);
    const pri = runProjection(stateCombined, true);
    return { currentCombined: cur, primeCombined: pri };
  }, [stateCombined]);

  const combinedMonteCarloResults = useMemo(() => {
    if (currentCombined.rows.length === 0) return null;
    const currentResult = runMonteCarlo(currentCombined, HISTORICAL_RETURNS_PCT, 1000);
    const primeResult =
      hasPrimePath && primeCombined.rows.length > 0
        ? runMonteCarlo(primeCombined, HISTORICAL_RETURNS_PCT, 1000)
        : null;
    return { current: currentResult, prime: primeResult };
  }, [currentCombined, primeCombined, hasPrimePath]);

  const hasTaxableAccount = state.accounts.some((a) => a.type === "taxable");

  const prematureDeathAnalysis = useMemo(() => {
    if (!hasSpouse || prematureDeathAge == null) return null;
    const projection = hasPrimePath ? prime : current;
    if (!projection.rows.length) return null;
    const deathAge = prematureDeathAge;

    let totalShortfall = 0;
    let firstShortfallAnnual = 0;
    let firstShortfallAge: number | null = null;

    for (const row of projection.rows) {
      if (row.clientAge < deathAge) continue;
      const baseGoal = row.targetGoalAnnual;
      const goal = baseGoal * 0.85; // 15% expense reduction after first death
      if (goal <= 0) continue;

      const ssClient = row.socialSecurityClient;
      const ssSpouse = row.socialSecuritySpouse;
      const ssSurvivor = Math.max(ssClient, ssSpouse);

      const pensionAnnuityRentalSurvivor = getSurvivorPensionAnnuityRental(
        stateWithOverrides,
        row.clientAge,
        deathAge,
        row.spouseAge
      );

      let primeSurvivor = 0;
      for (const opt of opts) {
        if (row.clientAge < opt.incomeStartAge) continue;
        let payout = getPrimeOptionAnnualPayout(opt);
        if (
          row.clientAge >= deathAge &&
          opt.owner === "client" &&
          opt.benefitOption !== "joint"
        ) {
          payout = 0;
        }
        primeSurvivor += payout;
      }

      const earnedClientAfterDeath =
        row.clientAge >= deathAge ? 0 : row.earnedIncomeClient;
      const earnedSpouse = row.earnedIncomeSpouse;

      const survivorGuaranteed =
        ssSurvivor + pensionAnnuityRentalSurvivor + primeSurvivor;
      const accountDrawsTotal =
        row.accountDraws.qualified +
        row.accountDraws.roth +
        row.accountDraws.taxable +
        row.accountDraws.cash +
        row.accountDraws.insurance;

      const annualSurvivorTotal =
        earnedClientAfterDeath + earnedSpouse + survivorGuaranteed + accountDrawsTotal;
      const annualShortfall = Math.max(0, goal - annualSurvivorTotal);

      if (annualShortfall > 0) {
        totalShortfall += annualShortfall;
        if (firstShortfallAge == null) {
          firstShortfallAge = row.clientAge;
          firstShortfallAnnual = annualShortfall;
        }
      }
    }

    if (firstShortfallAge == null) {
      return null;
    }

    return {
      deathAge,
      firstShortfallAge,
      firstYearShortfallAnnual: firstShortfallAnnual,
      firstYearShortfallMonthly: firstShortfallAnnual / 12,
      totalShortfall,
    };
  }, [hasSpouse, prematureDeathAge, hasPrimePath, current, prime, opts]);

  const survivorMonteCarloResults = useMemo(() => {
    if (!showPrematureDeath || prematureDeathAge == null || !hasSpouse) return null;
    if (!current.rows.length) return null;
    const deathAge = prematureDeathAge;
    const primeOpts = opts.map((o) => ({
      owner: o.owner,
      benefitOption: o.benefitOption,
      incomeStartAge: o.incomeStartAge,
      payoutAmount: getPrimeOptionAnnualPayout(o),
    }));

    const currentSurvivorRows = current.rows.filter((r) => r.clientAge >= deathAge);
    const currentPensionByYear = currentSurvivorRows.map((row) =>
      getSurvivorPensionAnnuityRental(stateWithOverrides, row.clientAge, deathAge, row.spouseAge)
    );
    const currentResult = runSurvivorMonteCarlo(
      current,
      deathAge,
      [],
      HISTORICAL_RETURNS_PCT,
      1000,
      currentPensionByYear
    );
    if (!currentResult) return null;

    let primeResult: { successRatePct: number; numSuccess: number; numFail: number } | null = null;
    if (hasPrimePath && prime.rows.length > 0) {
      const primeDeathRow = prime.rows.find((r) => r.clientAge === deathAge);
      if (primeDeathRow?.portfolioTotalAtStartOfYear != null) {
        const primeSurvivorRows = prime.rows.filter((r) => r.clientAge >= deathAge);
        const primePensionByYear = primeSurvivorRows.map((row) =>
          getSurvivorPensionAnnuityRental(stateWithOverrides, row.clientAge, deathAge, row.spouseAge)
        );
        primeResult = runSurvivorMonteCarlo(
          prime,
          deathAge,
          primeOpts,
          HISTORICAL_RETURNS_PCT,
          1000,
          primePensionByYear
        );
      }
    }

    return { current: currentResult, prime: primeResult };
  }, [showPrematureDeath, prematureDeathAge, hasSpouse, hasPrimePath, current, prime, opts, stateWithOverrides]);

  const renderAgeBox = (
    label: string,
    row: { annualTotal: number; monthlyTotal: number; guaranteedPct: number; guaranteedDollars: number },
    theme: "current" | "prime"
  ) => {
    const isCurrent = theme === "current";
    const borderColor = isCurrent ? "border-l-blue-500" : "border-l-emerald-500";
    const amountColor = isCurrent ? "text-blue-400" : "text-emerald-400";
    return (
      <div
        className={`p-2.5 rounded-lg bg-gray-800/50 border border-gray-600 border-l-4 ${borderColor} min-h-[5.5rem] flex flex-col justify-between`}
      >
        <div className="text-gray-400 text-xs">{label}</div>
        <div className={`font-medium mt-0.5 ${amountColor}`}>
          {isMonthly
            ? `$${Math.round(row.monthlyTotal).toLocaleString()}/mo`
            : `$${Math.round(row.annualTotal).toLocaleString()}/yr`}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {Math.round(row.guaranteedPct)}% guaranteed
          {row.guaranteedDollars > 0 ? (
            <span className="block text-gray-400 mt-0.5">
              {isMonthly
                ? `$${Math.round(row.guaranteedDollars / 12).toLocaleString()}/mo`
                : `$${Math.round(row.guaranteedDollars).toLocaleString()}/yr`}
            </span>
          ) : (
            <span className="block mt-0.5 min-h-[1.25rem]" aria-hidden />
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="mb-8 p-6 rounded-xl bg-gray-900/50 border border-gray-700">
      <h2 className="text-lg font-semibold text-white mb-2">Comparison (Current vs PRIME)</h2>
      <p className="text-sm text-gray-400 mb-4">
        Display: {income.amountDisplayMode}. Use the scenario toggles below the Monte Carlo section to compare Working Longer, Income Goal, Rate of Return, and Additional Savings.
      </p>

      {/* PRIME option to compare — at top */}
      {validOptions.length > 0 && (
        <div className="mb-6 p-4 rounded-lg bg-gray-800/50 border border-gray-600">
          <h3 className="text-sm font-medium text-gray-300 mb-3">PRIME option to compare</h3>
          <p className="text-xs text-gray-500 mb-3">Select an option to see how it affects the comparison.</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedPrimeOptionId("all")}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                selectedPrimeOptionId === "all"
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              All options
            </button>
            {opts.map((opt, idx) => {
              if (!isPrimeOptionValid(opt)) return null;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedPrimeOptionId(opt.id)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    selectedPrimeOptionId === opt.id
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  Option {idx + 1}: ${(opt.premiumAmount / 1000).toFixed(0)}k premium
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="h-80 w-full min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%" minHeight={300}>
          <ComposedChart
            data={chartData}
            margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="age"
              stroke="#9CA3AF"
              tick={{ fill: "#9CA3AF", fontSize: 12 }}
              label={{ value: "Client age", position: "insideBottom", fill: "#9CA3AF" }}
            />
            <YAxis
              stroke="#9CA3AF"
              tick={{ fill: "#9CA3AF", fontSize: 12 }}
              tickFormatter={(v) => (isMonthly ? `$${v / 1000}k` : `$${Math.round(v / 1000)}k`)}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151" }}
              labelStyle={{ color: "#9CA3AF" }}
              formatter={(value: number | undefined) => [
                value != null ? (isMonthly ? `$${Number(value).toLocaleString()}/mo` : `$${Number(value).toLocaleString()}/yr`) : "",
                "",
              ]}
              labelFormatter={(age) => `Age ${age}`}
            />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              formatter={(value) => <span className="text-gray-300">{value}</span>}
            />
            <Line
              type="monotone"
              dataKey="current"
              name="Current Path"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
            />
            {hasPrimePath && (
              <Line
                type="monotone"
                dataKey="prime"
                name="PRIME Path"
                stroke="#10B981"
                strokeWidth={2}
                dot={false}
              />
            )}
            <Line
              type="monotone"
              dataKey="guaranteedCurrent"
              name="Current Guaranteed Income"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
              strokeDasharray="4 4"
            />
            {hasPrimePath && (
              <Line
                type="monotone"
                dataKey="guaranteedPrime"
                name="PRIME Guaranteed Income"
                stroke="#10B981"
                strokeWidth={2}
                dot={false}
                strokeDasharray="4 4"
              />
            )}
            {hasTarget && (
              <Line
                type="monotone"
                dataKey="target"
                name="Income Goal"
                stroke="#F59E0B"
                strokeWidth={1.5}
                dot={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {current.rows.length > 0 && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm max-w-3xl">
          <div className="space-y-3">
            <div className="text-blue-400 font-medium mb-1">Current</div>
            {renderAgeBox(
              `First year of retirement (Year ${retirementYear})`,
              retirementRow,
              "current"
            )}
            {renderAgeBox("Age 70", rowAt70, "current")}
            {renderAgeBox("Age 80", rowAt80, "current")}
          </div>
          {hasPrimePath && prime.rows.length > 0 && (
            <div className="space-y-3">
              <div className="text-emerald-400 font-medium mb-1">PRIME</div>
              {renderAgeBox(
                `First year of retirement (Year ${retirementYear})`,
                primeRetirementRow,
                "prime"
              )}
              {primeRowAt70 && renderAgeBox("Age 70", primeRowAt70, "prime")}
              {primeRowAt80 && renderAgeBox("Age 80", primeRowAt80, "prime")}
            </div>
          )}
        </div>
      )}

      {current.rows.length > 0 && monteCarloResults && (
        <div className="mt-6 p-5 rounded-xl bg-gray-800/60 border border-gray-600">
          <h3 className="text-base font-semibold text-white mb-2">Monte Carlo Analysis</h3>
          <p className="text-xs text-gray-400 mb-4">
            A thousand scenarios using historical S&P returns. Success equals portfolio does not run out of money before the plan ends. This comparison assumes income and distributions are capped based on your income goal
            {incomeGoal > 0 ? (
              <> (${Math.round(incomeGoal).toLocaleString()}/mo)</>
            ) : null}
            .
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Current Path", rate: Math.min(99, monteCarloResults.current.successRatePct), pathKey: "current" },
              ...(monteCarloResults.prime
                ? [{ label: "PRIME Path", rate: Math.min(99, monteCarloResults.prime.successRatePct), pathKey: "prime" as const }]
                : []),
            ].map(({ label, rate, pathKey }) => {
              const tier = rate >= 80 ? "green" : rate >= 70 ? "yellow" : "red";
              const borderColor =
                tier === "green"
                  ? "border-green-500"
                  : tier === "yellow"
                    ? "border-yellow-500"
                    : "border-red-500";
              const textColor =
                tier === "green"
                  ? "text-green-400"
                  : tier === "yellow"
                    ? "text-yellow-400"
                    : "text-red-400";
              return (
                <div
                  key={pathKey}
                  className={`p-4 rounded-lg border-l-4 ${borderColor} bg-gray-900/50 border border-gray-600`}
                >
                  <div className="text-sm font-medium text-gray-300 mb-1">{label}</div>
                  <div className={`text-2xl font-bold ${textColor}`}>
                    {rate.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    success rate{tier === "red" ? " — careful" : ""}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {hasAnyScenarioAdjustment && current.rows.length > 0 && combinedMonteCarloResults && (
        <div className="mt-6 p-5 rounded-xl bg-gray-800/60 border border-gray-600 border-l-4 border-l-amber-500">
          <h3 className="text-base font-semibold text-white mb-2">Monte Carlo with all scenario adjustments</h3>
          <p className="text-xs text-gray-400 mb-4">
            If all of your scenario toggles are applied together—Working Longer, Income Goal, rate of return bump, and Additional Savings—here are Current vs PRIME success rates under those assumptions.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Current Path", rate: Math.min(99, combinedMonteCarloResults.current.successRatePct), pathKey: "current" as const },
              ...(combinedMonteCarloResults.prime
                ? [{ label: "PRIME Path", rate: Math.min(99, combinedMonteCarloResults.prime.successRatePct), pathKey: "prime" as const }]
                : []),
            ].map(({ label, rate, pathKey }) => {
              const tier = rate >= 80 ? "green" : rate >= 70 ? "yellow" : "red";
              const borderColor =
                tier === "green"
                  ? "border-green-500"
                  : tier === "yellow"
                    ? "border-yellow-500"
                    : "border-red-500";
              const textColor =
                tier === "green"
                  ? "text-green-400"
                  : tier === "yellow"
                    ? "text-yellow-400"
                    : "text-red-400";
              return (
                <div
                  key={pathKey}
                  className={`p-4 rounded-lg border-l-4 ${borderColor} bg-gray-900/50 border border-gray-600`}
                >
                  <div className="text-sm font-medium text-gray-300 mb-1">{label}</div>
                  <div className={`text-2xl font-bold ${textColor}`}>{rate.toFixed(1)}%</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    success rate (all adjustments){tier === "red" ? " — careful" : ""}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Scenario toggles: below Monte Carlo, above Premature Death */}
      <div className="mt-6 p-5 rounded-xl bg-gray-800/60 border border-gray-600">
        <h3 className="text-base font-semibold text-white mb-2">Scenario toggles</h3>
        <p className="text-xs text-gray-500 mb-4">
          Turn on the toggles you want to compare. Working Longer and Income Goal affect the main chart and Monte Carlo above. When any adjustments are set, the &quot;Monte Carlo with all scenario adjustments&quot; block shows Current vs PRIME under those combined assumptions.
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={() => setShowWorkingLonger((v) => !v)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              showWorkingLonger ? "bg-emerald-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Working Longer
          </button>
          <button
            type="button"
            onClick={() => setShowIncomeGoal((v) => !v)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              showIncomeGoal ? "bg-amber-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Income Goal
          </button>
          <button
            type="button"
            onClick={() => setShowRateOfReturn((v) => !v)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              showRateOfReturn ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Rate of Return <span className="text-xs opacity-90">(before retirement)</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAdditionalSavings((v) => !v)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              showAdditionalSavings ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Additional Savings <span className="text-xs opacity-90">(taxable)</span>
          </button>
          {hasSpouse && client && (
            <button
              type="button"
              onClick={() => setShowPrematureDeathPanel((v) => !v)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                showPrematureDeathPanel ? "bg-red-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              Premature Death
            </button>
          )}
        </div>

        <div className="space-y-4">
          {showWorkingLonger && client && (
            <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-600">
              <h4 className="text-sm font-medium text-gray-300 mb-3">Working Longer (retirement age)</h4>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="range"
                    min={Math.max(client.currentAge + 1, 55)}
                    max={85}
                    step={1}
                    value={retirementAge}
                    onChange={(e) => setRetirementAgeOverride(Number(e.target.value))}
                    onDoubleClick={() => setRetirementAgeOverride(null)}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Age</span>
                  <span className="text-white font-medium min-w-[2.5rem]">{retirementAge}</span>
                  {retirementAgeOverride != null && (
                    <button
                      type="button"
                      onClick={() => setRetirementAgeOverride(null)}
                      className="text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {showIncomeGoal && (
            <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-600">
              <h4 className="text-sm font-medium text-gray-300 mb-3">Income Goal (for comparison)</h4>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="range"
                    min={0}
                    max={Math.max(baseIncomeGoal * 2, 30000)}
                    step={100}
                    value={incomeGoal}
                    onChange={(e) => setIncomeGoalOverride(Number(e.target.value))}
                    onDoubleClick={() => setIncomeGoalOverride(null)}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">${Math.round(incomeGoal).toLocaleString()}/mo</span>
                  {incomeGoalOverride != null && (
                    <button
                      type="button"
                      onClick={() => setIncomeGoalOverride(null)}
                      className="text-xs text-amber-400 hover:text-amber-300"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {showRateOfReturn && (
            <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-600">
              <h4 className="text-sm font-medium text-gray-300 mb-3">Rate of Return <span className="text-xs font-normal opacity-90">(before retirement)</span></h4>
              <p className="text-xs text-gray-500 mb-3">
                How much would your success rate improve if you earned more before retirement? Same rate bump applied to all accounts (illustrative only).
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="range"
                    min={0}
                    max={5}
                    step={0.5}
                    value={rateOfReturnBumpPct}
                    onChange={(e) => setRateOfReturnBumpPct(Number(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">+{rateOfReturnBumpPct}% to all growth</span>
                  {rateOfReturnBumpPct > 0 && (
                    <button
                      type="button"
                      onClick={() => setRateOfReturnBumpPct(0)}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
              {rateOfReturnBumpPct > 0 && rateBumpMonteCarlo && (
                <div className="mt-3 p-3 rounded bg-gray-900/50 border border-gray-600">
                  <span className="text-sm text-gray-400">Current path success rate with +{rateOfReturnBumpPct}% growth: </span>
                  <span className="text-lg font-semibold text-blue-400">{Math.min(99, rateBumpMonteCarlo.successRatePct).toFixed(1)}%</span>
                </div>
              )}
            </div>
          )}

          {showAdditionalSavings && (
            <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-600">
              <h4 className="text-sm font-medium text-gray-300 mb-3">Additional Savings <span className="text-xs font-normal opacity-90">(taxable)</span></h4>
              <p className="text-xs text-gray-500 mb-3">
                How much more to save each year in a taxable account (same rate of return as your taxable accounts). For quick comparison only.
              </p>
              {!hasTaxableAccount ? (
                <p className="text-xs text-amber-500">Add at least one taxable account in Accounts to use this scenario.</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <input
                        type="range"
                        min={0}
                        max={50000}
                        step={500}
                        value={additionalSavingsAnnual}
                        onChange={(e) => setAdditionalSavingsAnnual(Number(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">+${additionalSavingsAnnual.toLocaleString()}/yr</span>
                      {additionalSavingsAnnual > 0 && (
                        <button
                          type="button"
                          onClick={() => setAdditionalSavingsAnnual(0)}
                          className="text-xs text-purple-400 hover:text-purple-300"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                  {additionalSavingsAnnual > 0 && extraSavingsMonteCarlo && (
                    <div className="mt-3 p-3 rounded bg-gray-900/50 border border-gray-600">
                      <span className="text-sm text-gray-400">Current path success rate with +${additionalSavingsAnnual.toLocaleString()}/yr taxable savings: </span>
                      <span className="text-lg font-semibold text-purple-400">{Math.min(99, extraSavingsMonteCarlo.successRatePct).toFixed(1)}%</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {showPrematureDeathPanel && hasSpouse && client && (
            <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-600">
              <div className="flex items-center justify-between mb-2 gap-4 flex-wrap">
                <div>
                  <h4 className="text-sm font-medium text-gray-300">Premature Death (client)</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Hidden by default so you can choose when to have this insurance discussion.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPrematureDeath((v) => !v)}
                  className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                    showPrematureDeath
                      ? "border-red-500 text-red-300 bg-red-500/10"
                      : "border-gray-600 text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  {showPrematureDeath ? "Hide analysis" : "Show analysis"}
                </button>
              </div>

              {showPrematureDeath && (
                <>
                  <p className="text-xs text-gray-500 mb-3">
                    Assume the client passes away early. We estimate the income gap for the surviving spouse against{" "}
                    <span className="font-medium text-gray-300">85% of the original income goal</span>, reflecting a 15% reduction in household expenses.
                    Social Security is adjusted to the higher benefit. Pensions and annuities use the{" "}
                    <span className="font-medium text-gray-300">survivor benefit %</span> you entered in Retirement Income: if a source is shown as surviving at 100%, there is no reduction; otherwise the client’s portion is reduced to that percentage. Single-life PRIME benefits owned by the client stop after death.
                    The analysis below uses your current scenario adjustments (Working Longer, Income Goal).
                  </p>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <input
                        type="range"
                        min={Math.max(client.currentAge + 1, 40)}
                        max={client.projectedPlanAge ?? 90}
                        step={1}
                        value={prematureDeathAge ?? (client.currentAge + 10)}
                        onChange={(e) => setPrematureDeathAge(Number(e.target.value))}
                        onDoubleClick={() => setPrematureDeathAge(null)}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                      />
                    </div>
                    <div className="flex flex-col gap-1 text-xs text-gray-400 min-w-[11rem]">
                      <div className="flex items-center gap-2">
                        <span>Death age:</span>
                        <span className="text-white font-semibold">
                          {prematureDeathAge ?? "—"}
                        </span>
                        {prematureDeathAge != null && (
                          <button
                            type="button"
                            onClick={() => setPrematureDeathAge(null)}
                            className="text-[11px] text-red-400 hover:text-red-300 ml-1"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      {prematureDeathAnalysis && (
                        <>
                          <div>
                            First year gap at age{" "}
                            <span className="font-semibold text-white">
                              {prematureDeathAnalysis.firstShortfallAge}
                            </span>
                            :{" "}
                            <span className="font-semibold text-white">
                              ${Math.round(prematureDeathAnalysis.firstYearShortfallAnnual).toLocaleString()}
                              /yr{" "}
                              ({`$${Math.round(prematureDeathAnalysis.firstYearShortfallMonthly).toLocaleString()}/mo`})
                            </span>
                          </div>
                          <div>
                            Total nominal shortfall over retirement:{" "}
                            <span className="font-semibold text-white">
                              ${Math.round(prematureDeathAnalysis.totalShortfall).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-500">
                            Use this as a starting point for discussing life insurance coverage needs. No discounting is applied; values are in future nominal dollars.
                          </div>
                        </>
                      )}
                      {!prematureDeathAnalysis && prematureDeathAge != null && (
                        <div className="text-[11px] text-gray-500">
                          At this death age there is no modeled shortfall vs. 85% of the current income goal.
                        </div>
                      )}
                    </div>
                  </div>

                  {survivorMonteCarloResults != null && (
                    <div className="mt-4 pt-4 border-t border-gray-600">
                      <h4 className="text-sm font-medium text-gray-300 mb-2">Monte Carlo (survivor scenario)</h4>
                      <p className="text-xs text-gray-500 mb-3">
                        If the client passes at age {prematureDeathAge}, can the portfolio at that date support the survivor’s income need (85% goal) through plan end? Same historical-return bootstrap as above. Uses current scenario (retirement age, income goal).
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          { label: "Current path", rate: Math.min(99, survivorMonteCarloResults.current.successRatePct), pathKey: "current" as const },
                          ...(survivorMonteCarloResults.prime != null
                            ? [{ label: "PRIME path", rate: Math.min(99, survivorMonteCarloResults.prime.successRatePct), pathKey: "prime" as const }]
                            : []),
                        ].map(({ label, rate, pathKey }) => {
                          const tier = rate >= 80 ? "green" : rate >= 70 ? "yellow" : "red";
                          const borderColor =
                            tier === "green" ? "border-green-500" : tier === "yellow" ? "border-yellow-500" : "border-red-500";
                          const textColor =
                            tier === "green" ? "text-green-400" : tier === "yellow" ? "text-yellow-400" : "text-red-400";
                          return (
                            <div
                              key={pathKey}
                              className={`p-4 rounded-lg border-l-4 ${borderColor} bg-gray-900/50 border border-gray-600`}
                            >
                              <div className="text-sm font-medium text-gray-300 mb-1">{label}</div>
                              <div className={`text-2xl font-bold ${textColor}`}>{rate.toFixed(1)}%</div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                success rate (survivor)
                                {tier === "red" ? " — consider life insurance / gap funding" : ""}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {survivorMonteCarloResults.prime != null && (() => {
                        const currentCapped = Math.min(99, survivorMonteCarloResults.current.successRatePct);
                        const primeCapped = Math.min(99, survivorMonteCarloResults.prime!.successRatePct);
                        return (
                          <div className="mt-3 text-xs text-gray-400">
                            <span className="font-medium text-gray-300">Difference: </span>
                            {primeCapped >= currentCapped
                              ? `PRIME path is ${(primeCapped - currentCapped).toFixed(1)} pts higher`
                              : `Current path is ${(currentCapped - primeCapped).toFixed(1)} pts higher`}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
