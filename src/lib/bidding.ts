import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { config } from "@/lib/config";
import { currentDateKey, dateKeyToUtcDate } from "@/lib/date";
import { lockSlotForUpdate, resetSlotIfStale } from "@/lib/slots";
import { paymentProvider } from "@/lib/payment";

export class BidError extends Error {}
export class SlotNotFoundError extends BidError {}
export class BidTooLowError extends BidError {
  constructor(public readonly minimumCents: number) {
    super(`L'offre doit être d'au moins ${minimumCents} centimes`);
  }
}

export const bidInputSchema = z.object({
  slotId: z.string().min(1),
  amountCents: z.number().int().positive(),
  text: z.string().trim().min(1, "Le texte de l'annonce est requis").max(280, "Texte trop long (280 caractères max)"),
  link: z.union([z.string().trim().url("Lien invalide").max(500), z.literal("")]).optional(),
  imageUrl: z.union([z.string().trim().url("URL d'image invalide").max(500), z.literal("")]).optional(),
});

export type BidInput = z.infer<typeof bidInputSchema>;

/** Strips any HTML tags; ad content is rendered as plain text, never raw HTML. */
export function sanitizeAdText(text: string): string {
  return text.replace(/<[^>]*>/g, "").trim();
}

export interface PlaceBidParams {
  slotId: string;
  userId: string;
  amountCents: number;
  text: string;
  link?: string;
  imageUrl?: string;
}

export async function placeBid(input: PlaceBidParams) {
  const authorization = await paymentProvider.authorize(input.userId, input.amountCents);

  try {
    return await prisma.$transaction(async (tx) => {
      const todayKey = currentDateKey();

      let slot = await lockSlotForUpdate(tx, input.slotId);
      if (!slot) throw new SlotNotFoundError("Slot introuvable");

      slot = await resetSlotIfStale(tx, slot, todayKey);

      const minimumCents = slot.currentPriceCents + config.minBidIncrementCents;
      if (input.amountCents < minimumCents) {
        throw new BidTooLowError(minimumCents);
      }

      const ad = await tx.ad.create({
        data: {
          slotId: slot.id,
          userId: input.userId,
          priceCents: input.amountCents,
          text: sanitizeAdText(input.text),
          link: input.link || null,
          imageUrl: input.imageUrl || null,
        },
      });

      await paymentProvider.capture(authorization, tx, { adId: ad.id });

      const updatedSlot = await tx.slot.update({
        where: { id: slot.id },
        data: { currentPriceCents: input.amountCents, currentAdId: ad.id },
      });

      // Each accepted bid this day is strictly higher than the previous
      // one (enforced above), so the running max for the day is always the
      // current bid amount.
      const date = dateKeyToUtcDate(todayKey);
      await tx.slotDailyStat.upsert({
        where: { slotId_date: { slotId: slot.id, date } },
        create: {
          slotId: slot.id,
          date,
          maxPriceCents: input.amountCents,
          bidCount: 1,
          revenueCents: input.amountCents,
        },
        update: {
          maxPriceCents: input.amountCents,
          bidCount: { increment: 1 },
          revenueCents: { increment: input.amountCents },
        },
      });

      return { ad, slot: updatedSlot };
    });
  } catch (err) {
    await paymentProvider.cancel(authorization);
    throw err;
  }
}
