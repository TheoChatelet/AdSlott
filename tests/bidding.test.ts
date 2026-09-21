import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { placeBid, BidTooLowError, SlotNotFoundError } from "@/lib/bidding";
import { InsufficientFundsError } from "@/lib/payment";
import { DEFAULT_TEST_WALLET_CENTS, createTestSlot, createTestUser, resetDatabase } from "./helpers/db";

describe("placeBid", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("accepts a bid above the current price plus the minimum increment", async () => {
    const user = await createTestUser();
    const slot = await createTestSlot({ currentPriceCents: 100 });

    const result = await placeBid({
      slotId: slot.id,
      userId: user.id,
      amountCents: 150,
      text: "Mon annonce",
    });

    expect(result.slot.currentPriceCents).toBe(150);
    expect(result.slot.currentAdId).toBe(result.ad.id);

    const updatedUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updatedUser.walletBalanceCents).toBe(DEFAULT_TEST_WALLET_CENTS - 150);
  });

  it("rejects a bid below current price + minimum increment, without touching the wallet", async () => {
    const user = await createTestUser();
    const slot = await createTestSlot({ currentPriceCents: 100 });

    await expect(
      placeBid({ slotId: slot.id, userId: user.id, amountCents: 120, text: "Trop bas" })
    ).rejects.toBeInstanceOf(BidTooLowError);

    const unchanged = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(unchanged.walletBalanceCents).toBe(DEFAULT_TEST_WALLET_CENTS);

    const slotAfter = await prisma.slot.findUniqueOrThrow({ where: { id: slot.id } });
    expect(slotAfter.currentPriceCents).toBe(100);
    expect(slotAfter.currentAdId).toBeNull();
  });

  it("rejects a bid the user cannot afford and does not debit the wallet", async () => {
    const user = await createTestUser({ walletBalanceCents: 100 });
    const slot = await createTestSlot({ currentPriceCents: 100 });

    await expect(
      placeBid({ slotId: slot.id, userId: user.id, amountCents: 200, text: "Trop cher" })
    ).rejects.toBeInstanceOf(InsufficientFundsError);

    const unchanged = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(unchanged.walletBalanceCents).toBe(100);
  });

  it("rejects a bid on an unknown slot", async () => {
    const user = await createTestUser();
    await expect(
      placeBid({ slotId: "does-not-exist", userId: user.id, amountCents: 200, text: "?" })
    ).rejects.toBeInstanceOf(SlotNotFoundError);
  });

  it("replaces the previous ad immediately and never refunds the outbid user", async () => {
    const alice = await createTestUser();
    const bob = await createTestUser();
    const slot = await createTestSlot({ currentPriceCents: 100 });

    await placeBid({ slotId: slot.id, userId: alice.id, amountCents: 150, text: "Alice" });
    const result = await placeBid({ slotId: slot.id, userId: bob.id, amountCents: 250, text: "Bob" });

    expect(result.slot.currentAdId).toBe(result.ad.id);
    expect(result.ad.userId).toBe(bob.id);
    expect(result.ad.text).toBe("Bob");

    const aliceAfter = await prisma.user.findUniqueOrThrow({ where: { id: alice.id } });
    expect(aliceAfter.walletBalanceCents).toBe(DEFAULT_TEST_WALLET_CENTS - 150);
  });

  it("accumulates the daily stats (max price, bid count, revenue)", async () => {
    const user = await createTestUser({ walletBalanceCents: 100_000 });
    const slot = await createTestSlot({ currentPriceCents: 100 });

    await placeBid({ slotId: slot.id, userId: user.id, amountCents: 150, text: "1" });
    await placeBid({ slotId: slot.id, userId: user.id, amountCents: 250, text: "2" });

    const stat = await prisma.slotDailyStat.findFirstOrThrow({ where: { slotId: slot.id } });
    expect(stat.bidCount).toBe(2);
    expect(stat.maxPriceCents).toBe(250);
    expect(stat.revenueCents).toBe(400);
  });

  it("strips HTML tags from the ad text", async () => {
    const user = await createTestUser();
    const slot = await createTestSlot({ currentPriceCents: 100 });

    const result = await placeBid({
      slotId: slot.id,
      userId: user.id,
      amountCents: 150,
      text: "<script>alert(1)</script>Bonjour",
    });

    expect(result.ad.text).toBe("alert(1)Bonjour");
    expect(result.ad.text).not.toContain("<script>");
  });
});
