import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { config } from "@/lib/config";
import { currentDateKey, dateKeyToUtcDate, isSameDateKey } from "@/lib/date";

export interface SlotRow {
  id: string;
  label: string;
  position: number;
  currentPriceCents: number;
  currentAdId: string | null;
  lastResetDate: Date;
  createdAt: Date;
}

export async function lockSlotForUpdate(
  tx: Prisma.TransactionClient,
  slotId: string
): Promise<SlotRow | null> {
  const rows = await tx.$queryRaw<SlotRow[]>`
    SELECT * FROM "Slot" WHERE "id" = ${slotId} FOR UPDATE
  `;
  return rows[0] ?? null;
}

/**
 * Resets a slot's price/current ad back to the daily starting state if its
 * `lastResetDate` is not today (in the configured timezone). Idempotent:
 * calling it on an already-fresh slot is a no-op. Must be called with the
 * slot row already locked (`FOR UPDATE`) by the caller's transaction.
 */
export async function resetSlotIfStale(
  tx: Prisma.TransactionClient,
  slot: SlotRow,
  todayKey: string = currentDateKey()
): Promise<SlotRow> {
  if (isSameDateKey(slot.lastResetDate, todayKey)) return slot;

  return tx.slot.update({
    where: { id: slot.id },
    data: {
      currentPriceCents: config.slotStartPriceCents,
      currentAdId: null,
      lastResetDate: dateKeyToUtcDate(todayKey),
    },
  });
}

/**
 * Catch-up reset: walks every slot and resets it if it is stale. Safe to
 * call from a cron job at midnight AND opportunistically on request (e.g.
 * the first `GET /api/slots` of the day), since resetSlotIfStale is
 * idempotent and each slot is reset in its own short transaction.
 */
export async function resetAllStaleSlots(): Promise<number> {
  const todayKey = currentDateKey();
  const slots = await prisma.slot.findMany({ select: { id: true } });

  let resetCount = 0;
  for (const { id } of slots) {
    const wasReset = await prisma.$transaction(async (tx) => {
      const slot = await lockSlotForUpdate(tx, id);
      if (!slot || isSameDateKey(slot.lastResetDate, todayKey)) return false;
      await resetSlotIfStale(tx, slot, todayKey);
      return true;
    });
    if (wasReset) resetCount += 1;
  }
  return resetCount;
}

export async function listSlotsWithCurrentAd() {
  await resetAllStaleSlots();

  return prisma.slot.findMany({
    orderBy: { position: "asc" },
    include: {
      currentAd: {
        include: { user: { select: { id: true, email: true } } },
      },
    },
  });
}

export async function getSlotHistory(slotId: string) {
  const [slot, ads, dailyStats, allTimeRecord] = await Promise.all([
    prisma.slot.findUnique({ where: { id: slotId } }),
    prisma.ad.findMany({
      where: { slotId, isHidden: false },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { id: true, email: true } } },
    }),
    prisma.slotDailyStat.findUnique({
      where: { slotId_date: { slotId, date: dateKeyToUtcDate(currentDateKey()) } },
    }),
    prisma.slotDailyStat.aggregate({
      where: { slotId },
      _max: { maxPriceCents: true },
    }),
  ]);

  return {
    slot,
    ads,
    today: dailyStats,
    allTimeRecordCents: allTimeRecord._max.maxPriceCents ?? 0,
  };
}
