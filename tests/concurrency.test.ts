import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { placeBid, BidTooLowError } from "@/lib/bidding";
import { DEFAULT_TEST_WALLET_CENTS, createTestSlot, createTestUser, resetDatabase } from "./helpers/db";

describe("concurrent bids on the same slot", () => {
  it("lets exactly one of N simultaneous equal bids win, and never debits the losers", async () => {
    await resetDatabase();

    const slot = await createTestSlot({ currentPriceCents: 100 });
    const bidderCount = 10;
    const users = await Promise.all(
      Array.from({ length: bidderCount }, (_, i) => createTestUser({ email: `bidder-${i}@test.local` }))
    );

    const results = await Promise.allSettled(
      users.map((user) =>
        placeBid({ slotId: slot.id, userId: user.id, amountCents: 200, text: `Offre de ${user.email}` })
      )
    );

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(bidderCount - 1);
    for (const r of rejected as PromiseRejectedResult[]) {
      expect(r.reason).toBeInstanceOf(BidTooLowError);
    }

    const finalSlot = await prisma.slot.findUniqueOrThrow({ where: { id: slot.id } });
    expect(finalSlot.currentPriceCents).toBe(200);

    const winnerId = (fulfilled[0] as PromiseFulfilledResult<Awaited<ReturnType<typeof placeBid>>>).value.ad.userId;
    const balances = await prisma.user.findMany({ where: { id: { in: users.map((u) => u.id) } } });

    for (const balance of balances) {
      if (balance.id === winnerId) {
        expect(balance.walletBalanceCents).toBe(DEFAULT_TEST_WALLET_CENTS - 200);
      } else {
        expect(balance.walletBalanceCents).toBe(DEFAULT_TEST_WALLET_CENTS);
      }
    }

    const stat = await prisma.slotDailyStat.findFirstOrThrow({ where: { slotId: slot.id } });
    expect(stat.bidCount).toBe(1);
    expect(stat.revenueCents).toBe(200);
  }, 30000);
});
