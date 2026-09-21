import { prisma } from "@/lib/prisma";
import { listSlotsWithCurrentAd } from "@/lib/slots";
import { currentDateKey, dateKeyToUtcDate } from "@/lib/date";

export async function getAdminSlotsOverview() {
  const [slots, todayStats, allTimeRecords] = await Promise.all([
    listSlotsWithCurrentAd(),
    prisma.slotDailyStat.findMany({ where: { date: dateKeyToUtcDate(currentDateKey()) } }),
    prisma.slotDailyStat.groupBy({ by: ["slotId"], _max: { maxPriceCents: true } }),
  ]);

  const todayBySlot = new Map(todayStats.map((s) => [s.slotId, s]));
  const recordBySlot = new Map(allTimeRecords.map((r) => [r.slotId, r._max.maxPriceCents ?? 0]));

  return slots.map((slot) => ({
    id: slot.id,
    label: slot.label,
    position: slot.position,
    currentPriceCents: slot.currentPriceCents,
    currentAd: slot.currentAd
      ? {
          id: slot.currentAd.id,
          text: slot.currentAd.text,
          isHidden: slot.currentAd.isHidden,
          advertiser: slot.currentAd.user.email,
        }
      : null,
    today: {
      bidCount: todayBySlot.get(slot.id)?.bidCount ?? 0,
      revenueCents: todayBySlot.get(slot.id)?.revenueCents ?? 0,
      maxPriceCents: todayBySlot.get(slot.id)?.maxPriceCents ?? 0,
    },
    allTimeRecordCents: recordBySlot.get(slot.id) ?? 0,
  }));
}

export type AdminSlotOverview = Awaited<ReturnType<typeof getAdminSlotsOverview>>[number];
