"use client";

import { useCalculator } from "@/context/CalculatorContext";
import type { AmountDisplayMode } from "@/lib/types";

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: "text" | "number";
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
}

export default function IncomeSection() {
  const { income, setIncome, hasSpouse, addSideIncome, removeSideIncome, updateSideIncome } = useCalculator();
  const mode = income.amountDisplayMode;

  const setMode = (m: AmountDisplayMode) => setIncome({ ...income, amountDisplayMode: m });

  return (
    <section className="mb-8 p-6 rounded-xl bg-gray-900/50 border border-gray-700">
      <h2 className="text-lg font-semibold text-white mb-4">Income</h2>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-gray-400">Amount display:</span>
        <div className="inline-flex rounded-lg bg-gray-800 p-0.5 border border-gray-600">
          <button
            type="button"
            onClick={() => setMode("monthly")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === "monthly" ? "bg-green-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setMode("annual")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === "annual" ? "bg-green-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            Annual
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-6 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Cost of living adjustment (COLA) (%)</label>
          <p className="text-xs text-gray-500 mb-1">Percentage applied to inflation-adjusted withdrawals and benefits.</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={income.colaPct ?? ""}
              onChange={(e) => setIncome({ ...income, colaPct: Number(e.target.value) || 0 })}
              className="w-full max-w-[100px] bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-400">%</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Tax bracket (%)</label>
          <p className="text-xs text-gray-500 mb-1">Tax rate assumption for income.</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={income.taxRatePct ?? ""}
              onChange={(e) => setIncome({ ...income, taxRatePct: Number(e.target.value) || 0 })}
              className="w-full max-w-[100px] bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-400">%</span>
          </div>
        </div>
      </div>

      <div className={`grid gap-6 ${hasSpouse ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-blue-400">Client</h3>
          <Input
            label="Current income (annual)"
            type="number"
            value={income.client.currentIncomeAnnual || ""}
            onChange={(v) =>
              setIncome({
                ...income,
                client: { ...income.client, currentIncomeAnnual: Number(v) || 0 },
              })
            }
          />
          <Input
            label="Stop working at age"
            type="number"
            value={income.client.stopWorkingAge || ""}
            onChange={(v) =>
              setIncome({
                ...income,
                client: { ...income.client, stopWorkingAge: Number(v) || 0 },
              })
            }
          />
        </div>
        {hasSpouse && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-blue-400">Spouse</h3>
            <Input
              label="Current income (annual)"
              type="number"
              value={income.spouse.currentIncomeAnnual || ""}
              onChange={(v) =>
                setIncome({
                  ...income,
                  spouse: { ...income.spouse, currentIncomeAnnual: Number(v) || 0 },
                })
              }
            />
            <Input
              label="Stop working at age"
              type="number"
              value={income.spouse.stopWorkingAge || ""}
              onChange={(v) =>
                setIncome({
                  ...income,
                  spouse: { ...income.spouse, stopWorkingAge: Number(v) || 0 },
                })
              }
            />
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-300">Part-time / side income in retirement</span>
          <button
            type="button"
            onClick={addSideIncome}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 text-sm"
          >
            <span className="text-lg">+</span> Add part-time or side income
          </button>
        </div>
        {income.sideIncomeEntries.length > 0 && (
          <div className="space-y-4">
            {income.sideIncomeEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-4 rounded-lg bg-gray-800/50 border border-gray-600 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end"
              >
                <Input
                  label="Amount (annual)"
                  type="number"
                  value={entry.amount || ""}
                  onChange={(v) => updateSideIncome(entry.id, { amount: Number(v) || 0 })}
                />
                <Input
                  label="Start age"
                  type="number"
                  value={entry.startAge || ""}
                  onChange={(v) => updateSideIncome(entry.id, { startAge: Number(v) || 0 })}
                />
                <Input
                  label="End age"
                  type="number"
                  value={entry.endAge || ""}
                  onChange={(v) => updateSideIncome(entry.id, { endAge: Number(v) || 0 })}
                />
                <button
                  type="button"
                  onClick={() => removeSideIncome(entry.id)}
                  className="text-red-400 hover:text-red-300 text-sm py-2"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
