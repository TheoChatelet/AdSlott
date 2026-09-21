import { NextResponse } from "next/server";
import { getSlotHistory } from "@/lib/slots";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { slot, ads, today, allTimeRecordCents } = await getSlotHistory(id);

  if (!slot) {
    return NextResponse.json({ error: "Slot introuvable" }, { status: 404 });
  }

  return NextResponse.json({
    slot: {
      id: slot.id,
      label: slot.label,
      position: slot.position,
      currentPriceCents: slot.currentPriceCents,
    },
    today: {
      maxPriceCents: today?.maxPriceCents ?? 0,
      bidCount: today?.bidCount ?? 0,
      revenueCents: today?.revenueCents ?? 0,
    },
    allTimeRecordCents,
    history: ads.map((ad) => ({
      id: ad.id,
      text: ad.text,
      priceCents: ad.priceCents,
      createdAt: ad.createdAt,
      advertiser: ad.user.email,
    })),
  });
}
