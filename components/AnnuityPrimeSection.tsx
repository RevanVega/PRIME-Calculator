"use client";

import { useCalculator } from "@/context/CalculatorContext";
import type { AccountType } from "@/lib/types";

const ACCOUNT_OPTIONS: { value: AccountType; label: string }[] = [
  { value: "qualified", label: "Qualified" },
  { value: "roth", label: "Roth" },
  { value: "taxable", label: "Taxable" },
  { value: "cash", label: "Cash" },
  { value: "insurance", label: "Cash value insurance" },
];

export default function AnnuityPrimeSection() {
  const { annuityPrime, setAnnuityPrime, accounts } = useCalculator();

  const prime = annuityPrime ?? {
    premiumAmount: 0,
    referencedAccountType: "qualified" as AccountType,
    incomeStartAge: 65,
    payoutAmount: 0,
    carrier: "",
  };

  const update = (u: Partial<typeof prime>) => {
    setAnnuityPrime({ ...prime, ...u });
  };

  return (
    <section className="mb-8 p-6 rounded-xl bg-gray-900/50 border border-gray-700">
      <h2 className="text-lg font-semibold text-white mb-1">PRIME — Annuity conversion</h2>
      <p className="text-sm text-gray-400 mb-4">
        Allocate a premium from an account into an annuity for guaranteed flat income (no COLA).
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Premium amount ($)</label>
          <input
            type="number"
            value={prime.premiumAmount || ""}
            onChange={(e) => update({ premiumAmount: Number(e.target.value) || 0 })}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Referenced account</label>
          <select
            value={prime.referencedAccountType}
            onChange={(e) => update({ referencedAccountType: e.target.value as AccountType })}
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
            value={prime.incomeStartAge || ""}
            onChange={(e) => update({ incomeStartAge: Number(e.target.value) || 0 })}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Payout amount (flat, monthly, no COLA)</label>
          <input
            type="number"
            value={prime.payoutAmount || ""}
            onChange={(e) => update({ payoutAmount: Number(e.target.value) || 0 })}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">Carrier (optional)</label>
          <input
            type="text"
            value={prime.carrier ?? ""}
            onChange={(e) => update({ carrier: e.target.value })}
            placeholder="e.g. Carrier name"
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {!annuityPrime && (
        <p className="mt-3 text-sm text-gray-500">
          Enter values above to enable the PRIME path (annuity conversion). Leave at 0 to compare current path only.
        </p>
      )}
    </section>
  );
}
