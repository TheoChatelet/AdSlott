import type { Prisma } from "@prisma/client";

export interface PaymentAuthorization {
  provider: string;
  userId: string;
  amountCents: number;
  /** Provider-specific handle (e.g. a Stripe PaymentIntent id). */
  reference?: string;
}

export class InsufficientFundsError extends Error {}

/**
 * Abstracts money movement away from the bidding logic, so a V2 real-money
 * provider (Stripe, manual capture) can replace the virtual wallet without
 * touching the slot/bid code.
 *
 * The two-phase authorize/capture split mirrors how a real payment
 * processor works: `authorize` reserves funds *before* the slot row is
 * locked (it must not move money, since a concurrent higher bid can still
 * beat it), and `capture` finalizes the charge *inside* the caller's
 * locked transaction, once the slot price has been re-validated.
 */
export interface PaymentProvider {
  authorize(userId: string, amountCents: number): Promise<PaymentAuthorization>;

  capture(
    authorization: PaymentAuthorization,
    tx: Prisma.TransactionClient,
    context: { adId: string }
  ): Promise<{ transactionId: string }>;

  /** Releases a reservation that lost the race and will not be captured. */
  cancel(authorization: PaymentAuthorization): Promise<void>;
}
