"use client";

import { useMemo } from "react";
import { useCalculator } from "@/context/CalculatorContext";
import { useProjection } from "@/hooks/useProjection";
import { runMonteCarlo } from "@/lib/monte-carlo";
import { HISTORICAL_RETURNS_PCT } from "@/lib/historical-returns";
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
  const { income, client, annuityPrimeOptions, updateAnnuityPrimeOption } = useCalculator();
  const { current, prime, hasPrimePath } = useProjection();
  const isMonthly = income.amountDisplayMode === "monthly";
  const firstOption = annuityPrimeOptions?.[0];

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
      target: client.currentMonthlyIncomeGoal > 0 ? Math.round(target) : undefined,
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
        Display: {income.amountDisplayMode}. Toggle annuity amounts below to see how the PRIME path changes.
      </p>

      {firstOption && (
        <div className="mb-6 p-4 rounded-lg bg-gray-800/50 border border-gray-600">
          <h3 className="text-sm font-medium text-gray-300 mb-3">First PRIME option (live)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Premium ($)</label>
              <input
                type="number"
                value={firstOption.premiumAmount || ""}
                onChange={(e) => updateAnnuityPrimeOption(firstOption.id, { premiumAmount: Number(e.target.value) || 0 })}
                className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Payout ($/yr, no COLA)</label>
              <input
                type="number"
                value={firstOption.payoutAmount || ""}
                onChange={(e) => updateAnnuityPrimeOption(firstOption.id, { payoutAmount: Number(e.target.value) || 0 })}
                className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Income start age</label>
              <input
                type="number"
                value={firstOption.incomeStartAge || ""}
                onChange={(e) => updateAnnuityPrimeOption(firstOption.id, { incomeStartAge: Number(e.target.value) || 0 })}
                className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm"
              />
            </div>
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
            {client?.currentMonthlyIncomeGoal != null && client.currentMonthlyIncomeGoal > 0 ? (
              <> (${Math.round(client.currentMonthlyIncomeGoal).toLocaleString()}/mo)</>
            ) : null}
            .
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Current Path", rate: monteCarloResults.current.successRatePct, pathKey: "current" },
              ...(monteCarloResults.prime
                ? [{ label: "PRIME Path", rate: monteCarloResults.prime.successRatePct, pathKey: "prime" as const }]
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
    </section>
  );
}
