"use client";

import { useCalculator } from "@/context/CalculatorContext";
import { useProjection } from "@/hooks/useProjection";
import {
  ComposedChart,
  Line,
  Area,
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
            <defs>
              <linearGradient id="guaranteedCurrentFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.85} />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.6} />
              </linearGradient>
              <linearGradient id="guaranteedPrimeFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.85} />
                <stop offset="100%" stopColor="#10B981" stopOpacity={0.6} />
              </linearGradient>
            </defs>
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
            {/* Guaranteed areas (shadow/fill) — drawn first so lines sit on top */}
            <Area
              type="monotone"
              dataKey="guaranteedCurrent"
              name="Current guaranteed (area)"
              fill="url(#guaranteedCurrentFill)"
              stroke="none"
              isAnimationActive={false}
              hide
            />
            {hasPrimePath && (
              <Area
                type="monotone"
                dataKey="guaranteedPrime"
                name="PRIME guaranteed (area)"
                fill="url(#guaranteedPrimeFill)"
                stroke="none"
                isAnimationActive={false}
                hide
              />
            )}
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
              name="Guaranteed income (primary path)"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
              strokeDasharray="4 4"
            />
            {hasPrimePath && (
              <Line
                type="monotone"
                dataKey="guaranteedPrime"
                name="PRIME guaranteed income"
                stroke="#10B981"
                strokeWidth={2}
                dot={false}
                strokeDasharray="4 4"
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
    </section>
  );
}
