"use client";

import { useCalculator } from "@/context/CalculatorContext";
import { useProjection } from "@/hooks/useProjection";
import {
  LineChart,
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
          <LineChart
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
              name="Current path"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
            />
            {hasPrimePath && (
              <Line
                type="monotone"
                dataKey="prime"
                name="PRIME path"
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
                name="Income goal"
                stroke="#F59E0B"
                strokeWidth={1.5}
                dot={false}
              />
            )}
            <Line
              type="monotone"
              dataKey="guaranteedCurrent"
              name="Current guaranteed"
              stroke="#14B8A6"
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="2 2"
              strokeOpacity={0.9}
            />
            {hasPrimePath && (
              <Line
                type="monotone"
                dataKey="guaranteedPrime"
                name="PRIME guaranteed"
                stroke="#34D399"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="2 2"
                strokeOpacity={0.9}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {current.rows.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-600">
            <div className="text-gray-400">Current (first year)</div>
            <div className="text-white font-medium">
              {isMonthly
                ? `$${Math.round(current.rows[0].monthlyTotal).toLocaleString()}/mo`
                : `$${Math.round(current.rows[0].annualTotal).toLocaleString()}/yr`}
            </div>
          </div>
          {hasPrimePath && prime.rows.length > 0 && (
            <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-600">
              <div className="text-gray-400">PRIME (first year)</div>
              <div className="text-white font-medium">
                {isMonthly
                  ? `$${Math.round(prime.rows[0].monthlyTotal).toLocaleString()}/mo`
                  : `$${Math.round(prime.rows[0].annualTotal).toLocaleString()}/yr`}
              </div>
            </div>
          )}
          <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-600">
            <div className="text-gray-400">Guaranteed % (first year)</div>
            <div className="text-white font-medium">{Math.round(current.rows[0].guaranteedPct)}%</div>
          </div>
          <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-600">
            <div className="text-gray-400">FV at retirement</div>
            <div className="text-white font-medium">
              ${(current.futureValuesAtRetirement.qualified + current.futureValuesAtRetirement.roth + current.futureValuesAtRetirement.taxable + current.futureValuesAtRetirement.cash + current.futureValuesAtRetirement.insurance).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
