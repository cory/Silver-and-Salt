export const APPLICATION_STATUSES = [
  "pending_payment",
  "paid_pending_vetting",
  "approved",
  "refunded",
  "canceled",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

const ALLOWED: Record<ApplicationStatus, ApplicationStatus[]> = {
  pending_payment: ["paid_pending_vetting", "canceled"],
  paid_pending_vetting: ["approved", "refunded", "canceled"],
  approved: ["refunded", "canceled"],
  refunded: [],
  canceled: [],
};

export function canTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
  return ALLOWED[from].includes(to);
}

export function assertTransition(from: ApplicationStatus, to: ApplicationStatus): void {
  if (from === to) return;
  if (!canTransition(from, to)) throw new Error(`Invalid application status transition: ${from} -> ${to}`);
}
