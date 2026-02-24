import type { AnnuityPrimeInputs } from "./types";

/**
 * Effective annual payout for an ALIGN option.
 * FIA: fixed payout amount (no COLA).
 * MYGA: premium (principal) × rate % each year; principal stays intact at renewal.
 */
export function getPrimeOptionAnnualPayout(opt: AnnuityPrimeInputs): number {
  if (opt.productType === "MYGA" && opt.migaRatePct != null && opt.migaRatePct > 0) {
    return opt.premiumAmount * (opt.migaRatePct / 100);
  }
  return opt.payoutAmount ?? 0;
}

/** Option is valid for projections when it has premium and a positive effective payout. */
export function isPrimeOptionValid(opt: AnnuityPrimeInputs): boolean {
  if (opt.premiumAmount <= 0) return false;
  return getPrimeOptionAnnualPayout(opt) > 0;
}
