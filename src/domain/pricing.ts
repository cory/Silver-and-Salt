export interface PriceBreakdown {
  standardAmountCents: number;
  foundingDiscountCents: number;
  dueTodayCents: number;
  currency: "usd";
  cadence: "year";
}

export function foundingMemberPrice(): PriceBreakdown {
  return {
    standardAmountCents: 100_000,
    foundingDiscountCents: 10_000,
    dueTodayCents: 90_000,
    currency: "usd",
    cadence: "year",
  };
}

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
