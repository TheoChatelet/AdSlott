import { prisma } from "@/lib/prisma";
import { currentDateKey, dateKeyToUtcDate } from "@/lib/date";

export const DEFAULT_TEST_WALLET_CENTS = 10_000;

export async function resetDatabase() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "PollVote", "WalletTransaction", "Ad", "SlotDailyStat", "DailyContent", "Slot", "User" RESTART IDENTITY CASCADE`
  );
}

let userCounter = 0;

export async function createTestUser(
  overrides: Partial<{ email: string; walletBalanceCents: number; isAdmin: boolean }> = {}
) {
  userCounter += 1;
  return prisma.user.create({
    data: {
      email: overrides.email ?? `user-${userCounter}-${Date.now()}@test.local`,
      passwordHash: "not-a-real-hash",
      walletBalanceCents: overrides.walletBalanceCents ?? DEFAULT_TEST_WALLET_CENTS,
      isAdmin: overrides.isAdmin ?? false,
    },
  });
}

let slotCounter = 0;

export async function createTestSlot(
  overrides: Partial<{
    position: number;
    label: string;
    currentPriceCents: number;
    lastResetDate: Date;
  }> = {}
) {
  slotCounter += 1;
  return prisma.slot.create({
    data: {
      position: overrides.position ?? 1000 + slotCounter,
      label: overrides.label ?? `Test slot ${slotCounter}`,
      currentPriceCents: overrides.currentPriceCents ?? 100,
      lastResetDate: overrides.lastResetDate ?? dateKeyToUtcDate(currentDateKey()),
    },
  });
}
