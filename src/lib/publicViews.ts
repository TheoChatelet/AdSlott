import { prisma } from "@/lib/prisma";
import { listSlotsWithCurrentAd } from "@/lib/slots";
import { currentDateKey, dateKeyToUtcDate } from "@/lib/date";

export async function getPublicSlots() {
  const slots = await listSlotsWithCurrentAd();
  return slots.map((slot) => ({
    id: slot.id,
    label: slot.label,
    position: slot.position,
    currentPriceCents: slot.currentPriceCents,
    currentAd:
      slot.currentAd && !slot.currentAd.isHidden
        ? {
            id: slot.currentAd.id,
            text: slot.currentAd.text,
            link: slot.currentAd.link,
            imageUrl: slot.currentAd.imageUrl,
            priceCents: slot.currentAd.priceCents,
            createdAt: slot.currentAd.createdAt.toISOString(),
            advertiser: slot.currentAd.user.email,
          }
        : null,
  }));
}

export type PublicSlot = Awaited<ReturnType<typeof getPublicSlots>>[number];

export async function getPublicActivity() {
  const ads = await prisma.ad.findMany({
    where: { isHidden: false },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      user: { select: { email: true } },
      slot: { select: { id: true, label: true } },
    },
  });

  return ads.map((ad) => ({
    id: ad.id,
    slotId: ad.slot.id,
    slotLabel: ad.slot.label,
    advertiser: ad.user.email,
    priceCents: ad.priceCents,
    createdAt: ad.createdAt.toISOString(),
  }));
}

export type PublicActivityEntry = Awaited<ReturnType<typeof getPublicActivity>>[number];

export async function getPublicDailyContent(userId: string | null) {
  const today = dateKeyToUtcDate(currentDateKey());
  const content = await prisma.dailyContent.findUnique({ where: { date: today } });
  if (!content) return null;

  let myVote: number | null = null;
  let results: number[] | null = null;

  if (content.type === "POLL") {
    if (userId) {
      const vote = await prisma.pollVote.findUnique({
        where: { dailyContentId_userId: { dailyContentId: content.id, userId } },
      });
      myVote = vote?.optionIndex ?? null;
    }

    const options = (content.options as string[]) ?? [];
    const votes = await prisma.pollVote.groupBy({
      by: ["optionIndex"],
      where: { dailyContentId: content.id },
      _count: true,
    });
    results = options.map((_, index) => votes.find((v) => v.optionIndex === index)?._count ?? 0);
  }

  return {
    id: content.id,
    type: content.type,
    question: content.question,
    options: content.options as string[] | null,
    myVote,
    results,
  };
}

export type PublicDailyContent = Awaited<ReturnType<typeof getPublicDailyContent>>;
