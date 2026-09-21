import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  InsufficientFundsError,
  type PaymentAuthorization,
  type PaymentProvider,
} from "@/lib/payment/PaymentProvider";

/** V1 payment provider: debits an in-app virtual currency wallet. */
export class VirtualWalletProvider implements PaymentProvider {
  async authorize(userId: string, amountCents: number): Promise<PaymentAuthorization> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("Unknown user");
    if (user.walletBalanceCents < amountCents) {
      throw new InsufficientFundsError("Solde insuffisant");
    }
    return { provider: "virtual-wallet", userId, amountCents };
  }

  async capture(
    authorization: PaymentAuthorization,
    tx: Prisma.TransactionClient,
    context: { adId: string }
  ): Promise<{ transactionId: string }> {
    // Re-check under a row lock: the balance may have changed since
    // authorize() (e.g. the same user bidding on two slots at once).
    const rows = await tx.$queryRaw<{ id: string; walletBalanceCents: number }[]>`
      SELECT "id", "walletBalanceCents" FROM "User" WHERE "id" = ${authorization.userId} FOR UPDATE
    `;
    const user = rows[0];
    if (!user) throw new Error("Unknown user");
    if (user.walletBalanceCents < authorization.amountCents) {
      throw new InsufficientFundsError("Solde insuffisant");
    }

    await tx.user.update({
      where: { id: authorization.userId },
      data: { walletBalanceCents: { decrement: authorization.amountCents } },
    });

    const transaction = await tx.walletTransaction.create({
      data: {
        userId: authorization.userId,
        amountCents: -authorization.amountCents,
        adId: context.adId,
      },
    });

    return { transactionId: transaction.id };
  }

  async cancel(): Promise<void> {
    // No-op: authorize() only reads the balance, nothing was reserved.
  }
}
