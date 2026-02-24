"use client";

import { useCalculator } from "@/context/CalculatorContext";
import type { IncomeOwner } from "@/lib/types";

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

export default function GuaranteedIncomeSection() {
  const {
    guaranteedIncome,
    setGuaranteedIncome,
    hasSpouse,
    client,
    spouse,
    addPension,
    addAnnuity,
    addRental,
    removePension,
    removeAnnuity,
    removeRental,
    updatePension,
    updateAnnuity,
    updateRental,
  } = useCalculator();

  const { socialSecurityClient, socialSecuritySpouse, pensions, annuities, rentals } = guaranteedIncome;
  const clientLabel = client?.name || "Client";
  const spouseLabel = spouse?.name || "Spouse";

  const parseNumber = (v: string): number => {
    const cleaned = v.replace(/,/g, "").trim();
    if (cleaned === "") return 0;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  };

  return (
    <section className="mb-8 p-6 rounded-xl bg-gray-900/50 border border-gray-700">
      <h2 className="text-lg font-semibold text-white mb-1">Guaranteed income</h2>
      <p className="text-sm text-gray-400 mb-6">Social Security first, then add other income sources.</p>

      <div className={`grid gap-6 ${hasSpouse ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"} mb-8`}>
        <div className="space-y-4 p-4 rounded-lg border border-blue-500/30 bg-gray-800/30">
          <h3 className="text-sm font-semibold text-blue-400">Social Security — Client</h3>
          <Input
            label="Projected monthly benefit amount"
            value={socialSecurityClient.monthlyBenefit ? socialSecurityClient.monthlyBenefit.toLocaleString() : ""}
            onChange={(v) =>
              setGuaranteedIncome({
                ...guaranteedIncome,
                socialSecurityClient: { ...socialSecurityClient, monthlyBenefit: parseNumber(v) },
              })
            }
          />
          <Input
            label="Projected Social Security start age"
            value={socialSecurityClient.startAge || ""}
            onChange={(v) =>
              setGuaranteedIncome({
                ...guaranteedIncome,
                socialSecurityClient: { ...socialSecurityClient, startAge: Number(v) || 0 },
              })
            }
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="COLA (%)"
              value={socialSecurityClient.colaPct ?? ""}
              onChange={(v) =>
                setGuaranteedIncome({
                  ...guaranteedIncome,
                  socialSecurityClient: { ...socialSecurityClient, colaPct: Number(v) || 0 },
                })
              }
            />
            <Input
              label="Tax rate (%)"
              value={socialSecurityClient.taxRatePct ?? ""}
              onChange={(v) =>
                setGuaranteedIncome({
                  ...guaranteedIncome,
                  socialSecurityClient: { ...socialSecurityClient, taxRatePct: Number(v) || 0 },
                })
              }
            />
          </div>
        </div>
        {hasSpouse && (
          <div className="space-y-4 p-4 rounded-lg border border-blue-500/30 bg-gray-800/30">
            <h3 className="text-sm font-semibold text-blue-400">Social Security — Spouse</h3>
            <Input
              label="Monthly income amount"
              value={socialSecuritySpouse.monthlyBenefit ? socialSecuritySpouse.monthlyBenefit.toLocaleString() : ""}
              onChange={(v) =>
                setGuaranteedIncome({
                  ...guaranteedIncome,
                socialSecuritySpouse: { ...socialSecuritySpouse, monthlyBenefit: parseNumber(v) },
                })
              }
            />
            <Input
              label="Estimated start age"
              value={socialSecuritySpouse.startAge || ""}
              onChange={(v) =>
                setGuaranteedIncome({
                  ...guaranteedIncome,
                  socialSecuritySpouse: { ...socialSecuritySpouse, startAge: Number(v) || 0 },
                })
              }
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="COLA (%)"
                value={socialSecuritySpouse.colaPct ?? ""}
                onChange={(v) =>
                  setGuaranteedIncome({
                    ...guaranteedIncome,
                    socialSecuritySpouse: { ...socialSecuritySpouse, colaPct: Number(v) || 0 },
                  })
                }
              />
              <Input
                label="Tax rate (%)"
                value={socialSecuritySpouse.taxRatePct ?? ""}
                onChange={(v) =>
                  setGuaranteedIncome({
                    ...guaranteedIncome,
                    socialSecuritySpouse: { ...socialSecuritySpouse, taxRatePct: Number(v) || 0 },
                  })
                }
              />
            </div>
          </div>
        )}
      </div>

      {pensions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Pensions</h3>
          <div className="space-y-4">
            {pensions.map((p) => (
              <div key={p.id} className="p-4 rounded-lg bg-gray-800/50 border border-gray-600 grid grid-cols-2 sm:grid-cols-5 gap-4 items-end">
                {hasSpouse && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Owner</label>
                    <select
                      value={p.owner ?? "client"}
                      onChange={(e) => updatePension(p.id, { owner: e.target.value as IncomeOwner })}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="client">{clientLabel}</option>
                      <option value="spouse">{spouseLabel}</option>
                    </select>
                  </div>
                )}
                <Input label="Amount (monthly)" value={p.amount ? p.amount.toLocaleString() : ""} onChange={(v) => updatePension(p.id, { amount: parseNumber(v) })} />
                <Input label="Start age" value={p.startAge || ""} onChange={(v) => updatePension(p.id, { startAge: Number(v) || 0 })} />
                <Input label="COLA (%)" value={p.colaPct ?? ""} onChange={(v) => updatePension(p.id, { colaPct: Number(v) || 0 })} />
                <Input label="Tax rate (%)" value={p.taxRatePct ?? ""} onChange={(v) => updatePension(p.id, { taxRatePct: Number(v) || 0 })} />
                <Input label="Survivor (%)" value={p.survivorPct ?? ""} onChange={(v) => updatePension(p.id, { survivorPct: Number(v) || 0 })} />
                <button type="button" onClick={() => removePension(p.id)} className="text-red-400 hover:text-red-300 text-sm sm:col-span-2">
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {annuities.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Annuities</h3>
          <div className="space-y-4">
            {annuities.map((a) => (
              <div key={a.id} className="p-4 rounded-lg bg-gray-800/50 border border-gray-600 grid grid-cols-2 sm:grid-cols-5 gap-4 items-end">
                {hasSpouse && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Owner</label>
                    <select
                      value={a.owner ?? "client"}
                      onChange={(e) => updateAnnuity(a.id, { owner: e.target.value as IncomeOwner })}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="client">{clientLabel}</option>
                      <option value="spouse">{spouseLabel}</option>
                    </select>
                  </div>
                )}
                <Input label="Current value ($)" value={a.balance != null && a.balance !== 0 ? a.balance.toLocaleString() : ""} onChange={(v) => updateAnnuity(a.id, { balance: parseNumber(v) })} />
                <Input label="Amount (monthly)" value={a.amount ? a.amount.toLocaleString() : ""} onChange={(v) => updateAnnuity(a.id, { amount: parseNumber(v) })} />
                <Input label="Start age" value={a.startAge || ""} onChange={(v) => updateAnnuity(a.id, { startAge: Number(v) || 0 })} />
                <Input label="COLA (%)" value={a.colaPct ?? ""} onChange={(v) => updateAnnuity(a.id, { colaPct: Number(v) || 0 })} />
                <Input label="Tax rate (%)" value={a.taxRatePct ?? ""} onChange={(v) => updateAnnuity(a.id, { taxRatePct: Number(v) || 0 })} />
                <Input label="Survivor (%)" value={a.survivorPct ?? ""} onChange={(v) => updateAnnuity(a.id, { survivorPct: Number(v) || 0 })} />
                <button type="button" onClick={() => removeAnnuity(a.id)} className="text-red-400 hover:text-red-300 text-sm sm:col-span-2">
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {rentals.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Rental income</h3>
          <div className="space-y-4">
            {rentals.map((r) => (
              <div key={r.id} className="p-4 rounded-lg bg-gray-800/50 border border-gray-600 grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
                {hasSpouse && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Owner</label>
                    <select
                      value={r.owner ?? "client"}
                      onChange={(e) => updateRental(r.id, { owner: e.target.value as IncomeOwner })}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="client">{clientLabel}</option>
                      <option value="spouse">{spouseLabel}</option>
                    </select>
                  </div>
                )}
                <Input label="Amount (monthly)" value={r.amount ? r.amount.toLocaleString() : ""} onChange={(v) => updateRental(r.id, { amount: parseNumber(v) })} />
                <Input label="Start age" value={r.startAge || ""} onChange={(v) => updateRental(r.id, { startAge: Number(v) || 0 })} />
                <Input label="COLA (%)" value={r.colaPct ?? ""} onChange={(v) => updateRental(r.id, { colaPct: Number(v) || 0 })} />
                <Input label="Tax rate (%)" value={r.taxRatePct ?? ""} onChange={(v) => updateRental(r.id, { taxRatePct: Number(v) || 0 })} />
                <button type="button" onClick={() => removeRental(r.id)} className="text-red-400 hover:text-red-300 text-sm">
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={addPension}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 hover:border-gray-500 transition-colors"
        >
          <span className="text-lg">+</span> Add pension
        </button>
        <button
          type="button"
          onClick={addAnnuity}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 hover:border-gray-500 transition-colors"
        >
          <span className="text-lg">+</span> Add annuity
        </button>
        <button
          type="button"
          onClick={addRental}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 hover:border-gray-500 transition-colors"
        >
          <span className="text-lg">+</span> Add rental income
        </button>
      </div>
    </section>
  );
}
