"use client";

import { useState, Fragment, useMemo } from "react";
import { useCalculator } from "@/context/CalculatorContext";
import { useProjection } from "@/hooks/useProjection";
import type { AmountDisplayMode } from "@/lib/types";
import type { ProjectionRow } from "@/lib/projection-types";

/** Apply tax rates to get post-tax values for display */
function applyTax(
  row: ProjectionRow,
  taxRates: {
    earnedPct: number;
    ssPct: number;
    pensionOtherPct: number;
    accountsPct: number;
  }
): {
  earnedIncome: number;
  socialSecurity: number;
  pensionOther: number;
  combinedDraws: number;
  annualTotal: number;
  monthlyTotal: number;
  guaranteedPct: number;
} {
  const earned = row.earnedIncome * (1 - taxRates.earnedPct / 100);
  const ss = row.socialSecurity * (1 - taxRates.ssPct / 100);
  const pensionOther = (row.pension + row.otherAnnuities + row.rental) * (1 - taxRates.pensionOtherPct / 100);
  const draws =
    row.accountDraws.qualified +
    row.accountDraws.roth +
    row.accountDraws.taxable +
    row.accountDraws.cash +
    row.accountDraws.insurance;
  const drawsPostTax = draws * (1 - taxRates.accountsPct / 100);
  const annualTotal = earned + ss + pensionOther + drawsPostTax;
  const monthlyTotal = annualTotal / 12;
  const guaranteedDollars = ss + pensionOther;
  const guaranteedPct = annualTotal > 0 ? (guaranteedDollars / annualTotal) * 100 : 0;
  return {
    earnedIncome: earned,
    socialSecurity: ss,
    pensionOther,
    combinedDraws: drawsPostTax,
    annualTotal,
    monthlyTotal,
    guaranteedPct,
  };
}

/** Step 5: Current path income summary (no PRIME) */
type ShortageDisplayMode = "dollar" | "percent";

export default function CurrentIncomeSummary() {
  const {
    income,
    setIncome,
    guaranteedIncome,
    accountsTaxRatePct,
    clientTaxRateAssumptionPct,
    accounts,
    client,
    spouse,
    hasSpouse,
  } = useCalculator();
  const { current } = useProjection();
  const [showByAccount, setShowByAccount] = useState(false);
  const [showPostTax, setShowPostTax] = useState(false);
  const [shortageDisplayMode, setShortageDisplayMode] = useState<ShortageDisplayMode>("dollar");

  const isMonthly = income.amountDisplayMode === "monthly";
  const retirementAge = current.retirementAge;

  const taxRates = useMemo(() => {
    const ssClient = guaranteedIncome.socialSecurityClient.taxRatePct ?? 0;
    const ssSpouse = guaranteedIncome.socialSecuritySpouse.taxRatePct ?? 0;
    const ssPct = (ssClient + ssSpouse) / 2;
    const pensionOtherPct =
      guaranteedIncome.pensions[0]?.taxRatePct ??
      guaranteedIncome.annuities[0]?.taxRatePct ??
      guaranteedIncome.rentals[0]?.taxRatePct ??
      0;
    return {
      earnedPct: income.taxRatePct ?? 0,
      ssPct,
      pensionOtherPct,
      accountsPct: accountsTaxRatePct ?? 0,
    };
  }, [
    income.taxRatePct,
    guaranteedIncome.socialSecurityClient.taxRatePct,
    guaranteedIncome.socialSecuritySpouse.taxRatePct,
    guaranteedIncome.pensions,
    guaranteedIncome.annuities,
    guaranteedIncome.rentals,
    accountsTaxRatePct,
  ]);

  const firstRetirementRow = current.rows.find((r) => r.clientAge >= retirementAge);
  const firstYear = current.rows[0];
  const lastYear = current.rows[current.rows.length - 1];
  const fv = current.futureValuesAtRetirement;
  const totalFv = fv.qualified + fv.roth + fv.taxable + fv.cash + fv.insurance;

  const accountsCurrentByType = useMemo(
    () => {
      const totals = {
        qualified: 0,
        roth: 0,
        taxable: 0,
        cash: 0,
        insurance: 0,
      };
      for (const acc of accounts) {
        totals[acc.type] += acc.balance || 0;
      }
      return totals;
    },
    [accounts]
  );

  const accountsCurrentTotal =
    accountsCurrentByType.qualified +
    accountsCurrentByType.roth +
    accountsCurrentByType.taxable +
    accountsCurrentByType.cash +
    accountsCurrentByType.insurance;

  const setDisplayMode = (mode: AmountDisplayMode) => {
    setIncome({ ...income, amountDisplayMode: mode });
  };

  const fmt = (annualValue: number) =>
    isMonthly
      ? Math.round(annualValue / 12).toLocaleString()
      : Math.round(annualValue).toLocaleString();

  const taxMul = (value: number, pct: number) => value * (1 - pct / 100);

  const getRowValues = (row: ProjectionRow) => {
    if (showPostTax) {
      const post = applyTax(row, taxRates);
      return {
        earnedIncome: post.earnedIncome,
        socialSecurity: post.socialSecurity,
        pensionOther: post.pensionOther,
        combinedDraws: post.combinedDraws,
        totalDisplay: isMonthly ? post.monthlyTotal : post.annualTotal,
        guaranteedPct: post.guaranteedPct,
        accountDraws: {
          qualified: row.accountDraws.qualified * (1 - taxRates.accountsPct / 100),
          roth: row.accountDraws.roth * (1 - taxRates.accountsPct / 100),
          taxable: row.accountDraws.taxable * (1 - taxRates.accountsPct / 100),
          cash: row.accountDraws.cash * (1 - taxRates.accountsPct / 100),
          insurance: row.accountDraws.insurance * (1 - taxRates.accountsPct / 100),
        },
      };
    }
    const combinedDraws =
      row.accountDraws.qualified +
      row.accountDraws.roth +
      row.accountDraws.taxable +
      row.accountDraws.cash +
      row.accountDraws.insurance;
    return {
      earnedIncome: row.earnedIncome,
      socialSecurity: row.socialSecurity,
      pensionOther: row.pension + row.otherAnnuities + row.rental,
      combinedDraws,
      totalDisplay: isMonthly ? row.monthlyTotal : row.annualTotal,
      guaranteedPct: row.guaranteedPct,
      accountDraws: row.accountDraws,
    };
  };

  const getRowValuesDetailed = (row: ProjectionRow) => {
    const acctMul = 1 - taxRates.accountsPct / 100;
    const ad = row.accountDraws as ProjectionRow["accountDraws"];
    if (showPostTax) {
      const earnedClient = taxMul(row.earnedIncomeClient, taxRates.earnedPct);
      const earnedSpouse = taxMul(row.earnedIncomeSpouse, taxRates.earnedPct);
      const ssClient = taxMul(row.socialSecurityClient, taxRates.ssPct);
      const ssSpouse = taxMul(row.socialSecuritySpouse, taxRates.ssPct);
      const pensionClient = taxMul(row.pensionOtherRentalClient, taxRates.pensionOtherPct);
      const pensionSpouse = taxMul(row.pensionOtherRentalSpouse, taxRates.pensionOtherPct);
      const draws = {
        qualified: ad.qualified * acctMul,
        roth: ad.roth * acctMul,
        taxable: ad.taxable * acctMul,
        cash: ad.cash * acctMul,
        insurance: ad.insurance * acctMul,
        qualifiedClient: (ad.qualifiedClient ?? 0) * acctMul,
        qualifiedSpouse: (ad.qualifiedSpouse ?? 0) * acctMul,
        rothClient: (ad.rothClient ?? 0) * acctMul,
        rothSpouse: (ad.rothSpouse ?? 0) * acctMul,
        taxableClient: (ad.taxableClient ?? 0) * acctMul,
        taxableSpouse: (ad.taxableSpouse ?? 0) * acctMul,
        cashClient: (ad.cashClient ?? 0) * acctMul,
        cashSpouse: (ad.cashSpouse ?? 0) * acctMul,
        insuranceClient: (ad.insuranceClient ?? 0) * acctMul,
        insuranceSpouse: (ad.insuranceSpouse ?? 0) * acctMul,
      };
      const annualTotal = earnedClient + earnedSpouse + ssClient + ssSpouse + pensionClient + pensionSpouse +
        draws.qualified + draws.roth + draws.taxable + draws.cash + draws.insurance;
      const guaranteedPct = annualTotal > 0
        ? ((ssClient + ssSpouse + pensionClient + pensionSpouse) / annualTotal) * 100
        : 0;
      return {
        earnedClient,
        earnedSpouse,
        ssClient,
        ssSpouse,
        pensionClient,
        pensionSpouse,
        accountDraws: draws,
        totalDisplay: isMonthly ? annualTotal / 12 : annualTotal,
        guaranteedPct,
      };
    }
    return {
      earnedClient: row.earnedIncomeClient,
      earnedSpouse: row.earnedIncomeSpouse,
      ssClient: row.socialSecurityClient,
      ssSpouse: row.socialSecuritySpouse,
      pensionClient: row.pensionOtherRentalClient,
      pensionSpouse: row.pensionOtherRentalSpouse,
      accountDraws: ad,
      totalDisplay: isMonthly ? row.monthlyTotal : row.annualTotal,
      guaranteedPct: row.guaranteedPct,
    };
  };

  if (current.rows.length === 0) {
    return (
      <section className="mb-8 p-6 rounded-xl bg-gray-900/50 border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-4">Current income summary</h2>
        <p className="text-gray-400">Complete steps 1–4 to see your projected income summary.</p>
      </section>
    );
  }

  const clientLabel = client.name || "Client";
  const spouseLabel = spouse.name || "Spouse";

  const detailedColumnVisibility = useMemo(() => {
    const rows = current.rows;
    const some = (fn: (r: ProjectionRow) => number) => rows.some((r) => fn(r) !== 0);
    const ad = (r: ProjectionRow) => r.accountDraws as ProjectionRow["accountDraws"];
    const showAgeClient = true;
    const showAgeSpouse = hasSpouse && some((r) => r.spouseAge);
    const showEarnedClient = some((r) => r.earnedIncomeClient);
    const showEarnedSpouse = some((r) => r.earnedIncomeSpouse);
    const showSSClient = some((r) => r.socialSecurityClient);
    const showSSSpouse = some((r) => r.socialSecuritySpouse);
    const showPensionClient = some((r) => r.pensionOtherRentalClient);
    const showPensionSpouse = some((r) => r.pensionOtherRentalSpouse);
    const showQualifiedClient = some((r) => ad(r).qualifiedClient ?? 0);
    const showQualifiedSpouse = some((r) => ad(r).qualifiedSpouse ?? 0);
    const showRothClient = some((r) => ad(r).rothClient ?? 0);
    const showRothSpouse = some((r) => ad(r).rothSpouse ?? 0);
    const showTaxableClient = some((r) => ad(r).taxableClient ?? 0);
    const showTaxableSpouse = some((r) => ad(r).taxableSpouse ?? 0);
    const showCashClient = some((r) => ad(r).cashClient ?? 0);
    const showCashSpouse = some((r) => ad(r).cashSpouse ?? 0);
    const showInsuranceClient = some((r) => ad(r).insuranceClient ?? 0);
    const showInsuranceSpouse = some((r) => ad(r).insuranceSpouse ?? 0);
    const ageCols = (showAgeClient ? 1 : 0) + (showAgeSpouse ? 1 : 0);
    const earnedCols = (showEarnedClient ? 1 : 0) + (showEarnedSpouse ? 1 : 0);
    const ssCols = (showSSClient ? 1 : 0) + (showSSSpouse ? 1 : 0);
    const pensionCols = (showPensionClient ? 1 : 0) + (showPensionSpouse ? 1 : 0);
    const accountCols =
      (showQualifiedClient ? 1 : 0) + (showQualifiedSpouse ? 1 : 0) +
      (showRothClient ? 1 : 0) + (showRothSpouse ? 1 : 0) +
      (showTaxableClient ? 1 : 0) + (showTaxableSpouse ? 1 : 0) +
      (showCashClient ? 1 : 0) + (showCashSpouse ? 1 : 0) +
      (showInsuranceClient ? 1 : 0) + (showInsuranceSpouse ? 1 : 0);
    const totalCols = ageCols + earnedCols + ssCols + pensionCols + accountCols + 4;
    return {
      showAgeClient,
      showAgeSpouse,
      showEarnedClient,
      showEarnedSpouse,
      showSSClient,
      showSSSpouse,
      showPensionClient,
      showPensionSpouse,
      showQualifiedClient,
      showQualifiedSpouse,
      showRothClient,
      showRothSpouse,
      showTaxableClient,
      showTaxableSpouse,
      showCashClient,
      showCashSpouse,
      showInsuranceClient,
      showInsuranceSpouse,
      totalCols,
    };
  }, [current.rows, hasSpouse]);

  const totalCols = showByAccount ? detailedColumnVisibility.totalCols : 9;

  return (
    <section className="mb-8 p-6 rounded-xl bg-gray-900/50 border border-gray-700">
      <h2 className="text-lg font-semibold text-white mb-2">Current income summary</h2>
      {(client.name || (hasSpouse && spouse.name)) && (
        <p className="text-xs text-gray-400 mb-1">
          {client.name && <span>Client: {client.name}</span>}
          {hasSpouse && spouse.name && (
            <span>{client.name ? " • " : ""}Spouse: {spouse.name}</span>
          )}
        </p>
      )}
      <p className="text-sm text-gray-400 mb-4">
        Projected income from your current path (no annuity conversion).
      </p>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-sm text-gray-400">View:</span>
        <div className="inline-flex rounded-lg bg-gray-800 p-0.5 border border-gray-600">
          <button
            type="button"
            onClick={() => setDisplayMode("annual")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              !isMonthly ? "bg-green-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            Annual
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode("monthly")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isMonthly ? "bg-green-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            Monthly
          </button>
        </div>
        <button
          type="button"
          onClick={() => setShowByAccount(!showByAccount)}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800"
        >
          {showByAccount ? "Show combined view" : "Detailed breakout"}
        </button>
        <button
          type="button"
          onClick={() => setShowPostTax(!showPostTax)}
          className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
            showPostTax
              ? "border-amber-500/60 text-amber-400 bg-amber-500/10"
              : "border-gray-600 text-gray-300 hover:bg-gray-800"
          }`}
        >
          {showPostTax ? "Show pre-tax" : "Show post-tax"}
        </button>
        <span className="text-sm text-gray-500">Target goal is always entered as pre-tax.</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-sm text-gray-400">Shortage / Surplus:</span>
        <div className="inline-flex rounded-lg bg-gray-800 p-0.5 border border-gray-600">
          <button
            type="button"
            onClick={() => setShortageDisplayMode("dollar")}
            className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
              shortageDisplayMode === "dollar" ? "bg-gray-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            $
          </button>
          <button
            type="button"
            onClick={() => setShortageDisplayMode("percent")}
            className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
              shortageDisplayMode === "percent" ? "bg-gray-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            %
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-lg border-l-4" style={{ backgroundColor: "var(--col-earned-bg)", borderLeftColor: "var(--col-earned)" }}>
          <div className="text-sm font-medium" style={{ color: "var(--col-earned)" }}>First-year income</div>
          <div className="text-white font-semibold mt-1">
            {isMonthly
              ? `$${Math.round(showPostTax ? applyTax(firstYear, taxRates).monthlyTotal : firstYear.monthlyTotal).toLocaleString()}/mo`
              : `$${Math.round(showPostTax ? applyTax(firstYear, taxRates).annualTotal : firstYear.annualTotal).toLocaleString()}/yr`}
          </div>
          {showPostTax && <div className="text-xs text-gray-500 mt-0.5">After tax</div>}
        </div>
        <div className="p-4 rounded-lg border-l-4" style={{ backgroundColor: "var(--col-guaranteed-pct-bg)", borderLeftColor: "var(--col-guaranteed-pct)" }}>
          <div className="text-sm font-medium" style={{ color: "var(--col-guaranteed-pct)" }}>Guaranteed % (first year of retirement)</div>
          <div className="text-white font-semibold mt-1">
            {firstRetirementRow != null
              ? `${Math.round(showPostTax ? applyTax(firstRetirementRow, taxRates).guaranteedPct : firstRetirementRow.guaranteedPct)}%`
              : "—"}
          </div>
          {firstRetirementRow != null && (
            <div className="text-xs text-gray-500 mt-0.5">Age {firstRetirementRow.clientAge}</div>
          )}
        </div>
        <div className="p-4 rounded-lg border-l-4" style={{ backgroundColor: "var(--col-accounts-bg)", borderLeftColor: "var(--col-accounts)" }}>
          <div className="text-sm font-medium" style={{ color: "var(--col-accounts)" }}>FV at retirement</div>
          <div className="text-white font-semibold mt-1">${totalFv.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
        </div>
        <div className="p-4 rounded-lg border-l-4" style={{ backgroundColor: "var(--col-age-bg)", borderLeftColor: "var(--col-age)" }}>
          <div className="text-sm font-medium" style={{ color: "var(--col-age)" }}>Plan horizon</div>
          <div className="text-white font-semibold mt-1">Age {firstYear.clientAge} – {lastYear.clientAge}</div>
        </div>
      </div>

      <div className="mt-2 mb-6 p-4 rounded-xl bg-gray-900/60 border border-gray-700">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Accounts snapshot</h3>
          <span className="text-xs text-gray-400">Current vs at retirement</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="text-left border-b border-gray-700">
                <th className="py-2 pr-4 text-gray-400 font-medium"> </th>
                <th
                  className="py-2 pr-4 pl-3 font-medium"
                  style={{ borderLeftColor: "var(--col-accounts)", color: "var(--col-accounts)", backgroundColor: "var(--col-accounts-bg)" }}
                >
                  Qualified
                </th>
                <th
                  className="py-2 pr-4 pl-3 font-medium"
                  style={{ borderLeftColor: "var(--col-accounts)", color: "var(--col-accounts)", backgroundColor: "var(--col-accounts-bg)" }}
                >
                  Taxable
                </th>
                <th
                  className="py-2 pr-4 pl-3 font-medium"
                  style={{ borderLeftColor: "var(--col-accounts)", color: "var(--col-accounts)", backgroundColor: "var(--col-accounts-bg)" }}
                >
                  Roth
                </th>
                <th
                  className="py-2 pr-4 pl-3 font-medium"
                  style={{ borderLeftColor: "var(--col-accounts)", color: "var(--col-accounts)", backgroundColor: "var(--col-accounts-bg)" }}
                >
                  Cash
                </th>
                <th
                  className="py-2 pr-4 pl-3 font-medium"
                  style={{ borderLeftColor: "var(--col-accounts)", color: "var(--col-accounts)", backgroundColor: "var(--col-accounts-bg)" }}
                >
                  Insurance
                </th>
                <th className="py-2 pr-4 text-gray-400 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-800">
                <td className="py-2 pr-4 text-gray-300">Current</td>
                <td className="py-2 pr-4 pl-3 text-gray-100">
                  ${accountsCurrentByType.qualified.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
                <td className="py-2 pr-4 pl-3 text-gray-100">
                  ${accountsCurrentByType.taxable.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
                <td className="py-2 pr-4 pl-3 text-gray-100">
                  ${accountsCurrentByType.roth.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
                <td className="py-2 pr-4 pl-3 text-gray-100">
                  ${accountsCurrentByType.cash.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
                <td className="py-2 pr-4 pl-3 text-gray-100">
                  ${accountsCurrentByType.insurance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
                <td className="py-2 pr-4 text-gray-100 text-right">
                  ${accountsCurrentTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-300">At retirement</td>
                <td className="py-2 pr-4 pl-3 text-gray-100">
                  ${fv.qualified.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
                <td className="py-2 pr-4 pl-3 text-gray-100">
                  ${fv.taxable.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
                <td className="py-2 pr-4 pl-3 text-gray-100">
                  ${fv.roth.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
                <td className="py-2 pr-4 pl-3 text-gray-100">
                  ${fv.cash.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
                <td className="py-2 pr-4 pl-3 text-gray-100">
                  ${fv.insurance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
                <td className="py-2 pr-4 text-gray-100 text-right">
                  ${totalFv.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            {showByAccount ? (
              <>
                <tr className="text-left border-b border-gray-600">
                  {detailedColumnVisibility.showAgeClient && (
                    <th className="py-2 pr-4 border-l-2 pl-3 font-medium" style={{ borderLeftColor: "var(--col-age)", color: "var(--col-age)", backgroundColor: "var(--col-age-bg)" }}>Age</th>
                  )}
                  {detailedColumnVisibility.showAgeSpouse && (
                    <th className="py-2 pr-4 border-l-2 pl-3 font-medium" style={{ borderLeftColor: "var(--col-age)", color: "var(--col-age)", backgroundColor: "var(--col-age-bg)" }}>Age</th>
                  )}
                  {(detailedColumnVisibility.showEarnedClient || detailedColumnVisibility.showEarnedSpouse) && (
                    <>
                      {detailedColumnVisibility.showEarnedClient && (
                        <th className="py-2 pr-4 border-l-2 pl-3 font-medium" style={{ borderLeftColor: "var(--col-earned)", color: "var(--col-earned)", backgroundColor: "var(--col-earned-bg)" }}>Earned income</th>
                      )}
                      {detailedColumnVisibility.showEarnedSpouse && (
                        <th className="py-2 pr-4 border-l-2 pl-3 font-medium" style={{ borderLeftColor: "var(--col-earned)", color: "var(--col-earned)", backgroundColor: "var(--col-earned-bg)" }}>Earned income</th>
                      )}
                    </>
                  )}
                  {(detailedColumnVisibility.showSSClient || detailedColumnVisibility.showSSSpouse) && (
                    <>
                      {detailedColumnVisibility.showSSClient && (
                        <th className="py-2 pr-4 border-l-2 pl-3 font-medium" style={{ borderLeftColor: "var(--col-guaranteed)", color: "var(--col-guaranteed)", backgroundColor: "var(--col-guaranteed-bg)" }}>SS</th>
                      )}
                      {detailedColumnVisibility.showSSSpouse && (
                        <th className="py-2 pr-4 border-l-2 pl-3 font-medium" style={{ borderLeftColor: "var(--col-guaranteed)", color: "var(--col-guaranteed)", backgroundColor: "var(--col-guaranteed-bg)" }}>SS</th>
                      )}
                    </>
                  )}
                  {(detailedColumnVisibility.showPensionClient || detailedColumnVisibility.showPensionSpouse) && (
                    <>
                      {detailedColumnVisibility.showPensionClient && (
                        <th className="py-2 pr-4 border-l-2 pl-3 font-medium" style={{ borderLeftColor: "var(--col-guaranteed)", color: "var(--col-guaranteed)", backgroundColor: "var(--col-guaranteed-bg)" }}>Pension / other</th>
                      )}
                      {detailedColumnVisibility.showPensionSpouse && (
                        <th className="py-2 pr-4 border-l-2 pl-3 font-medium" style={{ borderLeftColor: "var(--col-guaranteed)", color: "var(--col-guaranteed)", backgroundColor: "var(--col-guaranteed-bg)" }}>Pension / other</th>
                      )}
                    </>
                  )}
                  {detailedColumnVisibility.showQualifiedClient && (
                    <th className="py-2 pr-4 border-l-2 pl-3 font-medium" style={{ borderLeftColor: "var(--col-accounts)", color: "var(--col-accounts)", backgroundColor: "var(--col-accounts-bg)" }}>Qualified</th>
                  )}
                  {detailedColumnVisibility.showQualifiedSpouse && (
                    <th className="py-2 pr-4 border-l-2 pl-3 font-medium" style={{ borderLeftColor: "var(--col-accounts)", color: "var(--col-accounts)", backgroundColor: "var(--col-accounts-bg)" }}>Qualified</th>
                  )}
                  {detailedColumnVisibility.showRothClient && (
                    <th className="py-2 pr-4 border-l-2 pl-3 font-medium" style={{ borderLeftColor: "var(--col-accounts)", color: "var(--col-accounts)", backgroundColor: "var(--col-accounts-bg)" }}>Roth</th>
                  )}
                  {detailedColumnVisibility.showRothSpouse && (
                    <th className="py-2 pr-4 border-l-2 pl-3 font-medium" style={{ borderLeftColor: "var(--col-accounts)", color: "var(--col-accounts)", backgroundColor: "var(--col-accounts-bg)" }}>Roth</th>
                  )}
                  {detailedColumnVisibility.showTaxableClient && (
                    <th className="py-2 pr-4 border-l-2 pl-3 font-medium" style={{ borderLeftColor: "var(--col-accounts)", color: "var(--col-accounts)", backgroundColor: "var(--col-accounts-bg)" }}>Taxable</th>
                  )}
                  {detailedColumnVisibility.showTaxableSpouse && (
                    <th className="py-2 pr-4 border-l-2 pl-3 font-medium" style={{ borderLeftColor: "var(--col-accounts)", color: "var(--col-accounts)", backgroundColor: "var(--col-accounts-bg)" }}>Taxable</th>
                  )}
                  {detailedColumnVisibility.showCashClient && (
                    <th className="py-2 pr-4 border-l-2 pl-3 font-medium" style={{ borderLeftColor: "var(--col-accounts)", color: "var(--col-accounts)", backgroundColor: "var(--col-accounts-bg)" }}>Cash</th>
                  )}
                  {detailedColumnVisibility.showCashSpouse && (
                    <th className="py-2 pr-4 border-l-2 pl-3 font-medium" style={{ borderLeftColor: "var(--col-accounts)", color: "var(--col-accounts)", backgroundColor: "var(--col-accounts-bg)" }}>Cash</th>
                  )}
                  {detailedColumnVisibility.showInsuranceClient && (
                    <th className="py-2 pr-4 border-l-2 pl-3 font-medium" style={{ borderLeftColor: "var(--col-accounts)", color: "var(--col-accounts)", backgroundColor: "var(--col-accounts-bg)" }}>Insurance</th>
                  )}
                  {detailedColumnVisibility.showInsuranceSpouse && (
                    <th className="py-2 pr-4 border-l-2 pl-3 font-medium" style={{ borderLeftColor: "var(--col-accounts)", color: "var(--col-accounts)", backgroundColor: "var(--col-accounts-bg)" }}>Insurance</th>
                  )}
                  <th className="py-2 pr-4 border-l-2 pl-3 font-medium" style={{ borderLeftColor: "var(--col-total)", color: "var(--col-total)", backgroundColor: "var(--col-total-bg)" }}>Total</th>
                  <th className="py-2 pr-4 border-l-2 pl-3 font-medium" style={{ borderLeftColor: "var(--col-target)", color: "var(--col-target)", backgroundColor: "var(--col-target-bg)" }}>Target goal</th>
                  <th className="py-2 pr-4 border-l-2 pl-3 font-medium" style={{ borderLeftColor: "var(--col-guaranteed-pct)", color: "var(--col-guaranteed-pct)", backgroundColor: "var(--col-guaranteed-pct-bg)" }}>Guaranteed %</th>
                  <th className="py-2 pr-4 border-l-2 pl-3 font-medium" style={{ borderLeftColor: "var(--col-shortage)", color: "var(--col-shortage)", backgroundColor: "var(--col-shortage-bg)" }}>Shortage / Surplus</th>
                </tr>
                <tr className="text-left border-b border-gray-600 text-xs text-gray-400">
                  {detailedColumnVisibility.showAgeClient && (
                    <th className="py-1 pr-4 pl-3 font-normal" style={{ backgroundColor: "var(--col-age-bg)" }}>{clientLabel}</th>
                  )}
                  {detailedColumnVisibility.showAgeSpouse && (
                    <th className="py-1 pr-4 pl-3 font-normal" style={{ backgroundColor: "var(--col-age-bg)" }}>{spouseLabel}</th>
                  )}
                  {detailedColumnVisibility.showEarnedClient && (
                    <th className="py-1 pr-4 pl-3 font-normal" style={{ backgroundColor: "var(--col-earned-bg)" }}>{clientLabel}</th>
                  )}
                  {detailedColumnVisibility.showEarnedSpouse && (
                    <th className="py-1 pr-4 pl-3 font-normal" style={{ backgroundColor: "var(--col-earned-bg)" }}>{spouseLabel}</th>
                  )}
                  {detailedColumnVisibility.showSSClient && (
                    <th className="py-1 pr-4 pl-3 font-normal" style={{ backgroundColor: "var(--col-guaranteed-bg)" }}>{clientLabel}</th>
                  )}
                  {detailedColumnVisibility.showSSSpouse && (
                    <th className="py-1 pr-4 pl-3 font-normal" style={{ backgroundColor: "var(--col-guaranteed-bg)" }}>{spouseLabel}</th>
                  )}
                  {detailedColumnVisibility.showPensionClient && (
                    <th className="py-1 pr-4 pl-3 font-normal" style={{ backgroundColor: "var(--col-guaranteed-bg)" }}>{clientLabel}</th>
                  )}
                  {detailedColumnVisibility.showPensionSpouse && (
                    <th className="py-1 pr-4 pl-3 font-normal" style={{ backgroundColor: "var(--col-guaranteed-bg)" }}>{spouseLabel}</th>
                  )}
                  {detailedColumnVisibility.showQualifiedClient && (
                    <th className="py-1 pr-4 pl-3 font-normal" style={{ backgroundColor: "var(--col-accounts-bg)" }}>{clientLabel}</th>
                  )}
                  {detailedColumnVisibility.showQualifiedSpouse && (
                    <th className="py-1 pr-4 pl-3 font-normal" style={{ backgroundColor: "var(--col-accounts-bg)" }}>{spouseLabel}</th>
                  )}
                  {detailedColumnVisibility.showRothClient && (
                    <th className="py-1 pr-4 pl-3 font-normal" style={{ backgroundColor: "var(--col-accounts-bg)" }}>{clientLabel}</th>
                  )}
                  {detailedColumnVisibility.showRothSpouse && (
                    <th className="py-1 pr-4 pl-3 font-normal" style={{ backgroundColor: "var(--col-accounts-bg)" }}>{spouseLabel}</th>
                  )}
                  {detailedColumnVisibility.showTaxableClient && (
                    <th className="py-1 pr-4 pl-3 font-normal" style={{ backgroundColor: "var(--col-accounts-bg)" }}>{clientLabel}</th>
                  )}
                  {detailedColumnVisibility.showTaxableSpouse && (
                    <th className="py-1 pr-4 pl-3 font-normal" style={{ backgroundColor: "var(--col-accounts-bg)" }}>{spouseLabel}</th>
                  )}
                  {detailedColumnVisibility.showCashClient && (
                    <th className="py-1 pr-4 pl-3 font-normal" style={{ backgroundColor: "var(--col-accounts-bg)" }}>{clientLabel}</th>
                  )}
                  {detailedColumnVisibility.showCashSpouse && (
                    <th className="py-1 pr-4 pl-3 font-normal" style={{ backgroundColor: "var(--col-accounts-bg)" }}>{spouseLabel}</th>
                  )}
                  {detailedColumnVisibility.showInsuranceClient && (
                    <th className="py-1 pr-4 pl-3 font-normal" style={{ backgroundColor: "var(--col-accounts-bg)" }}>{clientLabel}</th>
                  )}
                  {detailedColumnVisibility.showInsuranceSpouse && (
                    <th className="py-1 pr-4 pl-3 font-normal" style={{ backgroundColor: "var(--col-accounts-bg)" }}>{spouseLabel}</th>
                  )}
                  <th className="py-1 pr-4 pl-3 font-normal" style={{ backgroundColor: "var(--col-total-bg)" }} />
                  <th className="py-1 pr-4 pl-3 font-normal" style={{ backgroundColor: "var(--col-target-bg)" }} />
                  <th className="py-1 pr-4 pl-3 font-normal" style={{ backgroundColor: "var(--col-guaranteed-pct-bg)" }} />
                  <th className="py-1 pr-4 pl-3 font-normal" style={{ backgroundColor: "var(--col-shortage-bg)" }} />
                </tr>
              </>
            ) : (
              <tr className="text-left border-b border-gray-600">
                <th className="py-2 pr-4 border-l-2 pl-3 font-medium" style={{ borderLeftColor: "var(--col-age)", color: "var(--col-age)", backgroundColor: "var(--col-age-bg)" }}>
                  <div>Age</div>
                  {client.name && (
                    <div className="text-xs text-gray-400 mt-0.5">{client.name}</div>
                  )}
                </th>
                <th className="py-2 pr-4 border-l-2 pl-3 font-medium" style={{ borderLeftColor: "var(--col-earned)", color: "var(--col-earned)", backgroundColor: "var(--col-earned-bg)" }}>Earned income</th>
                <th className="py-2 pr-4 border-l-2 pl-3 font-medium" style={{ borderLeftColor: "var(--col-guaranteed)", color: "var(--col-guaranteed)", backgroundColor: "var(--col-guaranteed-bg)" }}>SS</th>
                <th className="py-2 pr-4 border-l-2 pl-3 font-medium" style={{ borderLeftColor: "var(--col-guaranteed)", color: "var(--col-guaranteed)", backgroundColor: "var(--col-guaranteed-bg)" }}>Pension / other</th>
                <th className="py-2 pr-4 border-l-2 pl-3 font-medium" style={{ borderLeftColor: "var(--col-accounts)", color: "var(--col-accounts)", backgroundColor: "var(--col-accounts-bg)" }}>Combined accounts</th>
                <th className="py-2 pr-4 border-l-2 pl-3 font-medium" style={{ borderLeftColor: "var(--col-total)", color: "var(--col-total)", backgroundColor: "var(--col-total-bg)" }}>Total</th>
                <th className="py-2 pr-4 border-l-2 pl-3 font-medium" style={{ borderLeftColor: "var(--col-target)", color: "var(--col-target)", backgroundColor: "var(--col-target-bg)" }}>Target goal</th>
                <th className="py-2 pr-4 border-l-2 pl-3 font-medium" style={{ borderLeftColor: "var(--col-guaranteed-pct)", color: "var(--col-guaranteed-pct)", backgroundColor: "var(--col-guaranteed-pct-bg)" }}>Guaranteed %</th>
                <th className="py-2 pr-4 border-l-2 pl-3 font-medium" style={{ borderLeftColor: "var(--col-shortage)", color: "var(--col-shortage)", backgroundColor: "var(--col-shortage-bg)" }}>Shortage / Surplus</th>
              </tr>
            )}
          </thead>
          <tbody>
            {current.rows.map((row) => {
              const isFirstRetirementYear = row.clientAge === retirementAge;
              const v = getRowValues(row);
              const targetPreTax = row.targetGoalAnnual;
              const targetGoalDisplayRaw = showPostTax
                ? targetPreTax * (1 - (clientTaxRateAssumptionPct ?? 0) / 100)
                : targetPreTax;
              const targetGoalDisplay = isMonthly ? targetGoalDisplayRaw / 12 : targetGoalDisplayRaw;
              const surplusAmount = v.totalDisplay - targetGoalDisplay;
              const shortageLabel =
                shortageDisplayMode === "percent"
                  ? targetGoalDisplay > 0
                    ? `${Math.round((surplusAmount / targetGoalDisplay) * 100)}%`
                    : "—"
                  : Math.round(surplusAmount).toLocaleString();
              const isSurplus = surplusAmount > 0;
              const isShortage = surplusAmount < 0;
              const d = showByAccount ? getRowValuesDetailed(row) : null;
              return (
                <Fragment key={row.yearIndex}>
                  {isFirstRetirementYear && (
                    <tr className="bg-red-500/10">
                      <td
                        colSpan={totalCols}
                        className="py-2 pr-4 border-t-2 border-red-500 border-b border-red-500/50"
                      >
                        <span className="text-red-400 font-medium">First year of retirement (age {row.clientAge})</span>
                      </td>
                    </tr>
                  )}
                  <tr className="border-b border-gray-700">
                    {showByAccount && d ? (
                      <>
                        {detailedColumnVisibility.showAgeClient && (
                          <td className="py-2 pr-4 pl-3 text-white" style={{ backgroundColor: "var(--col-age-bg)" }}>{row.clientAge}</td>
                        )}
                        {detailedColumnVisibility.showAgeSpouse && (
                          <td className="py-2 pr-4 pl-3 text-white" style={{ backgroundColor: "var(--col-age-bg)" }}>{row.spouseAge}</td>
                        )}
                        {detailedColumnVisibility.showEarnedClient && (
                          <td className="py-2 pr-4 pl-3 text-gray-300" style={{ backgroundColor: "var(--col-earned-bg)" }}>{fmt(d.earnedClient)}</td>
                        )}
                        {detailedColumnVisibility.showEarnedSpouse && (
                          <td className="py-2 pr-4 pl-3 text-gray-300" style={{ backgroundColor: "var(--col-earned-bg)" }}>{fmt(d.earnedSpouse)}</td>
                        )}
                        {detailedColumnVisibility.showSSClient && (
                          <td className="py-2 pr-4 pl-3 text-gray-300" style={{ backgroundColor: "var(--col-guaranteed-bg)" }}>{fmt(d.ssClient)}</td>
                        )}
                        {detailedColumnVisibility.showSSSpouse && (
                          <td className="py-2 pr-4 pl-3 text-gray-300" style={{ backgroundColor: "var(--col-guaranteed-bg)" }}>{fmt(d.ssSpouse)}</td>
                        )}
                        {detailedColumnVisibility.showPensionClient && (
                          <td className="py-2 pr-4 pl-3 text-gray-300" style={{ backgroundColor: "var(--col-guaranteed-bg)" }}>{fmt(d.pensionClient)}</td>
                        )}
                        {detailedColumnVisibility.showPensionSpouse && (
                          <td className="py-2 pr-4 pl-3 text-gray-300" style={{ backgroundColor: "var(--col-guaranteed-bg)" }}>{fmt(d.pensionSpouse)}</td>
                        )}
                        {detailedColumnVisibility.showQualifiedClient && (
                          <td className="py-2 pr-4 pl-3 text-gray-300" style={{ backgroundColor: "var(--col-accounts-bg)" }}>{fmt((d.accountDraws as { qualifiedClient?: number }).qualifiedClient ?? 0)}</td>
                        )}
                        {detailedColumnVisibility.showQualifiedSpouse && (
                          <td className="py-2 pr-4 pl-3 text-gray-300" style={{ backgroundColor: "var(--col-accounts-bg)" }}>{fmt((d.accountDraws as { qualifiedSpouse?: number }).qualifiedSpouse ?? 0)}</td>
                        )}
                        {detailedColumnVisibility.showRothClient && (
                          <td className="py-2 pr-4 pl-3 text-gray-300" style={{ backgroundColor: "var(--col-accounts-bg)" }}>{fmt((d.accountDraws as { rothClient?: number }).rothClient ?? 0)}</td>
                        )}
                        {detailedColumnVisibility.showRothSpouse && (
                          <td className="py-2 pr-4 pl-3 text-gray-300" style={{ backgroundColor: "var(--col-accounts-bg)" }}>{fmt((d.accountDraws as { rothSpouse?: number }).rothSpouse ?? 0)}</td>
                        )}
                        {detailedColumnVisibility.showTaxableClient && (
                          <td className="py-2 pr-4 pl-3 text-gray-300" style={{ backgroundColor: "var(--col-accounts-bg)" }}>{fmt((d.accountDraws as { taxableClient?: number }).taxableClient ?? 0)}</td>
                        )}
                        {detailedColumnVisibility.showTaxableSpouse && (
                          <td className="py-2 pr-4 pl-3 text-gray-300" style={{ backgroundColor: "var(--col-accounts-bg)" }}>{fmt((d.accountDraws as { taxableSpouse?: number }).taxableSpouse ?? 0)}</td>
                        )}
                        {detailedColumnVisibility.showCashClient && (
                          <td className="py-2 pr-4 pl-3 text-gray-300" style={{ backgroundColor: "var(--col-accounts-bg)" }}>{fmt((d.accountDraws as { cashClient?: number }).cashClient ?? 0)}</td>
                        )}
                        {detailedColumnVisibility.showCashSpouse && (
                          <td className="py-2 pr-4 pl-3 text-gray-300" style={{ backgroundColor: "var(--col-accounts-bg)" }}>{fmt((d.accountDraws as { cashSpouse?: number }).cashSpouse ?? 0)}</td>
                        )}
                        {detailedColumnVisibility.showInsuranceClient && (
                          <td className="py-2 pr-4 pl-3 text-gray-300" style={{ backgroundColor: "var(--col-accounts-bg)" }}>{fmt((d.accountDraws as { insuranceClient?: number }).insuranceClient ?? 0)}</td>
                        )}
                        {detailedColumnVisibility.showInsuranceSpouse && (
                          <td className="py-2 pr-4 pl-3 text-gray-300" style={{ backgroundColor: "var(--col-accounts-bg)" }}>{fmt((d.accountDraws as { insuranceSpouse?: number }).insuranceSpouse ?? 0)}</td>
                        )}
                        <td className="py-2 pr-4 pl-3 text-white font-medium" style={{ backgroundColor: "var(--col-total-bg)" }}>{Math.round(d.totalDisplay).toLocaleString()}</td>
                        <td className="py-2 pr-4 pl-3 text-gray-300" style={{ backgroundColor: "var(--col-target-bg)" }}>{Math.round(targetGoalDisplay).toLocaleString()}</td>
                        <td className="py-2 pr-4 pl-3 text-gray-300" style={{ backgroundColor: "var(--col-guaranteed-pct-bg)" }}>{Math.round(d.guaranteedPct)}%</td>
                        <td
                          className={`py-2 pr-4 pl-3 font-medium ${isShortage ? "text-red-400" : isSurplus ? "text-green-400" : "text-gray-400"}`}
                          style={{ backgroundColor: "var(--col-shortage-bg)" }}
                        >
                          {shortageLabel}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2 pr-4 pl-3 text-white" style={{ backgroundColor: "var(--col-age-bg)" }}>{row.clientAge}</td>
                        <td className="py-2 pr-4 pl-3 text-gray-300" style={{ backgroundColor: "var(--col-earned-bg)" }}>{fmt(v.earnedIncome)}</td>
                        <td className="py-2 pr-4 pl-3 text-gray-300" style={{ backgroundColor: "var(--col-guaranteed-bg)" }}>{fmt(v.socialSecurity)}</td>
                        <td className="py-2 pr-4 pl-3 text-gray-300" style={{ backgroundColor: "var(--col-guaranteed-bg)" }}>{fmt(v.pensionOther)}</td>
                        <td className="py-2 pr-4 pl-3 text-gray-300" style={{ backgroundColor: "var(--col-accounts-bg)" }}>{fmt(v.combinedDraws)}</td>
                        <td className="py-2 pr-4 pl-3 text-white font-medium" style={{ backgroundColor: "var(--col-total-bg)" }}>{Math.round(v.totalDisplay).toLocaleString()}</td>
                        <td className="py-2 pr-4 pl-3 text-gray-300" style={{ backgroundColor: "var(--col-target-bg)" }}>{Math.round(targetGoalDisplay).toLocaleString()}</td>
                        <td className="py-2 pr-4 pl-3 text-gray-300" style={{ backgroundColor: "var(--col-guaranteed-pct-bg)" }}>{Math.round(v.guaranteedPct)}%</td>
                        <td
                          className={`py-2 pr-4 pl-3 font-medium ${isShortage ? "text-red-400" : isSurplus ? "text-green-400" : "text-gray-400"}`}
                          style={{ backgroundColor: "var(--col-shortage-bg)" }}
                        >
                          {shortageLabel}
                        </td>
                      </>
                    )}
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
