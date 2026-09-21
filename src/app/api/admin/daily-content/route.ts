import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { assertSameOrigin, CsrfError } from "@/lib/csrf";
import { currentDateKey, dateKeyToUtcDate } from "@/lib/date";

const bodySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("CHALLENGE"),
    question: z.string().trim().min(1).max(500),
  }),
  z.object({
    type: z.literal("POLL"),
    question: z.string().trim().min(1).max(500),
    options: z.array(z.string().trim().min(1).max(100)).min(2).max(8),
  }),
]);

export async function GET() {
  try {
    await requireAdmin();
    const today = dateKeyToUtcDate(currentDateKey());
    const content = await prisma.dailyContent.findUnique({ where: { date: today } });
    return NextResponse.json({ content });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 403 });
    console.error(err);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireAdmin();

    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Requête invalide" }, { status: 400 });
    }

    const today = dateKeyToUtcDate(currentDateKey());
    const content = await prisma.dailyContent.upsert({
      where: { date: today },
      create: {
        date: today,
        type: parsed.data.type,
        question: parsed.data.question,
        options: parsed.data.type === "POLL" ? parsed.data.options : undefined,
      },
      update: {
        type: parsed.data.type,
        question: parsed.data.question,
        options: parsed.data.type === "POLL" ? parsed.data.options : Prisma.JsonNull,
      },
    });

    return NextResponse.json({ content });
  } catch (err) {
    if (err instanceof CsrfError) return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 403 });
    console.error(err);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
