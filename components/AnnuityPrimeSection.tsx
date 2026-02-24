"use client";

import { useCalculator } from "@/context/CalculatorContext";
import type { AccountType, PrimeBenefitOption, PrimeOwnerOption, PrimeProductType, MigaTermYears } from "@/lib/types";
import { getPrimeOptionAnnualPayout } from "@/lib/prime-utils";

const ACCOUNT_OPTIONS: { value: AccountType; label: string }[] = [
  { value: "qualified", label: "Qualified" },
  { value: "roth", label: "Roth" },
  { value: "taxable", label: "Taxable" },
  { value: "cash", label: "Cash" },
  { value: "insurance", label: "Cash value insurance" },
];

const PRODUCT_OPTIONS: { value: PrimeProductType; label: string }[] = [
  { value: "FIA", label: "FIA (Fixed Index Annuity)" },
  { value: "MYGA", label: "MYGA" },
];

const BENEFIT_OPTIONS: { value: PrimeBenefitOption; label: string }[] = [
  { value: "singleLife", label: "Single life" },
  { value: "joint", label: "Joint" },
];

const MIGA_TERM_OPTIONS: { value: MigaTermYears; label: string }[] = [
  { value: 3, label: "3 years" },
  { value: 5, label: "5 years" },
  { value: 7, label: "7 years" },
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
      <h2 className="text-lg font-semibold text-white mb-1">ALIGN</h2>
      <p className="text-sm text-gray-400 mb-4">
        Allocate premium from an account into an annuity. FIA = fixed annual payout (no COLA) with single-life or joint benefit. MYGA = fixed % of principal for a term (e.g. 3, 5, 7 years); at renewal the rate updates and principal stays intact. Add multiple options for different start ages.
      </p>

      {annuityPrimeOptions.length === 0 ? (
        <p className="text-sm text-gray-500 mb-4">
          Add an ALIGN option below to compare the ALIGN path vs current path. Leave at 0 to compare current path only.
        </p>
      ) : (
        <div className="space-y-6 mb-6">
          {annuityPrimeOptions.map((opt, index) => (
            <div
              key={opt.id}
              className="p-4 rounded-lg bg-gray-800/50 border border-gray-600"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-300">ALIGN option {index + 1}</h3>
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
                    type="text"
                    value={opt.premiumAmount ? opt.premiumAmount.toLocaleString() : ""}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/,/g, "").trim();
                      const n = cleaned === "" ? 0 : (Number(cleaned) || 0);
                      updateAnnuityPrimeOption(opt.id, { premiumAmount: n });
                    }}
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
                  <label className="block text-sm font-medium text-gray-300 mb-1">Product type</label>
                  <select
                    value={opt.productType ?? "FIA"}
                    onChange={(e) => updateAnnuityPrimeOption(opt.id, { productType: e.target.value as PrimeProductType })}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
                  >
                    {PRODUCT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                {(opt.productType ?? "FIA") === "FIA" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Annual payout amount (no COLA)</label>
                      <input
                        type="text"
                        value={opt.payoutAmount ? opt.payoutAmount.toLocaleString() : ""}
                        onChange={(e) => {
                          const cleaned = e.target.value.replace(/,/g, "").trim();
                          const n = cleaned === "" ? 0 : (Number(cleaned) || 0);
                          updateAnnuityPrimeOption(opt.id, { payoutAmount: n });
                        }}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Benefit option</label>
                      <select
                        value={opt.benefitOption === "visit" ? "singleLife" : opt.benefitOption}
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
                  </>
                )}
                {(opt.productType ?? "FIA") === "MYGA" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">MYGA rate (%)</label>
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={opt.migaRatePct ?? ""}
                        onChange={(e) => updateAnnuityPrimeOption(opt.id, { migaRatePct: Number(e.target.value) || undefined })}
                        placeholder="e.g. 5"
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-0.5">Guaranteed % of principal each year; principal intact at renewal.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Term (years)</label>
                      <select
                        value={opt.migaTermYears ?? 5}
                        onChange={(e) => updateAnnuityPrimeOption(opt.id, { migaTermYears: Number(e.target.value) as MigaTermYears })}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
                      >
                        {MIGA_TERM_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-0.5">Rate locked for this period; then renews.</p>
                    </div>
                    <div className="md:col-span-2 text-xs text-gray-400">
                      Effective annual payout: ${(getPrimeOptionAnnualPayout(opt) || 0).toLocaleString()}/yr (principal × rate).
                    </div>
                  </>
                )}
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
        {annuityPrimeOptions.length === 0 ? "Add ALIGN option" : "Add another ALIGN option"}
      </button>

      {annuityPrimeOptions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-600 space-y-2">
          <p className="text-xs text-gray-500 leading-relaxed">
            <strong className="text-gray-400">Disclaimer:</strong> ALIGN projections are for illustrative purposes only. Annuities are insurance products; guarantees are subject to the claims-paying ability of the issuing carrier. This is not financial, tax, or legal advice. Consult a qualified professional before making decisions.
          </p>
          {annuityPrimeOptions.some((o) => (o.productType ?? "FIA") === "MYGA") && (
            <p className="text-xs text-gray-500 leading-relaxed">
              * <strong className="text-gray-400">MYGA:</strong> The rate shown is guaranteed for the selected term (e.g. 3, 5, or 7 years). At the end of that term the MYGA rate will renew; the new rate at renewal is undetermined.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
