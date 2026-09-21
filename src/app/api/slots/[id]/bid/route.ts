import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, AuthError } from "@/lib/auth";
import { BidError, BidTooLowError, SlotNotFoundError, bidInputSchema, placeBid } from "@/lib/bidding";
import { InsufficientFundsError } from "@/lib/payment";
import { assertSameOrigin, CsrfError } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();

    const { allowed, retryAfterMs } = checkRateLimit(`bid:${user.id}`, { limit: 5, windowMs: 10_000 });
    if (!allowed) {
      return NextResponse.json(
        { error: "Trop d'enchères, ralentissez" },
        { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
      );
    }

    const { id: slotId } = await params;
    const body = await request.json().catch(() => null);

    const parsed = bidInputSchema.safeParse({ ...body, slotId });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Requête invalide" }, { status: 400 });
    }

    const result = await placeBid({
      slotId: parsed.data.slotId,
      userId: user.id,
      amountCents: parsed.data.amountCents,
      text: parsed.data.text,
      link: parsed.data.link,
      imageUrl: parsed.data.imageUrl,
    });

    return NextResponse.json({
      slot: {
        id: result.slot.id,
        currentPriceCents: result.slot.currentPriceCents,
      },
      ad: {
        id: result.ad.id,
        text: result.ad.text,
        priceCents: result.ad.priceCents,
      },
    });
  } catch (err) {
    if (err instanceof CsrfError) return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Requête invalide" }, { status: 400 });
    }
    if (err instanceof SlotNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    if (err instanceof BidTooLowError) {
      return NextResponse.json({ error: err.message, minimumCents: err.minimumCents }, { status: 409 });
    }
    if (err instanceof InsufficientFundsError) {
      return NextResponse.json({ error: err.message }, { status: 402 });
    }
    if (err instanceof BidError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
