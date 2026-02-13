"use client";

import { useCalculator } from "@/context/CalculatorContext";

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: "text" | "number";
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
}

export default function ClientSection() {
  const {
    hasSpouse,
    setHasSpouse,
    client,
    setClient,
    spouse,
    setSpouse,
    clientTaxRateAssumptionPct,
    setClientTaxRateAssumptionPct,
  } = useCalculator();

  return (
    <section className="mb-8 p-6 rounded-xl bg-gray-900/50 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Client information</h2>
          <p className="text-sm text-gray-400 mt-0.5">This information is assumed for all assumptions below.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-300">Spouse</span>
          <button
            type="button"
            role="switch"
            aria-checked={hasSpouse}
            onClick={() => setHasSpouse(!hasSpouse)}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black ${
              hasSpouse ? "bg-blue-600" : "bg-gray-600"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                hasSpouse ? "translate-x-5" : "translate-x-0.5"
              }`}
              style={{ marginTop: 2 }}
            />
          </button>
        </div>
      </div>

      <div className={`grid gap-6 ${hasSpouse ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-blue-400">Client</h3>
          <Input
            label="Client name"
            value={client.name}
            onChange={(v) => setClient({ ...client, name: v })}
            placeholder="e.g. John Smith"
          />
          <Input
            label="Current age"
            type="number"
            value={client.currentAge || ""}
            onChange={(v) => setClient({ ...client, currentAge: Number(v) || 0 })}
          />
          <Input
            label="Projected retirement age"
            type="number"
            value={client.projectedRetirementAge || ""}
            onChange={(v) => setClient({ ...client, projectedRetirementAge: Number(v) || 0 })}
          />
          <Input
            label="Projected plan age"
            type="number"
            value={client.projectedPlanAge || ""}
            onChange={(v) => setClient({ ...client, projectedPlanAge: Number(v) || 0 })}
          />
          <Input
            label="Current monthly income goal"
            type="number"
            value={client.currentMonthlyIncomeGoal || ""}
            onChange={(v) => setClient({ ...client, currentMonthlyIncomeGoal: Number(v) || 0 })}
          />
          <p className="text-xs text-gray-500">Inflated to compare at retirement — does income meet objectives?</p>
          <Input
            label="Inflation for income goal (%)"
            type="number"
            value={client.inflationForIncomeGoalPct ?? ""}
            onChange={(v) => setClient({ ...client, inflationForIncomeGoalPct: Number(v) || 0 })}
          />
          <Input
            label="Tax rate assumption (%)"
            type="number"
            value={clientTaxRateAssumptionPct ?? ""}
            onChange={(v) => setClientTaxRateAssumptionPct(Number(v) || 0)}
          />
        </div>

        {hasSpouse && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-blue-400">Spouse</h3>
            <Input
              label="Spouse name"
              value={spouse.name}
              onChange={(v) => setSpouse({ ...spouse, name: v })}
              placeholder="e.g. Jane Smith"
            />
            <Input
              label="Current age"
              type="number"
              value={spouse.currentAge || ""}
              onChange={(v) => setSpouse({ ...spouse, currentAge: Number(v) || 0 })}
            />
            <Input
              label="Projected retirement age"
              type="number"
              value={spouse.projectedRetirementAge || ""}
              onChange={(v) => setSpouse({ ...spouse, projectedRetirementAge: Number(v) || 0 })}
            />
            <Input
              label="Projected plan age"
              type="number"
              value={spouse.projectedPlanAge || ""}
              onChange={(v) => setSpouse({ ...spouse, projectedPlanAge: Number(v) || 0 })}
            />
          </div>
        )}
      </div>
    </section>
  );
}
