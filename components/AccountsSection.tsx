"use client";

import { useCalculator } from "@/context/CalculatorContext";
import type { AccountType, IncomeOwner } from "@/lib/types";

const ACCOUNT_SECTIONS: { type: AccountType; title: string }[] = [
  { type: "qualified", title: "Qualified" },
  { type: "roth", title: "Roth" },
  { type: "taxable", title: "Taxable" },
  { type: "cash", title: "Cash" },
  { type: "insurance", title: "Cash value insurance" },
];

function Input({
  label,
  value,
  onChange,
  type = "number",
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

  return (
    <section className="mb-8 p-6 rounded-xl bg-gray-900/50 border border-gray-700">
      <h2 className="text-lg font-semibold text-white mb-1">Accounts</h2>
      <p className="text-sm text-gray-400 mb-4">
        Set default distribution rate for new accounts and tax rate for all account types.
      </p>

      <div className="mb-6 max-w-[200px]">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Default distribution rate (%)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={distributionRateAssumptionPct ?? ""}
              onChange={(e) => setDistributionRateAssumptionPct(Number(e.target.value) || 0)}
              className="w-full max-w-[100px] bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-400">%</span>
          </div>
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
                    className="p-4 rounded-lg bg-gray-800/50 border border-gray-600 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-8 gap-4 items-end"
                  >
                    <Input
                      label="Account name"
                      type="text"
                      value={acc.accountName ?? ""}
                      onChange={(v) => updateAccount(acc.id, { accountName: v })}
                    />
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
                      value={acc.balance || ""}
                      onChange={(v) => updateAccount(acc.id, { balance: Number(v) || 0 })}
                    />
                    <Input
                      label="Contributions ($/yr)"
                      value={acc.contributions || ""}
                      onChange={(v) => updateAccount(acc.id, { contributions: Number(v) || 0 })}
                    />
                    <Input
                      label="Growth rate (%)"
                      value={acc.growthRatePct ?? ""}
                      onChange={(v) => updateAccount(acc.id, { growthRatePct: Number(v) || 0 })}
                    />
                    <Input
                      label="Distribution rate (%)"
                      value={acc.distributionRatePct ?? ""}
                      onChange={(v) => updateAccount(acc.id, { distributionRatePct: Number(v) || 0 })}
                    />
                    <Input
                      label="Tax rate (%)"
                      value={acc.taxRatePct ?? ""}
                      onChange={(v) => updateAccount(acc.id, { taxRatePct: Number(v) || 0 })}
                    />
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
