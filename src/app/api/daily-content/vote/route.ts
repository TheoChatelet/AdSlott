import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth";
import { assertSameOrigin, CsrfError } from "@/lib/csrf";
import { currentDateKey, dateKeyToUtcDate } from "@/lib/date";

const voteSchema = z.object({ optionIndex: z.number().int().min(0) });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();

    const body = await request.json().catch(() => null);
    const parsed = voteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
    }

    const today = dateKeyToUtcDate(currentDateKey());
    const content = await prisma.dailyContent.findUnique({ where: { date: today } });
    if (!content || content.type !== "POLL") {
      return NextResponse.json({ error: "Aucun sondage aujourd'hui" }, { status: 404 });
    }

    const options = (content.options as string[]) ?? [];
    if (parsed.data.optionIndex >= options.length) {
      return NextResponse.json({ error: "Option invalide" }, { status: 400 });
    }

    await prisma.pollVote.upsert({
      where: { dailyContentId_userId: { dailyContentId: content.id, userId: user.id } },
      create: { dailyContentId: content.id, userId: user.id, optionIndex: parsed.data.optionIndex },
      update: { optionIndex: parsed.data.optionIndex },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof CsrfError) return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    console.error(err);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
