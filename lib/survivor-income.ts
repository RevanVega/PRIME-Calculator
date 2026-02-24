import type { CalculatorState } from "./types";

const COLA = (value: number, colaPct: number, years: number) =>
  value * Math.pow(1 + colaPct / 100, years);

/**
 * Survivor pension/annuity/rental income after client death.
 * Uses each pension/annuity's survivor % (e.g. 50% or 100%); spouse-owned continue at 100%.
 * Rentals have no survivor field in data, so we treat as 100% (no reduction).
 * Also respects endAge if specified.
 *
 * @param clientAge - Client's age for this projection year
 * @param spouseAge - Spouse's age for this projection year (used for spouse-owned income)
 * @param deathAge - Age at which client dies (survivor benefits apply after this)
 */
export function getSurvivorPensionAnnuityRental(
  state: Pick<CalculatorState, "guaranteedIncome" | "income">,
  clientAge: number,
  deathAge: number,
  spouseAge?: number
): number {
  const { guaranteedIncome, income } = state;
  const colaPct = income.colaPct ?? 0;
  let total = 0;

  const afterDeath = clientAge >= deathAge;
  // If spouseAge not provided, estimate from clientAge (fallback for backward compat)
  const effectiveSpouseAge = spouseAge ?? clientAge;

  for (const p of guaranteedIncome.pensions) {
    // Use owner's age for start/end age comparison
    const ownerAge = p.owner === "spouse" ? effectiveSpouseAge : clientAge;
    const pastStart = ownerAge >= p.startAge;
    const beforeEnd = p.endAge == null || ownerAge <= p.endAge;
    if (!pastStart || !beforeEnd) continue;

    const amt = COLA(p.amount * 12, p.colaPct, ownerAge - p.startAge);
    if (p.owner === "spouse") {
      total += amt;
    } else if (afterDeath) {
      total += amt * ((p.survivorPct ?? 100) / 100);
    } else {
      total += amt;
    }
  }

  for (const a of guaranteedIncome.annuities) {
    // Use owner's age for start/end age comparison
    const ownerAge = a.owner === "spouse" ? effectiveSpouseAge : clientAge;
    const pastStart = ownerAge >= a.startAge;
    const beforeEnd = a.endAge == null || ownerAge <= a.endAge;
    if (!pastStart || !beforeEnd) continue;

    const amt = COLA(a.amount * 12, a.colaPct, ownerAge - a.startAge);
    if (a.owner === "spouse") {
      total += amt;
    } else if (afterDeath) {
      total += amt * ((a.survivorPct ?? 100) / 100);
    } else {
      total += amt;
    }
  }

  for (const r of guaranteedIncome.rentals) {
    // Use owner's age for start/end age comparison
    const ownerAge = r.owner === "spouse" ? effectiveSpouseAge : clientAge;
    const pastStart = ownerAge >= r.startAge;
    const beforeEnd = r.endAge == null || ownerAge <= r.endAge;
    if (!pastStart || !beforeEnd) continue;

    const amt = COLA(r.amount * 12, r.colaPct, ownerAge - r.startAge);
    total += amt;
  }

  return total;
}
