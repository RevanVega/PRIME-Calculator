"use client";

import { useCalculator } from "@/context/CalculatorContext";
import type { AccountType, PrimeBenefitOption, PrimeOwnerOption } from "@/lib/types";

const ACCOUNT_OPTIONS: { value: AccountType; label: string }[] = [
  { value: "qualified", label: "Qualified" },
  { value: "roth", label: "Roth" },
  { value: "taxable", label: "Taxable" },
  { value: "cash", label: "Cash" },
  { value: "insurance", label: "Cash value insurance" },
];

const BENEFIT_OPTIONS: { value: PrimeBenefitOption; label: string }[] = [
  { value: "visit", label: "Visit" },
  { value: "singleLife", label: "Single life" },
  { value: "joint", label: "Joint" },
];

export default function AnnuityPrimeSection() {
  const {
    annuityPrimeOptions,
    addAnnuityPrimeOption,
    removeAnnuityPrimeOption,
    updateAnnuityPrimeOption,
    hasSpouse,
    client,
    spouse,
  } = useCalculator();

  const clientLabel = client?.name || "Client";
  const spouseLabel = spouse?.name || "Spouse";

  const OWNER_OPTIONS: { value: PrimeOwnerOption; label: string }[] = [
    { value: "client", label: clientLabel },
    { value: "spouse", label: spouseLabel },
    { value: "joint", label: "Joint" },
  ];

  return (
    <section className="mb-8 p-6 rounded-xl bg-gray-900/50 border border-gray-700">
      <h2 className="text-lg font-semibold text-white mb-1">Prime</h2>
      <p className="text-sm text-gray-400 mb-4">
        Allocate premium from an account into an annuity for guaranteed flat income (no COLA). Add multiple options for different start ages.
      </p>

      {annuityPrimeOptions.length === 0 ? (
        <p className="text-sm text-gray-500 mb-4">
          Add a PRIME option below to compare the PRIME path vs current path. Leave at 0 to compare current path only.
        </p>
      ) : (
        <div className="space-y-6 mb-6">
          {annuityPrimeOptions.map((opt, index) => (
            <div
              key={opt.id}
              className="p-4 rounded-lg bg-gray-800/50 border border-gray-600"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-300">PRIME option {index + 1}</h3>
                {annuityPrimeOptions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAnnuityPrimeOption(opt.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Premium amount ($)</label>
                  <input
                    type="number"
                    value={opt.premiumAmount || ""}
                    onChange={(e) => updateAnnuityPrimeOption(opt.id, { premiumAmount: Number(e.target.value) || 0 })}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Referenced account</label>
                  <select
                    value={opt.referencedAccountType}
                    onChange={(e) => updateAnnuityPrimeOption(opt.id, { referencedAccountType: e.target.value as AccountType })}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
                  >
                    {ACCOUNT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Income start age</label>
                  <input
                    type="number"
                    value={opt.incomeStartAge || ""}
                    onChange={(e) => updateAnnuityPrimeOption(opt.id, { incomeStartAge: Number(e.target.value) || 0 })}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Annual payout amount (no COLA)</label>
                  <input
                    type="number"
                    value={opt.payoutAmount || ""}
                    onChange={(e) => updateAnnuityPrimeOption(opt.id, { payoutAmount: Number(e.target.value) || 0 })}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Benefit option</label>
                  <select
                    value={opt.benefitOption}
                    onChange={(e) => updateAnnuityPrimeOption(opt.id, { benefitOption: e.target.value as PrimeBenefitOption })}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
                  >
                    {BENEFIT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Owner</label>
                  <select
                    value={opt.owner}
                    onChange={(e) => updateAnnuityPrimeOption(opt.id, { owner: e.target.value as PrimeOwnerOption })}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
                  >
                    {OWNER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Carrier (optional)</label>
                  <input
                    type="text"
                    value={opt.carrier ?? ""}
                    onChange={(e) => updateAnnuityPrimeOption(opt.id, { carrier: e.target.value })}
                    placeholder="e.g. Carrier name"
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addAnnuityPrimeOption}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 hover:border-gray-500 transition-colors"
      >
        <span className="text-lg">+</span>
        {annuityPrimeOptions.length === 0 ? "Add PRIME option" : "Add another PRIME option"}
      </button>
    </section>
  );
}
