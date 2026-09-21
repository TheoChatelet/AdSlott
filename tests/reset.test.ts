import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetAllStaleSlots } from "@/lib/slots";
import { config } from "@/lib/config";
import { dateKeyToUtcDate } from "@/lib/date";
import { createTestSlot, resetDatabase } from "./helpers/db";

function yesterdayKey(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

describe("resetAllStaleSlots", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("resets a slot whose lastResetDate is in the past", async () => {
    const slot = await createTestSlot({
      currentPriceCents: 999,
      lastResetDate: dateKeyToUtcDate(yesterdayKey()),
    });

    const resetCount = await resetAllStaleSlots();
    expect(resetCount).toBe(1);

    const updated = await prisma.slot.findUniqueOrThrow({ where: { id: slot.id } });
    expect(updated.currentPriceCents).toBe(config.slotStartPriceCents);
    expect(updated.currentAdId).toBeNull();
  });

  it("is idempotent: a second run resets nothing more", async () => {
    await createTestSlot({ currentPriceCents: 999, lastResetDate: dateKeyToUtcDate(yesterdayKey()) });

    const first = await resetAllStaleSlots();
    const second = await resetAllStaleSlots();

    expect(first).toBe(1);
    expect(second).toBe(0);
  });

  it("does not touch a slot already reset today", async () => {
    const slot = await createTestSlot({ currentPriceCents: 500 });

    const resetCount = await resetAllStaleSlots();

    expect(resetCount).toBe(0);
    const unchanged = await prisma.slot.findUniqueOrThrow({ where: { id: slot.id } });
    expect(unchanged.currentPriceCents).toBe(500);
  });
});
