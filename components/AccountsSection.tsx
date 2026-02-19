"use client";

import { useState } from "react";
import { useCalculator } from "@/context/CalculatorContext";
import type { AccountType, IncomeOwner } from "@/lib/types";

const ACCOUNT_SECTIONS: { type: AccountType; title: string }[] = [
  { type: "qualified", title: "Qualified" },
  { type: "roth", title: "Roth" },
  { type: "taxable", title: "Taxable" },
  { type: "cash", title: "Cash" },
  { type: "insurance", title: "Cash value insurance" },
];

function formatPercentDisplay(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "";
  const r = Math.round(Number(n) * 100) / 100;
  if (r === 0) return "0";
  if (r % 1 === 0) return String(r);
  return r.toFixed(2).replace(/\.?0+$/, ""); // e.g. 7.5 not 7.50
}

function parsePercentValue(v: string): number {
  const cleaned = v.replace(/,/g, ".").trim();
  if (cleaned === "" || cleaned === ".") return 0;
  const num = Number(cleaned);
  return Number.isFinite(num) ? Math.round(num * 100) / 100 : 0;
}

/** Percentage input that keeps a draft while typing so decimals (e.g. 7.5, 4.25) can be entered */
function PercentInput({
  label,
  value,
  onValueChange,
  className = "",
}: {
  label: string;
  value: number;
  onValueChange: (n: number) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft !== null ? draft : formatPercentDisplay(value);

  const handleFocus = () => setDraft(formatPercentDisplay(value));
  const handleBlur = () => {
    const n = parsePercentValue(display);
    onValueChange(n);
    setDraft(null);
  };
  // Allow digits, one optional decimal/comma, and digits after (e.g. 7, 7., 7.5, 7,5)
  const handleChange = (v: string) => {
    if (v === "" || /^\d*[.,]?\d*$/.test(v)) setDraft(v);
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      <input
        type="text"
        inputMode="decimal"
        value={display}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-right text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[130px] sm:min-w-[150px]"
      />
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  numeric = false,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: "text" | "number";
  numeric?: boolean;
}) {
  const inputType = numeric ? "text" : type;
  const numericClasses = numeric ? " text-right min-w-[130px] sm:min-w-[150px]" : "";

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      <input
        type={inputType}
        inputMode={numeric ? "decimal" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent${numericClasses}`}
      />
    </div>
  );
}

export default function AccountsSection() {
  const {
    accounts,
    addAccount,
    updateAccount,
    removeAccount,
    distributionRateAssumptionPct,
    setDistributionRateAssumptionPct,
    hasSpouse,
    client,
    spouse,
  } = useCalculator();

  const clientLabel = client?.name || "Client";
  const spouseLabel = spouse?.name || "Spouse";

  const accountsByType = (type: AccountType) => accounts.filter((a) => a.type === type);
  const canRemove = (acc: { id: string; type: AccountType }) => accountsByType(acc.type).length > 1;

  const formatNumber = (n: number | null | undefined) => {
    if (n === 0) return "0";
    if (n == null || Number.isNaN(n)) return "";
    return n.toLocaleString("en-US");
  };

  const parseNumber = (v: string) => {
    const cleaned = v.replace(/,/g, "");
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  };

  return (
    <section className="mb-8 p-6 rounded-xl bg-gray-900/50 border border-gray-700">
      <h2 className="text-lg font-semibold text-white mb-1">Accounts</h2>
      <p className="text-sm text-gray-400 mb-4">
        Set default distribution rate for new accounts and tax rate for all account types.
      </p>

      <div className="mb-6 max-w-[200px]">
        <div>
          <PercentInput
            label="Default distribution rate (%)"
            value={distributionRateAssumptionPct ?? 0}
            onValueChange={setDistributionRateAssumptionPct}
            className="max-w-[140px]"
          />
          <p className="text-xs text-gray-500 mt-1">Used when adding new accounts.</p>
        </div>
      </div>

      {ACCOUNT_SECTIONS.map(({ type, title }) => {
        const list = accountsByType(type);
        return (
          <div key={type} className="mb-8">
            <hr className="border-gray-600 my-6" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white">{title}</h3>
              <button
                type="button"
                onClick={() => addAccount(type)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 text-sm"
              >
                <span className="text-lg">+</span> Add another {title}
              </button>
            </div>
            {list.length === 0 ? (
              <p className="text-sm text-gray-500 mb-2">No {title.toLowerCase()} accounts yet. Click above to add one.</p>
            ) : (
              <div className="space-y-4">
                {list.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-4 rounded-lg bg-gray-800/50 border border-gray-600 space-y-4"
                  >
                    {/* Top row: name, owner, balance, contributions */}
                    <div
                      className={`grid grid-cols-1 ${
                        hasSpouse ? "md:grid-cols-5" : "md:grid-cols-3"
                      } gap-4 items-end`}
                    >
                      <div className={hasSpouse ? "md:col-span-2" : ""}>
                        <Input
                          label="Account name"
                          type="text"
                          value={acc.accountName ?? ""}
                          onChange={(v) => updateAccount(acc.id, { accountName: v })}
                        />
                      </div>
                      {hasSpouse && (
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Owner</label>
                          <select
                            value={acc.owner ?? "client"}
                            onChange={(e) => updateAccount(acc.id, { owner: e.target.value as IncomeOwner })}
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="client">{clientLabel}</option>
                            <option value="spouse">{spouseLabel}</option>
                          </select>
                        </div>
                      )}
                      <Input
                        label="Balance ($)"
                        value={formatNumber(acc.balance)}
                        onChange={(v) => updateAccount(acc.id, { balance: parseNumber(v) })}
                        numeric
                      />
                      <Input
                        label="Contributions ($/yr)"
                        value={formatNumber(acc.contributions)}
                        onChange={(v) => updateAccount(acc.id, { contributions: parseNumber(v) })}
                        numeric
                      />
                    </div>

                    {/* Second row: tax rate, growth, distribution */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <div className="md:max-w-[140px]">
                        <PercentInput
                          label="Tax rate (%)"
                          value={acc.taxRatePct ?? 0}
                          onValueChange={(n) => updateAccount(acc.id, { taxRatePct: n })}
                        />
                      </div>
                      <PercentInput
                        label="Growth rate (%)"
                        value={acc.growthRatePct ?? 0}
                        onValueChange={(n) => updateAccount(acc.id, { growthRatePct: n })}
                      />
                      <PercentInput
                        label="Distribution rate (%)"
                        value={acc.distributionRatePct ?? 0}
                        onValueChange={(n) => updateAccount(acc.id, { distributionRatePct: n })}
                      />
                    </div>
                    <div className="flex items-end gap-2 flex-wrap">
                      {canRemove(acc) && (
                        <button
                          type="button"
                          onClick={() => removeAccount(acc.id)}
                          className="text-red-400 hover:text-red-300 text-sm py-2"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
